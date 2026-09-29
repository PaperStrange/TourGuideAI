# 契约 · Geo 管线（投影 / `worldGrid` / `valueKind` / 格定义）

> **性质：下游契约，不是设计决策。** 父文档是 [`design-core.md`](design-core.md)（§8.1 决断、§8.2.1 四线调研与 2026-09-30 实测修正）；实现级常量见 [`appendix-visual-and-ui-spec.md`](appendix-visual-and-ui-spec.md)（§1.1 网格/比例/投影、§1.3 图层栈）。
> **唯一权威实现**：[`world-grid.mjs`](../../docs/handOff/dsh-bundle-tourguide-2.5d/tools/world-grid.mjs)。本文每一条都有对应机械断言（A1–A15，含 A8b/A8c/A9b，共 **18 项**），判定命令：
> ```bash
> node docs/handOff/dsh-bundle-tourguide-2.5d/tools/world-grid.mjs
> ```
> **作者**：`city-data-architect`（共享任务 `task-1` 冻结五条；`task-8` 修正 `wTiles` 并解掉 GAP-1）。
> **状态**：五条**已冻结**，**投影原点已冻结**（S1b，2026-09-30）。可以烘焙真实几何了。

---

## 0. 这份契约对谁生效

| 消费者 | 依赖哪条 | 拿错的第一个症状 |
|---|---|---|
| 渲染 / 关卡 | 条款 1、2、3、5 | 道具浮在墙外、碰撞盒与地面错位、门永远进不去 |
| 内容（12 扇门 / 招牌 / 攻略） | 条款 1、2、3、4 | 距离与时间对不上；"已验证"栏给抽象值背书 |
| 验证守门人 | 全部 | 无法区分"数据变了"与"浮点序列化漂了"；溯源无从核起 |

**顺序决定成本**：投影错一次，12 个室内、全部招牌位置、全部碰撞盒都要返工。所以下面每个数都是**字面量**，不是"以后可以调的 config"。

---

## 1. 条款一 · 投影 = 以段起点为原点的局部等距圆柱

**冻结内容**（`PROJECTION`）：

```
kind                = 'local-tangent-equirectangular'
metresPerDegreeLon  = 91282.15
metresPerDegreeLat  = 110940.65
coefficientLatitudeDeg = 35.0055
x_m = (λ − λ₀) · 91282.15
y_m = (φ − φ₀) · 110940.65
```

`coefficientLatitudeDeg` 是**系数求值纬度**，不是原点纬度，**不得"改正"成原点的 35.003658**。A5 实测这个选择：±0.0018° 纬度差在走廊远端只值 **35.04 mm**（界 100 mm）。

**为什么是这个数**：这两个系数就是 WGS84 椭球在 35.0055°N 处的每度经/纬米数。断言 A4 用两条独立路径核对——精确闭式 `(π/180)·N(φ)·cos φ`（N 为卯酉圈曲率半径）与常用的截断级数（两者互相吻合到 0.032 m/度，所以任一条都可以当另一条的对照）——实测**冻结值与闭式相差 0.0891 m/度**，折算到整条走廊是 **1.562 mm**（纬向 0.009 mm），**比 1 m 的验收线宽约 640 倍**。切平面相对椭球的下垂（sagitta）实测 **0.2009 m**，同样 < 1 m。

**EPSG:3857 被禁止，理由是数**：`cos(35.0055°) = 0.8190969811`，所以 1 个真实地面米 = `1/cos = 1.2208566544` 个"3857 米"。断言 A6 实测：

- 整条 1.6 km 走廊在 3857 里需要 **1,953.4 格**，而 `wTiles = 1600` → **353.4 格溢出 = 整个栅格的 22.1%**；
- 一条 **3.5 m 车道变成 4.273 格**（+0.773 格 = **+22.09%**）。

**反例**：有人用 `proj4('EPSG:4326','EPSG:3857')` 换掉投影，理由是"3857 就是米、而且是标准"。因为栅格化器对越窗要素**拒绝而不夹紧**（条款三），1,953.4 格中最后 **353.4 格（走廊东端约 353 m）整段不会出现在地面栅格里**——不是画歪，是**没有**。同一段路在攻略里报成 4 分钟，在 3857 下变成 **4.9 分钟**。

**谁会发现**：先是渲染 / 关卡（碰撞盒与地面互相错位、道具浮空）；再是内容（`1.2 格·s⁻¹` 推出的步行时间与实测对不上）；如果漏到攻略，就是站在四条通上的读者。**注意这个错误在整条走廊上是常数**：`1/cos φ` 在 ±20 m 纬度带内的变化是 **2.7×10⁻⁶**，所以逐个街区的目视检查只会说"嗯，好像略宽"，永远抓不到它。A6 会在 CI 里先喊。

### 1b. 投影原点 —— 已冻结（S1b，解掉 GAP-1）

```js
ORIGIN = { status: 'frozen', lonUdeg: 135759719, latUdeg: 35003658 }
// OSM way 465069436 node#3, highway=primary；四条烏丸【东南 18.87 m】= 东 3.56 m + 南 18.53 m
// NB: 18.9 m 是 DISTANCE，不是东向偏移。写成"以东 18.9 m"会让人期望 lonUdeg ≈ 135759887，
//     从而误判冻结值 135759719 错了 168 µ度（15.3 m）。Lead 已在 design-core 与本站更正。
```

这是**实测的镜像，不是选择**：`iteration/tools/freeze-origin.mjs` 推出来，`docs/handOff/archive/corpora/geo-japan/kyoto-slice-origin-candidate.json` 记下来，**A13 逐字段断言常量等于该文件**（并断言 µ度取整是"最近"而不是"截断"）。

#### ⚠️ 两条被推翻的规则（必须保留，否则原点会静默西移 ~1 km）

| # | 规则 | 结果 | 为什么错 |
|---|---|---|---|
| ① | **bbox 最西点** | 返回 `錦小路通` | 走廊 bbox 里 x_m 最小的点可能属于**任何横街**。返回的是一条住宅街，根本不是四条通 |
| ② | **路名最西点** | 返回松尾大社那一头 | **`四条通` 就是市道186号 嵐山祇園線**，起点在松尾大社，比四条烏丸再往西约 **1.0 km**。这条规则把原点甩出了声明的切片 |

**成立的规则是"路面在切片内"**：`四条通` 几何中**位于四条烏丸（声明的西锚点）以东**的最西点。关键在于 **slice 夹取**——**删掉这个约束就等于恢复规则 ②**。A13 断言这份测量记录里的两条被推翻规则**仍然存在**（`corrections.length === 2` 且分别含 `錦小路通` / `松尾大社`），所以想"简化"它必须先删掉一条有名字的断言。本地知识（L2）与 OSM way 边界（`678103923` 的东端正好落在四条烏丸）都支持这个锚点。

#### 东端与那 92 m 缺口

`四条通` 的几何**止于** `lonUdeg 135777193 / latUdeg 35003749`。这是**真实边界**，不是走廊的名义端点：

| 量 | 值（A14 实测） |
|---|---|
| 实测跨度（原点 → 路几何终点） | **1,595.05 m** |
| 冻结 `wTiles = 1600` → 余量 | **4.95 m** |
| 走廊东界（原点 + 1600 m） | `135777247` µ度 |
| 路几何终点到走廊东界 | **4.93 m** |
| 路几何终点 → 祇園交差点（参考 `135778200` µ度，约值 ±4.56 m） | **91.92 m** |
| 独立复算：把 `EAST_END` 对 `ORIGIN` 投影 | **x_m = 1595.064 m**（复现测量记录 ✅） |

> **符号约定（两处必须一致，否则会看起来"互相矛盾"）**：契约说**余量 +4.95 m** = `wTiles − span`；测量记录 `kyoto-slice-origin-candidate.json` 里写的是 **`marginM = span − wTiles = −4.95`**，即**定义相反、绝对值相同**。A14 同时断言记录里的 `wTiles` 等于冻结值、且 `marginM` 等于我们余量的相反数——所以两者不可能各自漂移。看到 −4.95 不要以为切片缺了 4.95 m，**是"走廊比路长 4.95 m"**。

A14 把上面每一条都变成断言，包括"**缺口 > 10 m**"——如果谁"顺手"把路延伸到祇園交差点，这条会塌向 0 并立刻失败。**祇園交差点是"约在 135.7782"的近似参考点**（design-core 原文），因此它带 ±50 µ度 = ±4.56 m 的显式余量；它**不是** `observed` 事实、**不是**事实层的行，`valueKind` 对它不适用。

---

## 2. 条款二 · `worldGrid` 常量写死

**冻结内容**：

```js
worldGrid = { wTiles: 1600, hTiles: 40, blockSize: 40 }   // 深冻结，改写抛错（A1）
```

> **S1b 修正**：`wTiles` 原为 **2000**——那是**未经测量的估算值**。沿 `四条通` 逐 way 实测后是 **1,595.05 m**，故取 **1600**（≥ 实测跨度，且 `1600 / 16 = 100` 可被 16 块整除）。A8 的夹具哈希因此从 `D5732ED6…` 变为 `7059980F…`——**哈希变了 = 实质变了**，正是它该有的行为。

派生量（`GRID`，同样冻结，且 A2 断言它们必须从 `worldGrid` 算出来，手改会被抓）：

| 量 | 值 | 来源 |
|---|---|---|
| 走廊 | **1,600 m × 40 m** | `wTiles · 1 m` / `hTiles · 1 m` |
| 格数 | **64,000** | 1600 × 40 |
| **手作街区** | **40 个并排 × 1 个深**（每个 40×40 格 = 1,600 格） | 1600/40 = 40，40/40 = 1 |
| **地面纹理块** | **16 块，每块 100 × 40 格 = 3,200 × 1,280 px** | design-core §8.2.1 ①；上限 4096² px，放得下 ✅ |
| 地面层总像素 | **51,200 × 1,280 px = 65.536 Mpx** | A2 实测 |
| 索引色内存 | **62.5 MiB**（RGBA 会是 **250 MiB**） | A2 实测 |

**三个"格/块"词在这里共存，它们不可互换**——这正是此前被混用的地方：

- **tile（格）** = 1 m 地面 → **64,000** 个
- **block（街区）** = 手作的 40×40 单位 → 沿街 **40** 个
- **chunk（纹理块）** = 地面层的一张纹理 → **16** 个，各 100 格 / 3,200 px

**"1 格 = 1 m" 与 "40×40 格 = 一个街区" 是两个不同的量**。1.6 km 走廊 = **64,000 格 = 40 个街区并排**，不是一张 1280×1280 的 tilemap（1280×1280 是**单个 40 m 街区**的像素尺寸）。**MiB 也不是 MB**：65,536,000 B 是 65.54 MB，但 **62.5 MiB**；分配纹理要用 MiB 那个数。

**反例 A（单位混用）**：有人把 `blockSize: 40` 读成"世界就是 40 格"，做出一张 1280×1280 px 的地面层。那是 40×40 = **1,600 格 = 全部世界的 1/40**；1.6 km 步行被截成 40 m。**谁会发现**：玩家，30 秒内；在那之前是行程校验器——12 扇门要落在 1.6 km 上，而一个街区只有 26 个店面模块、12 个可进入（46%），物理上塞不进 40 m。

**反例 B（像素量级）**：有人按"1280×1280"申请地面层纹理，实际需要 51,200×1,280 px。**40 倍欠分配**，做到第 40 个街区时炸掉。

**反例 C（分块与上限）**：有人把 51,200 px 宽当成一张纹理。常见桌面 GPU 上限 16,384 px，**成不了一张**；而即便按附录 §1.3 的 4096 px 读，也超过 12 倍。正解是 design-core §8.2.1 ① 的 **16 块 × 3,200 × 1,280 px**，A2 断言"16 块恰好铺满走廊且每块 ≤ 4096²"。**已知浪费**：纹理纵向利用率仅 **31.3%**（4096 高只用 1,280），第一版接受。

---

## 3. 条款三 · 格定义 = 坐标定义，不是缩放选项

**冻结内容**：

```
tileX = floor(x_m)        tileY = floor(y_m)
```

"1 格 = 1 m" 是**坐标定义**。窗口是**半开**的：

```
tileX ∈ [0, 1600)         row = tileY + 20 ∈ [0, 40)      // y_m ∈ [−20, +20)
```

街心线是 `tileY = 0`，所以走廊跨 `tileY ∈ [−20, +20)`，存储单元 `cellY = row = floor(y_m) + 20 ∈ [0, 40)`。**这个偏移是存储细节，不是坐标定义的一部分**；`row` 与 `cellY` 是**同一个量**，不是两套坐标。

**规范化坐标是整数 1/16 子格，不是浮点**：`tileFromSub(sub) = floor(sub/16)`。浮点的 `floor(x_m)` 只作为**参考判据**存在（`referenceTileFromMetres`）——A3 在 1,134 个采样点（含两符号的近边界区，这是关键：粗扫永远扫不到那里，断言会**空洞地通过**）上实测出 **315 处分歧，最远 0.031250 m**，即分歧**恰好只发生在距格边界 1/32 m 以内**，且**规定分歧时以整数子格为准**。窗口判定跑在规范化坐标上，于是每条边的**有效内缩**是精确的两个数（A11 实测）：

| 现象 | 精确值 |
|---|---|
| 最外侧**可表示**的规范化位置 | 1,599.9375 m（内缩 **62.50 mm**） |
| **拒绝阈值**（超过即拒） | 1,599.96875 m（内缩 **31.25 mm**） |
| 实测（相对原点的整数微度） | 输入 17,527 µ度 = 1,599.902 m **收**；17,528 µ度 = 1,599.994 m **拒** |
| 实测（子格） | sub 25,599 **收**；sub 25,600 **拒** |

越窗要素的行为由 Lead 裁定（GAP-10，2026-09-30，基于实测数字）：

| 几何 | 行为 |
|---|---|
| **完全在窗外**（没有任何顶点进入窗口） | **拒绝**（原条款三的"拒绝、不夹紧"**仍然成立**） |
| **跨越窗口**（部分顶点在内） | **裁剪**到窗口，保留真实交集 |

**夹紧（clamping）仍然被禁止，且与裁剪是两个操作**：夹紧把顶点搬到边界上、**伪造**了几何；裁剪算的是**真实交集**，什么也没编造。

**并且**：裁剪到 40 m 深的窗口**本身不够**——真实脚印深达 p95 +113.8 m，把一个跨界脚印裁到窗口会得到一块**横贯整个断面的 40 m 厚板**，它填满走廊、把街道埋掉（这是 S8 实测出来的）。所以发射器还要把结果与**立面进深带**相交：从**立面**朝街区内部量 `FACADE_DEPTH_M`，默认 = `worldGrid.blockSize` = **40 m**。取 40 是因为"每个立面朝内一个街区的深度"是设计自己的单位，不是这里发明的数；它**派生**自冻结的 `blockSize`，**不是**新的冻结字面量（若要冻结，见 GAP-13）。

**注意这条修正改变了什么**：条款三的**窗口定义与格定义一个字都没动**，动的是"越窗要素怎么办"——而这一条此前只有"拒绝"。**没有任何冻结字面量被修改。**

**反例 A（把格当缩放）**：有人把"1 格 = 1 m"实现成 zoom 2 下"1 格 = 0.5 m"（视口 640×360 px / 32 px = 20 格，看起来"更细"）。碰撞盒 **24×16 px** 变成 0.375 m 宽，玩家直接穿过门框；进门判定"距门锚点 ≤1.5 格（48 px）"变成 ≤0.75 m，于是**没有一扇门进得去**。最坏的地方在于：单元测试全绿——它们用米，不用格。**谁会发现**：走完 1.6 km 发现 0 个室内的测试者；若没有这一步，就是玩家。

**反例 B（trunc 而不是 floor）**：有人写 `Math.trunc(x_m)`，理由是"负数取整更直观"。`trunc(−0.4) = 0`，而 `floor(−0.4) = −1`。走廊南半（`y_m < 0`）的 `tileY = −1` 与 `0` 会**塌进同一行**：40 行的走廊变 39 行，`row = tileY + 20` 在南边缘取到 −1，第一行地面静默读到第 20 行的数据（越界读）或直接抛错。A3 显式钉住 `floor(−0.4) = −1`。

---

## 4. 条款四 · `valueKind` 枚举，以及"已验证"栏位的准入门

**冻结内容**：

```js
VALUE_KIND = { OBSERVED: 'observed', PARSED: 'parsed', AUTHORED: 'authored', LICENCED: 'licenced', ABSTRACT: 'abstract' }
GUIDE_VERIFIED_COLUMN_ALLOWED = ['observed']
```

语义：

| 值 | 含义 | 本仓库的实例 |
|---|---|---|
| `observed` | **人打开来源并读到了这个值** | 亲自核过的营业时间、坐标 |
| `parsed` | **解析器**从来源读到了这个值；**没有人核过它** | S3 发射器解析出的 `building:levels` / `height`（67 栋） |
| `authored` | **人放上去的**：以观察为依据，但**本身不是从任何来源读出来的**——是我们的判断，且记录在案 | **12 扇门的位置** |
| `licenced` | 许可 / 授权派生的**模板或默认值** | 道路宽度——本段 OSM `width` 覆盖率仅 **2.7%** |
| `abstract` | 模型派生的**抽象值** | PLATEAU LOD1 抽象高度——`building:levels` 仅 **8.6%** |

> **`parsed` 是怎么来的（S3 / task-13，Lead 裁定 GAP-9）**：发射器用解析器从 OSM 读 `building:levels`。这些值**在来源里**——不是编的、也不是抽象的——但**没有人打开来源读过它**。把它们叫 `observed` 会溶解条款四存在的那个区分；把 `observed` 放宽到覆盖机器读取，会让攻略的"已验证"栏失去意义。**来源陈述 + 机器读取**是独立的一类，所以它有了自己的成员。`observed` 的定义**没有**被动过，这正是它仍然值钱的原因。
>
> **`authored` 是怎么来的（task-2，`doors-author`）**：Gate 1 那个街区里 OSM 只有 **2 个建筑轮廓、0 个 `entrance` 节点**，所以 12 扇门**全部**是手作放置。在此之前，唯一"看起来诚实"的选项是 `licenced`——但条款四把 `licenced` 定义为**授权派生模板**，而门的位置不是任何人的模板。**当时那个标签是三者中"最不坏"的，而不是正确的；该修的是枚举，不是标签。**

**顺序不是许可阶梯。** `VALUE_KINDS` 的顺序（`observed` > `parsed` > `authored` > `licenced` > `abstract`）只是**证据强度**的排序，用于报告。**排在前面不给任何东西开门**——只有 `GUIDE_VERIFIED_COLUMN_ALLOWED` 决定准入，A9b 断言它**仍然恰好是 `['observed']` 一项**，并且**单独点名断言 `parsed` 被挡在外面**（它是最诱人的一个："可是来源就是这么写的啊！"）。

**这一维不是置信度，是来源类别。** 不要把它变成打分，也不要给它加权：agent 自评不可机械校验，加权会把"每行都有可核来源"这条铁律稀释掉。玩家侧的三态（`✅ 亲自到过` / `📖 读过来源` / `⚠️ 待确认`）描述的是**玩家做了什么**，与 `valueKind` 正交——**玩家状态不能提升值的等级**：

| 玩家状态 × `valueKind` | 攻略"已验证"栏 |
|---|---|
| 亲自到过 × `observed` | ✅ 允许 |
| 亲自到过 × `authored` | ❌ **禁止**（"到过"会给我们自己的摆放背书） |
| 亲自到过 × `licenced` | ❌ **禁止**（"到过"会给一个模板背书） |
| 亲自到过 × `abstract` | ❌ **禁止**（"到过"会给一个抽象高度背书） |
| 读过来源 × `observed` | ✅ 允许 |
| 任意 × `authored` / `licenced` / `abstract` | ❌ 永不进"已验证" |

`authored` / `licenced` / `abstract` 不是"不能用"——它们可以渲染、可以参与几何，但**要么从攻略里去掉，要么换一个显式标签**（如「策展人放置」「按类别模板推算」「模型抽象高度」）。第三条路（静默提升为已验证）是禁止的。

**反例 A（高度）**：有人把 PLATEAU LOD1 高度并到 1,212 个建筑 way 上，并让合并行继承附近策展地点的 `✅ 亲自到过`。攻略于是印出一个**没有任何来源陈述过**的建筑高度：LOD1 是从航拍影像挤出的抽象体块，不是测绘高度。**谁会发现**：读者数楼层，发现攻略说 4 层、实际 6 层。

**反例 B（路宽）**：构造时 `width` 只覆盖 2.7%，于是回落到按类别的授权模板，写进同一个字段且**不带 `valueKind`**。结果：攻略"已验证"栏里 **97.3% 的路宽是模板**，与那 2.7% 实测值完全无法区分；依赖路宽的招牌位置（"退到路缘后 1.0 m"）与 12 扇门的门洞全部对一个**类别平均值**定位。**谁会发现**：验证守门人查不出哪一行是实测（字段里没信息），直到有人站在门口发现招牌悬在车道上方。

**反例 C（枚举本身）**：有人把 `licenced` "修正"成美式拼写 `licensed`。A9 显式拒绝 `licensed` 与 `Licenced`。这是**故意设计成大声失败**的：出事故时最自然的"修复"是把这些行改标成 `observed`——那才是真正的灾难，而校验器会先拦住拼写这一步。

**反例 D（把 `authored` 当成 `observed`）——本次新增成员最可能引发的那一个**：12 扇门是策展人放的，**没有任何来源陈述过它们的位置**。如果有人把 `authored` 读成"反正也是我们实地看过才放的，等于 `observed` 吧"，那 12 行就进了攻略的"已验证"栏。后果不是格式问题：**攻略会宣称"这扇门我们核实过"，而实际上它是我们的判断**。读者按图走到门前发现是后巷的卷帘门时，被质疑的不是那扇门，是**整份攻略的可信度**——而这就是"亲自到过给抽象高度背书"的同一个错误换了个字段。
**谁会发现**：验证守门人（`authored` 行出现在"已验证"栏 = 条款四被违反），然后是在现场数门牌的读者。**A9b 就是为这个而加的**：新增一个成员**不得**顺带把闸门放宽——四个成员，**一个**进"已验证"栏。

### 4b. `lanes` 在人工核一次之前**不得**作为事实使用

`四条通` 的 `lanes` 标签**自相矛盾**（A15 实测，记录在 `LANES_QUALITY`）：

| 经度段 | 段数 | `lanes` |
|---|---|---|
| 135.748883 .. 135.759719（**四条烏丸以西**） | 7 | **4** |
| **135.759719 .. 135.761091（四条烏丸以东第一段）** | 1 | **2** |
| 135.761091 .. 135.766352 | 1 | 2 |
| **135.766352 .. 135.769320（含四条河原町，lon≈135.7687）** | 1 | **1** |
| 135.769320 .. 135.771015 | 1 | 2 |
| 135.771015 .. 135.777193 | 5 | 4 |

- 锚点**以西连续 7 段全是 4**，**以东第一段立刻是 2**——A15 断言的就是这个具体矛盾；
- 唯一的 `lanes=1` **正好压在四条河原町**上，而 L2 的本地知识说四条通实际约 **4 车道**；
- 16 段之和**等于**测量记录自己的 way 计数（16），所以**记录是完整的，是数据本身在自相矛盾**。

**处置**：`LANES_QUALITY.usableAsFact = false`、`humanCheckRequired = true`，A15 断言这两个值——想翻它必须改到写明理由的那一行。这是 L2 建议的 **18 h 人工核 60 条 `primary`** 的第一项。

**反例**：有人看到"7 段都是 4"就把 4 当成事实，用它算车道宽度 → 得到约 14 m 的路面，写进攻略与碰撞盒。**谁会发现**：验证守门人（同一字段在两个相邻 way 上给出 4 和 2，无法判定谁对），然后是在四条河原町过马路的读者。

---

## 5. 条款五 · 两个坐标系统不混用

**冻结内容**：

| 层 | 单位 | 存什么 |
|---|---|---|
| 地理 / 溯源（**仅事实层**） | **整数微度**（µ度） | `lonUdeg`、`latUdeg`；非整数直接抛 `NonIntegerCoordinateError` |
| 世界 / 游玩 | **整数格 + 1/16 子格** | `subX = round(x_m · 16)`；格 = `floor(sub/16)` |

浮点只出现在构建期转换里一次。精确地说，**每个点 6 次浮点运算**（每轴：转度、乘系数、乘 16），随后立即 `round` 成整数；**浮点从不被存储、累加或比较**。确定性不靠"相信浮点稳定"，靠 A8 断言：同输入两次 → 逐字节相同；两个**独立 node 进程** → 同一个 sha256。

字段名只有一套：**`lonUdeg` / `latUdeg`**（与测量记录、任务卡一致）。**故意不提供 `lonMicro` 别名**——一个东西一个名字，否则两者会漂移。原点本身也是 µ度取整的：实测 `135.7597188` → 冻结 `135759719`，差 0.2 µ度 = **1.8 cm**，A13 断言取整是"最近"而非"截断"。

**这里有一个必须写明的真相**（A7 实测）：

| 精度 | 数值 |
|---|---|
| 1/16 子格 | **62.5 mm** |
| 事实层 1 µ度（经向） | **91.28 mm** |
| 事实层 1 µ度（纬向） | **110.94 mm** |
| 投影模型在走廊远端自身误差 | **200.9 mm** |

**事实层比子格粗 1.46 倍**——所以"1/16 子格"**不能**从事实层坐标产生，它只能来自手作内容或运行时移动。任何"攻略坐标精确到 6 cm"的说法都是假的：事实层自己的分辨率就是 9.1 cm（东西）/ 11.1 cm（南北）。子格是**量化栅格**，不是精度声明。

**反例 A（把投影米数写进事实层）**：有人"为了客户端不用投影"，把 `x_m` 浮点存进 `places.json`。此后事实层的坐标**依赖投影常量**：将来重切走廊（换原点）时 µ度仍然正确，而存下来的米数整体平移——因为两者只差一个常数偏移，原点附近**看起来一切正常**。更糟的是 JSON 浮点往返会变成不同文本（`0.30000000000000004`），于是 `pack.json` 的内容哈希在两次**完全相同**的构建之间改变，所有缓存键失效。**谁会发现**：先是验证守门人（数据没变但内容哈希变了），再是客户端工程师（离线包每次构建都重下）。

**反例 B（存档用浮点）**：实体位置存成 `x_m = 1234.567`。存档要按字节比较才能证明"同一次游玩可复现"，而浮点文本会随平台的乘加实现漂移。存整数子格（`19753`）则天然可移植。

---

## 6. 验收证据（真实输出，非描述）

`node tools/world-grid.mjs`（cwd = `docs/handOff/dsh-bundle-tourguide-2.5d`，node v26.8.2）：

```
S1 geo-pipeline contract — executable assertions
node v26.8.2  ·  1600x40 tiles @ 1 m (64000 tiles = 40 blocks = 16 chunks)  ·  origin=135759719,35003658 (frozen)  ·  road end=135777193  ·  GAP to 祇園交差点 ~92 m

A1   PASS  clause 1+2 — constants are frozen literals
          deepFrozen=true mutationThrew=true wTiles=1600 lon=91282.15 lat=110940.65 origin=135759719,35003658 east=135777193,35003749
A2   PASS  clause 2 — worldGrid tiles exactly into 1.6 km / 40 m, 16 chunks
          1600x40 tiles = 64000 tiles = 40 blocks x 1 block = 64000 tiles; corridor = 1600 m x 40 m; ground 51200x1280 px = 65.536 Mpx = 62.5 MiB indexed / 250 MiB RGBA; 16 chunks of 100x40 tiles = 3200x1280 px (limit 4096) (pixelOk=true chunkOk=true)
A3   PASS  clause 3 — tileX = floor(x_m), canonical on the sub-tile
          definition cases ok=true (incl. floor(-0.4)=-1); canonical path agrees on 6 mid-tile cases=true; near-boundary sweep over 1134 samples found 315 disagreements, worst 0.031250 m from a boundary (bound 0.03125, unexplained=0)
A4   PASS  clause 1 — frozen coefficients == WGS84 ground truth, error < 1 m
          exact lon=91282.0609 lat=110940.6752 m/deg; series lon=91282.0289 lat=110940.6529 (agree=true); frozen-exact: lon 0.0891 m/deg -> 1.562 mm over 1600 m, lat -0.0252 m/deg -> 0.009 mm over 40 m; tangent-plane sagitta 0.2009 m
A5   PASS  clause 1 — coefficient latitude sensitivity is immaterial
          d(lonCoef)/d(phi)=1110.7 m/deg per deg; +-0.0018 deg (35.0055 vs the measured axis 35.003658) -> 35.04 mm over 1600 m (bound 100 mm)
A6   PASS  clause 1 — Web Mercator overstates ground by >20%, so it cannot land in the grid
          cos(35.0055 deg)=0.8190969811; inflation=+22.086%; corridor would need 1953.4 tiles vs wTiles=1600 (353.4 tiles overhang = 22.1% of the grid); a 3.5 m lane becomes 4.273 tiles (0.773 tiles = 22.09% too wide)
A7   PASS  clause 5 — sub-tile, microdegree and model error are three different numbers
          1/16 sub-tile=62.5 mm; fact-layer 1 uDeg=91.28 mm lon / 110.94 mm lat -> the fact layer is 1.46x COARSER than the sub-tile, so sub-tile positions are not addressable from fact-layer input; model error at the far end=200.9 mm (3.2x coarser than the sub-tile)
A8   PASS  acceptance — same input twice yields a byte-identical grid
          sha256 A=7059980F09A82664297D9DF488E2D0D54AB7BB3581D05A79EDB2F3D6F1B0B3C3 B=7059980F09A82664297D9DF488E2D0D54AB7BB3581D05A79EDB2F3D6F1B0B3C3 identical=true; 64000 bytes, drawn=3, rejected=0, setTiles=2894
A8b  PASS  acceptance — grid is independent of feature order
          sha256=7059980F09A82664297D9DF488E2D0D54AB7BB3581D05A79EDB2F3D6F1B0B3C3
A8c  PASS  acceptance — rasteriser is direction-invariant (OSM way order is not stable)
          reversed-vertex sha256=7059980F09A82664297D9DF488E2D0D54AB7BB3581D05A79EDB2F3D6F1B0B3C3 identical=true
A9   PASS  clause 4 — valueKind enum is exactly {observed, parsed, authored, licenced, abstract}
          kinds=[observed, parsed, authored, licenced, abstract] exact=true frozen=true; 'licensed' rejected=true; 'parsed' and 'authored' are valid kinds=true
A9b  PASS  clause 4 — the gate did not widen: five kinds, one reaches the guide
          allow-list=["observed"] exact=true; permitted by predicate=[observed]; of 5 kinds, parsed blocked=true, authored/licenced/abstract/undefined/null/'OBSERVED' blocked=true
A10  PASS  clause 5 — fact-layer coords are integer microdegrees; grid needs a frozen origin
          float coordinate rejected=true; gate missing:gated unfrozen:gated null-island:gated non-integer:gated; bad origin propagates from buildWorldGrid=true; default (no-arg) origin is the frozen ORIGIN=true
A11  PASS  clause 3 — half-open window x[0,1600) row[0,40); overflow rejected, never clamped
          drawn=2 rejected=3 (2500 m east, 1600 m edge, y=+25 m dropped); canonical inset=62.50 mm, rejection threshold inset=31.25 mm; last accepted input=17527 uDeg (=1599.902 m, in=true), next uDeg=17528 (=1599.994 m, in=false); sub 25599 in=true, sub 25600 in=false; row: y=-20 m -> row 0, y=+20 m -> out=true
A12  PASS  clause 2 — building measurement covers the frozen corridor
          bbox lng 135.759..135.7788 vs frozen origin 135759719 uDeg -> x from -65.63 m to +1741.75 m (overhang 65.63 m west / 141.75 m east of the 1600 m corridor, covers=true); lat band 177.51 m = +-88.75 m vs corridor +-20 m (superset=true); counts 1212 ways / 104 with building:levels = 8.58% (file says 8.6%, consistent=true); 10 entrance nodes, 193 shop nodes; fetched 2026-09-29T14:54:12Z
A13  PASS  clause 1 — frozen ORIGIN mirrors the measurement record, and both rejected rules survive
          origin 135759719,35003658 == way 465069436 node#3 (primary) matches=true; uDeg round-trip=true; anchor=四条烏丸; recorded span=1595.05 m, origin sits 18.9 m from the anchor; rejected rules kept=true
A14  PASS  clause 1 — measured span fits the corridor; the 92 m east gap is frozen
          measured span=1595.05 m inside wTiles=1600 -> margin 4.95 m; EAST_END projected against ORIGIN = 1595.064 m (reproduces the record: true); corridor east=135777247 uDeg vs road end=135777193 uDeg -> road stops 4.93 m before the corridor end; gap to 祇園交差点 (ref 135778200 uDeg, +-4.56 m) = 91.92 m vs documented 92 m (matches=true, real=true); record: wTiles=1600 (agrees=true), marginM=-4.95 = -(ours) (agrees=true)
A15  PASS  clause 4 — `lanes` may not be used as a fact until a human checks it
          usableAsFact=false humanCheckRequired=true; recorded 6 segments / 16 ways (measurement says 16) = true; distinct lanes values=[4,2,1] conflicting=true; west of origin all lanes=4 (1 segs) but the first way east is lanes=2 -> contradiction=true

18/18 assertions passed, 0 failed
contract sha256=F50E4144E5BBAD1D14F889C944BDFD58A7CD6681349411F67A6AB9B23BC422A9  (all frozen literals)
fixture grid sha256=7059980F09A82664297D9DF488E2D0D54AB7BB3581D05A79EDB2F3D6F1B0B3C3  setTiles=2894  bytes=64000
```

**跨进程幂等**（两次独立 node 调用，`--hash`）：

```
payloadsha256=7059980F09A82664297D9DF488E2D0D54AB7BB3581D05A79EDB2F3D6F1B0B3C3 setTiles=2894 bytes=64000
payloadsha256=7059980F09A82664297D9DF488E2D0D54AB7BB3581D05A79EDB2F3D6F1B0B3C3 setTiles=2894 bytes=64000
```

**可 import**（另一进程动态 import，且**不触发 CLI 输出**）：

```
exports=41
worldGrid={"wTiles":1600,"hTiles":40,"blockSize":40} frozen=true
ORIGIN={"status":"frozen","lonUdeg":135759719,"latUdeg":35003658,"osmWayId":465069436,"nodeIndex":3}
EAST_END={"lonUdeg":135777193,"latUdeg":35003749}
GRID: tiles=64000 chunks=16x100 chunkPx=3200x1280 indexedMiB=62.5
VALUE_KINDS=observed|authored|licenced|abstract
guideVerifiedAllows=["observed"]   → authored→verified? false, observed→verified? true
LANES_QUALITY.usableAsFact=false
GAP_M=92
eastEnd projected: x_m=1595.06 y_m=10.10
contractFingerprint=0A616AB6DBC3020AD8EDAEFFCBA1FDEA29F697CE62E0B35546E8236FD50B83CD
```

**cwd 无关**：从仓库根跑 `--json` 同样 18/18。

> **两个哈希是两件事，都要看。**
> - **`contract sha256`**（全部冻结字面量的指纹）= `0A616AB6…`。**任何**字面量变化都会移动它，包括这次新增 `authored`。
> - **`fixture grid sha256`** = `7059980F…`。**只**在投影 / 网格 / 栅格化器变化时移动。
>
> **本次新增枚举成员，网格哈希没有动——这是对的**：`authored` 是来源词汇，不是几何。如果它动了，说明我在改词汇时碰坏了投影。§10 那条"哈希变了 = 必须有人签字"要读成：**几何哈希变了才需要签字；词汇变了看 contract 哈希**。
> 之所以需要 `contract` 这个哈希：本模块被 `.gitignore` 排除（bundle 被 junction 进 DSH profile），**唯一被跟踪的审计锚点是本文档**——所以文档必须同时携带"契约指纹"和"几何指纹"。

> **测试夹具不是地理数据。** A8 的输入是 `buildFixtureLines()` 生成的合成夹具：一条 **1,600** 顶点、1 m 间距、±0.22 m 确定性摆动的脊线 + 一条 5 m 横枝 + 一条 8 m 侧枝，**以原点相对偏移表达**，因此整条管线在没有京都坐标的情况下也能被完整检验。它**不是**四条通线形，**不得**当作几何发货。
> **未覆盖**：A12 / A13 的 SKIP 分支（`archive/` 不在包内时）在本环境未被执行——那两个文件都存在。

---

## 7. 缺口（GAP）——不得用"看起来合理的数"填

| # | 缺口 | 影响 | 谁来关 |
|---|---|---|---|
| ~~**GAP-1**~~ | ~~原点数值未冻结~~ → **已解（S1b）**：原点是实测镜像（way `465069436` node#3），A13 逐字段核对测量记录，两条被推翻的规则随记录保留。 | — | ✅ 已关闭 |
| **GAP-2** | **走廊的真实边界与名义边界差 4.93 m，且离祇園交差点还差 91.92 m。** 路几何止于 `135777193`，走廊止于 `135777247`，祇園交差点约在 `135778200`。**这 91.92 m 是真实缺口**（可能是路段的几何终点不等于路口），已冻结为常量 + A14 断言。 | 走廊东端最后 4.93 m 无路面几何；攻略不能声称"走到祇園交差点" | Lead 裁定：这 91.92 m 是补测，还是在攻略里显式写成"至四条通几何终点" |
| **GAP-3** | **建筑测量 bbox 与文档口径不符**（详见 §8.2）。A12 现在断言它**覆盖**走廊（西溢 65.63 m / 东溢 141.75 m，`covers=true`），所以不阻塞。 | `8.6%` 是**整带**建筑计数，不是"临街立面"计数 | 重测时一并修正 |
| **GAP-4** | **`licenced` 路宽模板没有指名来源。** 已知 OSM `width` 覆盖 2.7%（附录 §7 备注 ⑧），但模板本身取自哪份权威（道路構造令 / MLIT）未定。 | `licenced` 行无法回答"玩家凭什么相信它"，且其许可基础决定派生行是否带 ODbL 义务 | `city-data-architect` + Lead |
| **GAP-5** | **PLATEAU Site Policy 逐条原文未取到。** `design-core.md` §8.2.1 ③ 已自标此缺口；本机 `_plateau.json` 只有数据集元数据（`license_id: "plateau"`、`license_url: https://www.mlit.go.jp/plateau/site-policy/`、描述句「商用利用も含め、どなたでも無償で自由にご利用いただけます」），**不是**政策正文。 | `abstract` 高度目前只能内部使用，**不可发布** | 发布前必须补取（官网是 JS 壳） |
| **GAP-6** | **ODbL 派生行未做文件隔离。** 角色纪律要求"开放数据库派生的行单独成文件并以相同许可发布"；`.pmtiles` 烘焙后丢弃（`design-core.md` §8.2.1 ②）解决的是**发行物**，但 `places.json` 里源自 OSM 的整数微度行仍是 Derivative Database 候选。 | 许可传染可能波及自有数据表与图集 | 需在 `city-packs/` 定名一份 `*-odbl.json` 约定 |
| **GAP-7** | **无校验器执行"已验证"栏规则。** [`validate-city-pack.mjs`](../../docs/handOff/dsh-bundle-tourguide-2.5d/tools/validate-city-pack.mjs) 查的是来源**存在性**，不查 `valueKind`（该文件里有 `(0,0)` 占位坐标检查，可与本契约对齐）。 | 条款四是**声明**，还不是**门** | 见 §8.3 需外部改动 |
| **GAP-8** | **`lanes` 不可用作事实**（条款 4b）。已冻结为 `usableAsFact: false` + A15 断言，但**人工核查本身还没做**。 | 车道数 / 路宽 / 门洞定位目前都缺一个可信输入 | L2 建议的 18 h 人工核 60 条 `primary` 的第一项 |
| **GAP-9** | **`observed` 的定义与发射器冲突。** 条款四把 `observed` 定义为"**人**打开来源并读到了这个值"；S3 发射器把**机器解析**的 `building:levels` 标成 `observed`（遵循任务卡约束 3）。1,512 个 way 的标签不是任何人读过的。这会把"来源这么说"与"人核过"混成一列——**正是条款四存在的理由**。 | 攻略"已验证"栏会因此吃到机器读取的值 | **Lead 裁定**：把 `observed` 措辞放宽为"来源陈述了它（人读或机读，且记录在案）"，或给机器读取另立一档 |
| **GAP-10** | **跨窗建筑被整栋丢弃（实测 134 栋）。** 条款三要求越窗要素**拒绝、不夹紧**；但真实建筑比 ±20 m 走廊深得多，于是**部分在窗内**的建筑被整栋丢弃，连带丢掉窗内那截临街面。 | 临街墙上出现"整栋消失"的空洞 | **Lead 裁定**：保持整栋拒绝，还是允许**裁剪**（裁剪 ≠ 夹紧：夹紧伪造几何，裁剪算的是真实交集）。§11.3 给了两种做法的实测数字 |
| **GAP-11** | **78 栋无来源高度的建筑没有数字（刻意的）。** 它们标 `abstract` 但 `heightM: null`——没有 PLATEAU LOD1 抽象高度可填，也**不允许**填一个"看起来合理"的高度。 | 2.5D 场景里这些建筑没有高度 | 要么摄入 PLATEAU 抽象高度，要么由 **Lead 在契约里**声明一个项目级默认高度，而不是让发射器自己挑一个 |
| ~~**GAP-9**~~ | ~~`observed` 定义与机器读取冲突~~ → **已解（S3）**：新增 `parsed` 成员，`observed` 的定义**未动**，A9b 单独断言 `parsed` 进不了"已验证"栏。 | — | ✅ 已关闭 |
| ~~**GAP-10**~~ | ~~跨窗建筑被整栋丢弃~~ → **已解（S3）**：Lead 裁定**跨越窗口的裁剪、完全在窗外的拒绝**；随后发现"裁到 40 m 窗口"会产出埋掉街道的厚板，故追加**立面进深带**（默认 40 m = `blockSize`）。 | — | ✅ 已关闭（进深值本身见 GAP-13） |
| **GAP-12** | 🔴 **街道装不进世界（S14 正在失败）。** `四条通` 自己的中心线在走廊内**向北爬升 19.86 m**（0.71° 偏东），而窗口只有 ±20 m。x=1388 处北侧余量 **0.14 m**。按需求的半宽算，走廊**短缺长度**：1 m → **297 m（18.6%）**、3.25 m → 523 m、5 m → 611 m、8 m → **735 m（45.9%，最差缺 7.86 m）**。**S11/S12/S13 都测不到这个**——它们只问"中心线在不在"，一条 1 m 宽的街也能全过。 | 走廊东段三分之一：街道的北半幅落在世界之外。玩家走到那里会看到街爬出世界边缘 | **Lead 裁定中**。三种读法的算术已在 §11.7：**加宽 `hTiles`**（1 m 半宽 → 42；8 m → 56）、**把原点纬度改到走廊中点**（北移 9.93 m → 最小余量变 10.07 m，但**每个门的 cellY 都要重算**）、**或让走廊随街走**（`cellY` 改为相对街道行，1,600 项表，不动原点） |
| **GAP-13** | **立面进深带 40 m 是发射器常量，尚未冻结。** 它派生自 `worldGrid.blockSize`，因此不是魔法数，但也不在冻结集合里、无断言。 | 深于 40 m 的建筑只发射临街那一段；若日后想要别的深度，没有契约约束 | 若 Lead 要它进冻结集合，它移入 `world-grid.mjs` 并加断言（一次有纸面流程的改动）；否则它留在发射器里，由 S14 与 GAP-12 的裁定共同约束 |

---

## 8. 需要契约外的人做的改动（我不动这些文件）

**8.1 已由 Lead 修掉的三处（我复核过，不再是缺口）**

1. ✅ **附录 §1.3 lane 0** 现在是 `64,000 格（1600×40，wTiles=1600）`、`65.536 Mpx`、RGBA `250 MiB` → 索引色 `62.5 MiB`、`分 16 块，每块 3,200×1,280 px`。**渲染方可以直接照这一行申请显存。**
2. ✅ **`design-core.md` §8.2.1 ⑤** 已是 `{ wTiles: 1600, ... }` 与"64,000 格 = 40 个街区 = 16 个纹理块"；"两条口径"小节已是 `51,200 × 1,280 px = 65.536 Mpx` / RGBA `250 MiB` / 索引色 `62.5 MiB`。
3. **任务卡写 `cos(35.0055°) = 0.8192`，实测是 `0.8190969811`，四位小数是 `0.8191`。**（此值**不在** `design-core.md` 或附录里，只在任务卡中。）结论不受影响（22.086% vs 22.070%，都归到"22%"），但**字面量应当修正**，否则下一个人会拿 `0.8192` 反推出一个约 34.995° 的纬度。A4/A6 用的都是实算值。

**8.1b 本次 `authored` 新增带来的两处下游（文件都不在我手上）**

- **12 扇门的行需要从 `licenced` 改标为 `authored`。** 这是本次加成员**唯一的实际目的**——`doors-author` 当初标 `licenced` 是为了不把摆放洗成"已验证"（判断正确），但 `licenced` 的语义是"授权派生模板"，对门的位置不成立。**改标不会让它们进"已验证"栏**（A9b 已断言），只是让标签第一次变成正确的。
- **`design-core.md` §8.2.1 ④ 的枚举行仍写 `observed | licenced | abstract`（三个成员）**，与本契约的四个成员不一致。父文档归 Lead 管；不改的话，两份文档对同一个枚举给出不同答案。

**8.2 `measure-kyoto-blocks.mjs` 的两处口径问题（该文件不在我的写入范围）**

- 文件头声明测的是"**street-fronting** building footprints"，但查询是整 bbox 的 `way["building"]`——**没有临街过滤**。所以 `8.6%` 是"带内全部建筑"的有值率，不是"临街立面"的有值率。结论方向不变（PLATEAU 仍必需），但数字的含义必须改写。
- 同一个 bbox 有三个互相矛盾的口径标签：脚本头注释写"axis ±60 m"、行内注释写"~±45 m in latitude"、摘要 JSON 写"axis ±45 m"，而实算是 **±88.75 m**（0.0016° × 110940.65 = 177.51 m）。A12 断言这个带是走廊的**超集**（±88.75 m ≫ ±20 m），所以不阻塞——但标签必须修。

**8.3 需要 Lead 处理的三件事（文件不在我的写入范围）**

- ✅ **`freeze-origin.mjs` 不再硬编码 `wTiles`**——它现在 `import` 本模块的 `worldGrid.wTiles`，记录里也写 `wTiles` 而非旧的 `frozenWTiles`。A14 因此新增两条交叉断言：**记录里的 `wTiles` 必须等于冻结值**、**`marginM` 必须等于我们余量的相反数**。⚠️ 残余一处：记录里 `sliceAnchor` 仍是**四条烏丸交点**（`35.003825 / 135.759680`）而工具里的 `ANCHOR` 已改成**原点本身**（`35.003658 / 135.759719`），所以 `distanceFromAnchorM: 18.9` 说的是"原点到交点"的距离。**这其实更有信息量，建议保留**；只是别让下一个人以为 `sliceAnchor` 是那个 clamp 锚点。重跑工具会让这两个字段变成 0。
- `docs/handOff/dsh-bundle-tourguide-2.5d/package.json`：把 `"./world-grid": "./tools/world-grid.mjs"` 加进 `exports`，并加一条 `"check:geo": "node tools/world-grid.mjs"`；条款二要求这个常量"进 CI"，目前**尚未接线**。
- `validate-city-pack.mjs`：加一条 `valueKind` 校验（枚举合法 + "已验证"栏准入），把条款四从声明变成门。**注意它必须同时接受 `authored` 为合法值、又拒绝它进"已验证"栏**——这正是 A9b 在契约侧做的两件事。

---

## 9. 本契约**不**覆盖什么

- **纵向比例**（θ = 70.53°、米 × 10.67 px、带 1–6 的立面预算）是渲染常量，与地面网格无关。**`abstract` 高度不得被换算成格**。
- **`.pmtiles` → `ground.png` / `collision.png` / `heights.png` / `scene.bin` 的烘焙流程**（§8.2.1 ②）——本契约只固定这些产物必须遵守的坐标与格定义，以及**16 块 × 3,200 × 1,280 px** 的切分。
- **`pack.json` / `places.json` / `transit.json` 的字段 schema**——那在 `validate-city-pack.mjs` 与技能 `tourguide-fact-integrity` 的范围。
- **字形普查的两个口径**（450 加权 vs 1,566 按串计数，§8.2.1）——招牌层的事。
- **那 91.92 m 缺口怎么处理**（补测 / 改写攻略措辞）——见 GAP-2，需要 Lead 裁定。

---

## 10. 变更规程

改动 `worldGrid` / `PROJECTION` / `ORIGIN` / `EAST_END` / `VALUE_KIND` 的任何一个字面量，**不是改 config，是改契约**：

1. 先改 [`world-grid.mjs`](../../docs/handOff/dsh-bundle-tourguide-2.5d/tools/world-grid.mjs) 的字面量，并**同步改上面对应的派生量与断言**（A1/A2/A13/A14 会抓出手改不一致）；
2. 跑 `node tools/world-grid.mjs`，它必须回到 `N/N passed, 0 failed`；
3. 任何**已烘焙**的栅格一律作废重烘——不存在"只改一格"的迁移；
4. 在本文档 §6 重新粘贴真实输出，并在 §7 说明受影响的 GAP。

**A8 是这条规程的执行者**：任何一次改动都会改变那个 `sha256`。哈希不变 = 没改到实质；哈希变了 = 必须有人签字。

> **两个先例，读法不同。**
> - **S1b（几何变了）**：`wTiles` 2000 → 1600，夹具哈希 `D5732ED6…` → `7059980F…`，`bytes` 80,000 → **64,000**，`setTiles` 3,614 → 2,894，断言 14 → 17。
> - **S1c（只动来源词汇）**：`VALUE_KIND` 加 `authored`，断言 17 → **18**，`contract sha256` → `0A616AB6…`，而**夹具哈希 `7059980F…` 一格没动**。
>
> 第二次的"没动"和第一次的"动了"一样重要：**加一个来源类别不该移动任何几何**。如果它动了，说明改词汇时碰坏了投影或栅格化器——那才是要签字的信号。所以 §6 必须同时贴 `contract sha256` 与 `fixture grid sha256`，只看一个都会误判。

---

## 11. S3 · 发射器：真实几何第一次进管线（2026-09-30）

**实现**：[`emit-scene.mjs`](../tools/emit-scene.mjs)（已跟踪）。它 `import` 本契约，不重述任何常量：`ORIGIN` / `worldGrid` / `PROJECTION` / `GRID` / `VALUE_KIND(S)` / `LANES_QUALITY` / 投影原语。

**本轮没有移动任何冻结字面量**——`world-grid.mjs` 未被修改，`contract sha256` 不变，A1–A15 仍 18/18，A13 仍然镜像测量记录。

### 11.1 任务卡指定的输入**不能用于本任务**（换了一份，理由在此）

`kyoto-slice-overpass.json`（sha256 `5CE78031…`，与任务卡一致）是 `out tags center;` 拉的：**1,212 个 building way、0 个带几何**，只有中心点。中心点无法栅格化轮廓，而**围着中心点编一个轮廓正是本项目要防的那件事**——所以我不会用它，也不会替它造几何。

仓库里**确实有**真实走廊几何：`city-packs/kyoto-shijo/evidence/osm-corridor-map.json`（已跟踪，sha256 `56B45615…`），普通 `out;` 拉的 → way 带 `nodes` id 列表、dump 带 node 元素 → **1,512 个 building way，100% 可解析（0 个缺节点）**。发射器两种格式都支持（`geometry` 与 `nodes`），默认用这一份。

### 11.2 决策（写在这里，因为下一个人会问）

| 决策 | 值 | 理由 |
|---|---|---|
| 越窗要素 | **整栋拒绝**，绝不夹紧 | 条款三 + A11。裁剪作为**诊断**另算，不进产物（GAP-10） |
| `building:levels` → 米 | `× 3.0 m/层`，并记录 `derivation` | 3.0 m 层高是**项目常量**（附录 §1.1：3.0 m = 32 px），不是测量。所以复合值**不许伪装**成来源陈述 |
| 无来源高度 | `valueKind: 'abstract'`，**`heightM: null`** | 没有 PLATEAU 抽象高度可填。填一个"看起来合理"的高度是本项目唯一要防的失败；**空洞才是诚实表示** |
| `height` 标签 | `observed`，直接用米 | 来源直接给了米，无需换算 |
| 高度栅格语义 | `heights[i]` 只放**有来源**的高度；`ground[i]=1 && heights[i]=0` ⇒ 有建筑但高度无来源 | 这样渲染方一眼能分辨"没有建筑"与"有建筑但没高度" |
| 重叠脚印 | ground/collision 取或，heights 取 **max** | 幂等且与遍历顺序无关 |
| 要素顺序 | 栅格化前**按 OSM id 排序** | 顺序无关性由构造保证，不靠运气（S4 另测） |
| 输出位置 | `build/scene.bin`（`.gitignore:86 /build`） | 烘焙产物不该变成被跟踪的仓库内容 |

### 11.3 真实数字（GAP-10 裁定后重新测量）

| 量 | 值 |
|---|---|
| 输入 | 1,512 个 building way（14,149 elements） |
| **发射** | **211（14.0%）**，其中 **132 栋是裁剪进来的** |
| **拒绝** | **1,301**：跨窗 1,217 / 走廊东端外 61 / 原点以西 21（+ 2 栋裁到零面积） |
| 真实横截面 `y_m` | p5 −90.31 / p25 −47.59 / **p50 +33.73** / p75 +80.10 / p95 +113.83（9,567 顶点） |
| 冻结窗口 | `y_m ∈ [−20, +20)` —— **真实建筑比走廊深得多** |
| 地面层占用 | **22,454 / 64,000 格 = 35.1%** |
| 高度分级 | **parsed 67** / observed **0** / **abstract 144**；abstract 带数字的 = **0** |
| **临街连续性** | 轴覆盖 **1,329 m = 83.1%**；>20 m 的缺口 **3 个**，最长 **69 m** |
| 对照：整栋拒绝（旧行为） | **79 栋**（5.2%）/ 地面 **9.9%** / 轴覆盖 **420 m** / 最长缺口 **450 m** |
| `scene.bin` | **404,406 字节**，sha256 `F3855B4E…`（两次运行、逆序遍历、`lanes` 被破坏三种情况**同一个值**） |

### 11.4 D-26 的答复：block 0 现在装的是什么（Lead 点名要的数字）

发射器的窗口是**走廊**（1,600 m），**不是**手作的 block 0（40 m），所以 `x=58.36 m` 的立面只是落在 block 1——`wTiles` 不必也不能被拓宽。

裁定后重新测量 **block 0 的实际内容**：

| 量 | 值 |
|---|---|
| 源几何触及 block 0 的脚印 | **7 栋** |
| **实际发射进 block 0 的脚印** | **1 栋**（OSM way `205732536`） |
| 它的发射范围 | `x 9.585 .. 44.363 m`、`y −20.00 .. −12.44 m`（南侧立面带） |
| 它的 `valueKind` / 高度 | `parsed`，`levels=8` → 24 m（3.0 m/层） |
| 最西的**已发射**临街面 | **x = 9.585 m**（裁定前是"没有任何东西"，因为整栋拒绝把它丢了） |

所以：**12 扇手作门所在的 block 0，现在有 1 栋真实建筑、8 层、南侧**。其余 6 栋触及 block 0 的脚印仍然落在窗外（它们深达 `y_m −102.5 .. +142.7 m`，而窗口只到 ±20 m）——按裁定它们**完全在窗外**，拒绝正确。

### 11.5 新增断言 S1–S14（15 条，在发射器里）

`node iteration/tools/emit-scene.mjs --assert` → **14/15，S14 故意红**。要点：

- **S2** 越窗拒绝：`y=+20 m → row 40`、`x=1600 m → tileX 1600`、`x=2500 m → tileX 2500`，三者 `inWindow=false`；控制点 `x=100 m, y=19.9 m` 为 `true`。
- **S2b** GAP-10 裁定的**要素级**测试：完全在西边 → 拒绝；跨 `x=0` → 裁剪后 4 点；跨 `y=+20` → 裁剪；完全在内 → 保留；裁剪点全在可表示盒内。
- **S5** 211 条记录**每条都带 `valueKind`**；`abstract` 144 条**全部 `heightM: null`**；`observed` = 0 **是对的**（没有人读过）。
- **S6** `lanes` **行为证明**：把输入里每个 `lanes` 改成 `'9'` 后重建，`sha256` **一字不差**。
- **S10** 临街连续性（**性质而非计数**）：轴覆盖 ≥ 1,200 m 且最长缺口 ≤ 80 m；并断言这个下限**不能被旧行为满足**（旧行为 420 m）——所以闸门真的在区分两种行为。
- **S11** 街道中心线全程留在窗口内：漂移 **19.86 m**，北侧余量 **0.14 m**。
- **S12** 街道**自己那一列**可走 ≥ 98%：实测 **1,600 列全查，街道处被挡 0 列（100.0%）**。
- **S13** 路线**连通**（不是"大体通畅"）：从 `x=0` 洪泛，41,269 个可走格，最远列 `x=1599`，到达街道在 `x=1599` 的位置（row 30）。
- **S14** 🔴 **街道是否装得下**（在每一列的两侧都要有 ≥1 m 半宽）→ **失败**，见 GAP-12。**这是故意留红的**：闸门红着才是诚实状态，直到 GAP-12 被裁定。

### 11.6 已接线为第十一道门（Lead 已加）

`run-gates.mjs` 现在跑 11 道门，`scene` 那道调用 `emit-scene.mjs --assert`。**当前 `run-gates` = 10/11**：`scene` 因 S14 而红，这正是 GAP-12 的信号，不是缺陷。

`run-gates.mjs` **保持 10/10 不变**（我复核过）。发射器的断言**不进** `GATES` 数组——那需要改 `run-gates.mjs`，而它不在我的写入范围。**建议 Lead 加这一条**（我已确认它不会破坏任何现有门）：

```js
{ id: 'scene', name: 'scene emit (real geometry)', cmd: ['node', join(REPO, 'iteration', 'tools', 'emit-scene.mjs'), '--assert'],
  why: 'real OSM geometry through the frozen projection; S1-S9 determinism and rejection' },
```

**提交前已模拟过 `find-untracked-deps`**：新脚本引用的 3 个路径（`world-grid.mjs`、`osm-corridor-map.json`、`kyoto-slice-overpass.json`）**全部已跟踪**，`build/scene.bin` 因 owner 是 `build` 被扫描器跳过 → **would-flag = 0**。
