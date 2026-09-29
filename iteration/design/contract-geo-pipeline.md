# 契约 · Geo 管线（投影 / `worldGrid` / `valueKind` / 格定义）

> **性质：下游契约，不是设计决策。** 父文档是 [`design-core.md`](design-core.md)（§8.1 决断、§8.2.1 四线调研）；实现级常量见 [`appendix-visual-and-ui-spec.md`](appendix-visual-and-ui-spec.md)（§1.1 网格/比例/投影、§1.3 图层栈）。
> **唯一权威实现**：[`world-grid.mjs`](../../docs/handOff/dsh-bundle-tourguide-2.5d/tools/world-grid.mjs)。本文每一条都有对应机械断言（A1–A12），判定命令：
> ```bash
> node docs/handOff/dsh-bundle-tourguide-2.5d/tools/world-grid.mjs
> ```
> **作者**：`city-data-architect`（共享任务 `task-1`）。
> **状态**：五条**已冻结**。**原点数值未冻结**（GAP-1）——在那之前可以投影、可以跑测试夹具，**不可以烘焙任何真实几何**：`buildWorldGrid()` 会直接抛 `OriginNotFrozenError`。

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

`coefficientLatitudeDeg` 是**系数求值纬度**，不是原点纬度。原点 (λ₀, φ₀) 是"段起点"，见 GAP-1。

**为什么是这个数**：这两个系数就是 WGS84 椭球在 35.0055°N 处的每度经/纬米数。断言 A4 用两条独立路径核对——精确闭式 `(π/180)·N(φ)·cos φ`（N 为卯酉圈曲率半径）与常用的截断级数（两者互相吻合到 0.032 m/度，所以任一条都可以当另一条的对照）——实测**冻结值与闭式相差 0.0891 m/度**，折算到整条走廊是 **1.952 mm**（纬向 0.009 mm），**比 1 m 的验收线宽约 512 倍**。

**EPSG:3857 被禁止，理由是数**：`cos(35.0055°) = 0.8190969811`，所以 1 个真实地面米 = `1/cos = 1.2208566544` 个"3857 米"。断言 A6 实测：

- 整条 2 km 走廊在 3857 里需要 **2,441.7 格**，而 `wTiles = 2000` → **441.7 格溢出**；
- 一条 **3.5 m 车道变成 4.273 格**（+0.773 格 = **+22.09%**）。

**反例**：有人用 `proj4('EPSG:4326','EPSG:3857')` 换掉投影，理由是"3857 就是米、而且是标准"。因为栅格化器对越窗要素**拒绝而不夹紧**（条款三），2,441.7 格中最后 **441.7 格（走廊东端约 442 m，即祇園那一头）整段不会出现在地面栅格里**——不是画歪，是**没有**。同一段路在攻略里报成 4 分钟，在 3857 下变成 **4.9 分钟**。

**谁会发现**：先是渲染 / 关卡（碰撞盒与地面互相错位、道具浮空）；再是内容（`1.2 格·s⁻¹` 推出的步行时间与实测对不上）；如果漏到攻略，就是站在四条通上的读者。**注意这个错误在整条走廊上是常数**：`1/cos φ` 在 ±20 m 纬度带内的变化是 **2.7×10⁻⁶**，所以逐个街区的目视检查只会说"嗯，好像略宽"，永远抓不到它。A6 会在 CI 里先喊。

---

## 2. 条款二 · `worldGrid` 常量写死

**冻结内容**：

```js
worldGrid = { wTiles: 2000, hTiles: 40, blockSize: 40 }   // 深冻结，改写抛错（A1）
```

派生量（`GRID`，同样冻结，且 A2 断言它们必须从 `worldGrid` 算出来，手改会被抓）：

| 量 | 值 | 来源 |
|---|---|---|
| 走廊 | **2,000 m × 40 m** | `wTiles · 1 m` / `hTiles · 1 m` |
| 格数 | **80,000** | 2000 × 40 |
| 街区 | **50 个并排 × 1 个深** | 2000/40 = 50，40/40 = 1 |
| 一格 | 32×32 px | 附录 §1.1 |
| 地面层 | **64,000 × 1,280 px = 81.92 Mpx = 327.68 MB（312.5 MiB）RGBA** | A2 实测 |

**"1 格 = 1 m" 与 "40×40 格 = 一个街区" 是两个不同的量**，此前被混用。2 km 走廊 = **80,000 格 = 50 个街区并排**，不是一张 1280×1280 的 tilemap（1280×1280 是**单个 40 m 街区**的像素尺寸）。

**反例 A（单位混用）**：有人把 `blockSize: 40` 读成"世界就是 40 格"，做出一张 1280×1280 px 的地面层。那是 40×40 = **1,600 格 = 全部世界的 1/50**；2 km 步行被截成 40 m。**谁会发现**：玩家，30 秒内；在那之前是行程校验器——12 扇门要落在 2 km 上，而一个街区只有 26 个店面模块、12 个可进入（46%），物理上塞不进 40 m。

**反例 B（像素量级）**：有人按"1280×1280"申请地面层纹理，实际需要 64,000×1,280 px。**50 倍欠分配**，做到第 50 个街区时炸掉。

**反例 C（纹理上限，留给渲染方拍板）**：64,000 px 宽超过常见桌面 GPU 的 16,384 px 上限 → 地面层**必须分块**，`ceil(64000/16384) = 4` 块横排。附录 §1.3 lane 0 写的是"上限 4096² 格"，而 4096 格 × 32 px = 131,072 px 作为单张纹理不成立；若按 4096 **px**（= 128 格）读，则需要 `ceil(2000/128) = 16` 块。**4 与 16 是同一个句子的两种读法**——这是渲染方的决定，但必须显式写死，否则各写各的。

---

## 3. 条款三 · 格定义 = 坐标定义，不是缩放选项

**冻结内容**：

```
tileX = floor(x_m)        tileY = floor(y_m)
```

"1 格 = 1 m" 是**坐标定义**。窗口是**半开**的：

```
tileX ∈ [0, 2000)         row = tileY + 20 ∈ [0, 40)      // y_m ∈ [−20, +20)
```

街心线是 `tileY = 0`，所以走廊跨 `tileY ∈ [−20, +20)`，存储行号 = `tileY + 20`。**这个偏移是存储细节，不是坐标定义的一部分。**

**规范化坐标是整数 1/16 子格，不是浮点**：`tileFromSub(sub) = floor(sub/16)`。浮点的 `floor(x_m)` 只作为**参考判据**存在（`referenceTileFromMetres`）——A3 在 1,134 个采样点（含两符号的近边界区，这是关键：粗扫永远扫不到那里，断言会**空洞地通过**）上实测出 **315 处分歧，最远 0.031250 m**，即分歧**恰好只发生在距格边界 1/32 m 以内**，且**规定分歧时以整数子格为准**。窗口判定跑在规范化坐标上，于是每条边的**有效内缩**是精确的两个数（A11 实测）：

| 现象 | 精确值 |
|---|---|
| 最外侧**可表示**的规范化位置 | 1,999.9375 m（内缩 **62.50 mm**） |
| **拒绝阈值**（超过即拒） | 1,999.96875 m（内缩 **31.25 mm**） |
| 实测 | 输入 21,909 µ度 = 1,999.901 m **收**；21,910 µ度 = 1,999.992 m **拒** |

越窗要素**一律拒绝、绝不夹紧**（"drop, don't correct"）。南边缘 `y_m = −20 m` 正好落在 row 0，北边缘 `+20 m` 落在窗口外——这是半开区间的正常后果，不是 bug。

**反例 A（把格当缩放）**：有人把"1 格 = 1 m"实现成 zoom 2 下"1 格 = 0.5 m"（视口 640×360 px / 32 px = 20 格，看起来"更细"）。碰撞盒 **24×16 px** 变成 0.375 m 宽，玩家直接穿过门框；进门判定"距门锚点 ≤1.5 格（48 px）"变成 ≤0.75 m，于是**没有一扇门进得去**。最坏的地方在于：单元测试全绿——它们用米，不用格。**谁会发现**：走完 2 km 发现 0 个室内的测试者；若没有这一步，就是玩家。

**反例 B（trunc 而不是 floor）**：有人写 `Math.trunc(x_m)`，理由是"负数取整更直观"。`trunc(−0.4) = 0`，而 `floor(−0.4) = −1`。走廊南半（`y_m < 0`）的 `tileY = −1` 与 `0` 会**塌进同一行**：40 行的走廊变 39 行，`row = tileY + 20` 在南边缘取到 −1，第一行地面静默读到第 20 行的数据（越界读）或直接抛错。A3 显式钉住 `floor(−0.4) = −1`。

---

## 4. 条款四 · `valueKind` 枚举，以及"已验证"栏位的准入门

**冻结内容**：

```js
VALUE_KIND = { OBSERVED: 'observed', LICENCED: 'licenced', ABSTRACT: 'abstract' }
GUIDE_VERIFIED_COLUMN_ALLOWED = ['observed']
```

语义：

| 值 | 含义 | 本仓库的实例 |
|---|---|---|
| `observed` | **人打开来源并读到了这个值** | 亲自核过的营业时间、坐标 |
| `licenced` | 许可 / 授权派生的**模板或默认值** | 道路宽度——本段 OSM `width` 覆盖率仅 **2.7%** |
| `abstract` | 模型派生的**抽象值** | PLATEAU LOD1 抽象高度——`building:levels` 仅 **8.6%** |

**这一维不是置信度，是来源类别。** 不要把它变成打分，也不要给它加权：agent 自评不可机械校验，加权会把"每行都有可核来源"这条铁律稀释掉。玩家侧的三态（`✅ 亲自到过` / `📖 读过来源` / `⚠️ 待确认`）描述的是**玩家做了什么**，与 `valueKind` 正交——**玩家状态不能提升值的等级**：

| 玩家状态 × `valueKind` | 攻略"已验证"栏 |
|---|---|
| 亲自到过 × `observed` | ✅ 允许 |
| 亲自到过 × `licenced` | ❌ **禁止**（"到过"会给一个模板背书） |
| 亲自到过 × `abstract` | ❌ **禁止**（"到过"会给一个抽象高度背书） |
| 读过来源 × `observed` | ✅ 允许 |
| 任意 × `abstract` | ❌ 永不进"已验证" |

`licenced` / `abstract` 不是"不能用"——它们可以渲染、可以参与几何，但**要么从攻略里去掉，要么换一个显式标签**（如「按类别模板推算」「模型抽象高度」）。第三条路（静默提升为已验证）是禁止的。

**反例 A（高度）**：有人把 PLATEAU LOD1 高度并到 1,212 个建筑 way 上，并让合并行继承附近策展地点的 `✅ 亲自到过`。攻略于是印出一个**没有任何来源陈述过**的建筑高度：LOD1 是从航拍影像挤出的抽象体块，不是测绘高度。**谁会发现**：读者数楼层，发现攻略说 4 层、实际 6 层。

**反例 B（路宽）**：构造时 `width` 只覆盖 2.7%，于是回落到按类别的授权模板，写进同一个字段且**不带 `valueKind`**。结果：攻略"已验证"栏里 **97.3% 的路宽是模板**，与那 2.7% 实测值完全无法区分；依赖路宽的招牌位置（"退到路缘后 1.0 m"）与 12 扇门的门洞全部对一个**类别平均值**定位。**谁会发现**：验证守门人查不出哪一行是实测（字段里没信息），直到有人站在门口发现招牌悬在车道上方。

**反例 C（枚举本身）**：有人把 `licenced` "修正"成美式拼写 `licensed`。A9 显式拒绝 `licensed` 与 `Licenced`。这是**故意设计成大声失败**的：出事故时最自然的"修复"是把这些行改标成 `observed`——那才是真正的灾难，而校验器会先拦住拼写这一步。

---

## 5. 条款五 · 两个坐标系统不混用

**冻结内容**：

| 层 | 单位 | 存什么 |
|---|---|---|
| 地理 / 溯源（**仅事实层**） | **整数微度**（µ度） | `lonMicro`、`latMicro`；非整数直接抛 `NonIntegerCoordinateError` |
| 世界 / 游玩 | **整数格 + 1/16 子格** | `subX = round(x_m · 16)`；格 = `floor(sub/16)` |

浮点只出现在构建期转换里一次。精确地说，**每个点 6 次浮点运算**（每轴：转度、乘系数、乘 16），随后立即 `round` 成整数；**浮点从不被存储、累加或比较**。确定性不靠"相信浮点稳定"，靠 A8 断言：同输入两次 → 逐字节相同；两个**独立 node 进程** → 同一个 sha256。

**这里有一个必须写明的真相**（A7 实测，此前无人算过）：

| 精度 | 数值 |
|---|---|
| 1/16 子格 | **62.5 mm** |
| 事实层 1 µ度（经向） | **91.28 mm** |
| 事实层 1 µ度（纬向） | **110.94 mm** |
| 投影模型在走廊远端自身误差 | **313.9 mm** |

**事实层比子格粗 1.46 倍**——所以"1/16 子格"**不能**从事实层坐标产生，它只能来自手作内容或运行时移动。任何"攻略坐标精确到 6 cm"的说法都是假的：事实层自己的分辨率就是 9.1 cm（东西）/ 11.1 cm（南北）。子格是**量化栅格**，不是精度声明。

**反例 A（把投影米数写进事实层）**：有人"为了客户端不用投影"，把 `x_m` 浮点存进 `places.json`。此后事实层的坐标**依赖投影常量**：将来重切走廊（换原点）时 µ度仍然正确，而存下来的米数整体平移——因为两者只差一个常数偏移，原点附近**看起来一切正常**。更糟的是 JSON 浮点往返会变成不同文本（`0.30000000000000004`），于是 `pack.json` 的内容哈希在两次**完全相同**的构建之间改变，所有缓存键失效。**谁会发现**：先是验证守门人（数据没变但内容哈希变了），再是客户端工程师（离线包每次构建都重下）。

**反例 B（存档用浮点）**：实体位置存成 `x_m = 1234.567`。存档要按字节比较才能证明"同一次游玩可复现"，而浮点文本会随平台的乘加实现漂移。存整数子格（`19753`）则天然可移植。

---

## 6. 验收证据（真实输出，非描述）

`node tools/world-grid.mjs`（cwd = `docs/handOff/dsh-bundle-tourguide-2.5d`，node v26.8.2）：

```
S1 geo-pipeline contract — executable assertions
node v26.8.2  ·  2000x40 tiles @ 1 m (80000 tiles = 50 blocks)  ·  origin=GAP-1 (not frozen)

A1   PASS  clause 1+2 — constants are frozen literals
          deepFrozen=true mutationThrew=true wTiles=2000 lon=91282.15 lat=110940.65
A2   PASS  clause 2 — worldGrid tiles exactly into 2 km / 40 m
          2000x40 tiles = 80000 tiles = 50 blocks x 1 block = 80000 tiles; corridor = 2000 m x 40 m; ground layer 64000x1280 px = 81.92 Mpx = 312.5 MiB RGBA (pixelOk=true)
A3   PASS  clause 3 — tileX = floor(x_m), canonical on the sub-tile
          definition cases ok=true (incl. floor(-0.4)=-1); canonical path agrees on 6 mid-tile cases=true; near-boundary sweep over 1134 samples found 315 disagreements, worst 0.031250 m from a boundary (bound 0.03125, unexplained=0)
A4   PASS  clause 1 — frozen coefficients == WGS84 ground truth, error < 1 m
          exact lon=91282.0609 lat=110940.6752 m/deg; series lon=91282.0289 lat=110940.6529 (agree=true); frozen-exact: lon 0.0891 m/deg -> 1.952 mm over 2000 m, lat -0.0252 m/deg -> 0.009 mm over 40 m; tangent-plane sagitta 0.3139 m
A5   PASS  clause 1 — coefficient latitude sensitivity is immaterial
          d(lonCoef)/d(phi)=1110.7 m/deg per deg; +-0.0017 deg -> 41.37 mm over 2000 m (bound 100 mm)
A6   PASS  clause 1 — Web Mercator overstates ground by >20%, so it cannot land in the grid
          cos(35.0055 deg)=0.8190969811; inflation=+22.086%; corridor would need 2441.7 tiles vs wTiles=2000 (441.7 tiles overhang); a 3.5 m lane becomes 4.273 tiles (0.773 tiles = 22.09% too wide)
A7   PASS  clause 5 — sub-tile, microdegree and model error are three different numbers
          1/16 sub-tile=62.5 mm; fact-layer 1 uDeg=91.28 mm lon / 110.94 mm lat -> the fact layer is 1.46x COARSER than the sub-tile, so sub-tile positions are not addressable from fact-layer input; model error at the far end=313.9 mm (5.0x coarser than the sub-tile)
A8   PASS  acceptance — same input twice yields a byte-identical grid
          sha256 A=D5732ED6F9F94EE56060E8B3DB56AEF4B4CFBA3045F251D9465EB1320E8B8E62 B=D5732ED6F9F94EE56060E8B3DB56AEF4B4CFBA3045F251D9465EB1320E8B8E62 identical=true; 80000 bytes, drawn=3, rejected=0, setTiles=3614
A8b  PASS  acceptance — grid is independent of feature order
          sha256=D5732ED6F9F94EE56060E8B3DB56AEF4B4CFBA3045F251D9465EB1320E8B8E62
A8c  PASS  acceptance — rasteriser is direction-invariant (OSM way order is not stable)
          reversed-vertex sha256=D5732ED6F9F94EE56060E8B3DB56AEF4B4CFBA3045F251D9465EB1320E8B8E62 identical=true
A9   PASS  clause 4 — valueKind enum frozen; only `observed` reaches the guide
          kinds=[observed, licenced, abstract]; 'licensed' rejected=true; guide verified column allows [observed]
A10  PASS  clause 5 — fact-layer coords are integer microdegrees; grid needs a frozen origin
          float coordinate rejected=true; origin gate missing:gated unfrozen:gated null-island:gated
A11  PASS  clause 3 — half-open window x[0,2000) row[0,40); overflow rejected, never clamped
          drawn=2 rejected=3 (2500 m east, 2000 m edge, y=+25 m dropped); canonical inset=62.50 mm, rejection threshold inset=31.25 mm; last accepted input=21909 uDeg (=1999.901 m, in=true), next uDeg=21910 (=1999.992 m, in=false); sub 31999 in=true, sub 32000 in=false; row: y=-20 m -> row 0, y=+20 m -> out=true
A12  PASS  clause 2 — measured slice reconciles with the frozen corridor
          bbox lng 135.759..135.7788 -> 1807.39 m of the 2000 m corridor (shortfall 192.61 m, unmeasured); lat band 177.51 m = +-88.75 m vs corridor +-20 m (superset=true); counts 1212 ways / 104 with building:levels = 8.58% (file says 8.6%, consistent=true); 10 entrance nodes, 193 shop nodes; fetched 2026-09-29T14:54:12Z

14/14 assertions passed, 0 failed
fixture grid sha256=D5732ED6F9F94EE56060E8B3DB56AEF4B4CFBA3045F251D9465EB1320E8B8E62  setTiles=3614  bytes=80000
```

**跨进程幂等**（两次独立 node 调用，`--hash`）：

```
payloadsha256=D5732ED6F9F94EE56060E8B3DB56AEF4B4CFBA3045F251D9465EB1320E8B8E62 setTiles=3614 bytes=80000
payloadsha256=D5732ED6F9F94EE56060E8B3DB56AEF4B4CFBA3045F251D9465EB1320E8B8E62 setTiles=3614 bytes=80000
```

**可 import**（另一进程动态 import，且**不触发 CLI 输出**）：

```
exports=30
worldGrid={"wTiles":2000,"hTiles":40,"blockSize":40} frozen=true
PROJECTION=local-tangent-equirectangular 91282.15 110940.65
GRID.groundPxTotal=81920000
VALUE_KINDS=observed|licenced|abstract
guideVerifiedAllows=["observed"]
```

**cwd 无关**：从仓库根跑 `node docs/handOff/dsh-bundle-tourguide-2.5d/tools/world-grid.mjs --json` → `"passed": 14, "failed": 0, "skipped": 0`。

> **测试夹具不是地理数据。** A8 的输入是 `buildFixtureLines()` 生成的合成夹具：一条 2,000 顶点、1 m 间距、±0.22 m 确定性摆动的脊线 + 一条 5 m 横枝 + 一条 8 m 侧枝，**以原点相对偏移表达**，因此整条管线在没有京都坐标的情况下也能被完整检验。它**不是**四条通线形，**不得**当作几何发货。
> **未覆盖**：A12 的 SKIP 分支（`archive/` 不在包内时）在本环境未被执行——该文件存在。

---

## 7. 缺口（GAP）——不得用"看起来合理的数"填

| # | 缺口 | 影响 | 谁来关 |
|---|---|---|---|
| **GAP-1** | **原点 (λ₀, φ₀) 数值未冻结。** `design-core.md` §8.3 D1b（在 8.3 km 上截哪一段）状态仍是"待用户确认"；契约只能冻结**原点协议**（整数微度、单一来源、来自实测段起点），不能冻结**数值**。 | **阻塞一切真实构建**。`buildWorldGrid()` 拒绝 `status !== 'frozen'`，也拒绝 `(0,0)` 占位原点（A10 实测三态全被拦）。 | Lead / 用户裁定 D1b → 再跑一次 `measure-kyoto-blocks.mjs` |
| **GAP-2** | **实测切片填不满冻结走廊。** 记录 bbox `lng 135.7590..135.7788`，在冻结系数下 = **1,807.39 m**，而 `wTiles = 2000` → **东端 192.61 m 无实测数据**（A12 实测）。 | 走廊东段（祇園方向）目前没有任何几何依据 | 冻结原点后重测；见 §8 建议 |
| **GAP-3** | **实测切片的口径与文档不符**（两处，详见 §8.2） | `8.6%` 是**整带**建筑计数，不是"临街立面"计数；`±45 m` 实为 `±88.75 m` | 重测时一并修正 |
| **GAP-4** | **`licenced` 路宽模板没有指名来源。** 已知 OSM `width` 覆盖 2.7%（附录 §7 备注 ⑧），但模板本身取自哪份权威（道路構造令 / MLIT）未定。 | `licenced` 行无法回答"玩家凭什么相信它"，且其许可基础决定派生行是否带 ODbL 义务 | `city-data-architect` + Lead |
| **GAP-5** | **PLATEAU Site Policy 逐条原文未取到。** `design-core.md` §8.2.1 ③ 已自标此缺口；本机 `_plateau.json` 只有数据集元数据（`license_id: "plateau"`、`license_url: https://www.mlit.go.jp/plateau/site-policy/`、描述句「商用利用も含め、どなたでも無償で自由にご利用いただけます」），**不是**政策正文。 | `abstract` 高度目前只能内部使用，**不可发布** | 发布前必须补取（官网是 JS 壳） |
| **GAP-6** | **ODbL 派生行未做文件隔离。** 角色纪律要求"开放数据库派生的行单独成文件并以相同许可发布"；`.pmtiles` 烘焙后丢弃（`design-core.md` §8.2.1 ②）解决的是**发行物**，但 `places.json` 里源自 OSM 的整数微度行仍是 Derivative Database 候选。 | 许可传染可能波及自有数据表与图集 | 需在 `city-packs/` 定名一份 `*-odbl.json` 约定 |
| **GAP-7** | **无校验器执行"已验证"栏规则。** [`validate-city-pack.mjs`](../../docs/handOff/dsh-bundle-tourguide-2.5d/tools/validate-city-pack.mjs) 查的是来源**存在性**，不查 `valueKind`（该文件里有 `(0,0)` 占位坐标检查，可与本契约对齐）。 | 条款四是**声明**，还不是**门** | 见 §8 需外部改动 |

---

## 8. 需要契约外的人做的改动（我不动这些文件）

**8.1 与文档不符的三处（建议 Lead 裁定后修正，我不改父文档 / 任务卡）**

1. **任务卡写 `cos(35.0055°) = 0.8192`，实测是 `0.8190969811`，四位小数是 `0.8191`。**（此值**不在** `design-core.md` 或附录里，只在任务卡中。）结论不受影响（22.086% vs 22.070%，都归到"22%"），但**字面量应当修正**，否则下一个人会拿 `0.8192` 反推出一个约 34.995° 的纬度。A4/A6 用的都是实算值。
2. **附录 §1.3 lane 0 写"上限 4096² 格而本项目只用 40²"。**"40²" = 1,600 格只是**手作街区**那一层；走廊需要 **80,000 格**。这正是 `design-core.md` §8.2.1 ⑤ 警告的"两个量被混用"，而它**仍然留在附录里**。另外"4096² **格**"作为单张纹理不成立（4096 格 × 32 px = 131,072 px），疑为 4096² **px**。
3. **附录 §1.1"RGBA 原始 = 312.5 MB"单位实为 MiB**：81.92 Mpx × 4 B = 327,680,000 B = 327.68 MB = **312.5 MiB**。分配纹理时不区分会在 4.8% 上出错。

**8.2 `measure-kyoto-blocks.mjs` 的两处口径问题（该文件不在我的写入范围）**

- 文件头声明测的是"**street-fronting** building footprints"，但查询是整 bbox 的 `way["building"]`——**没有临街过滤**。所以 `8.6%` 是"带内全部建筑"的有值率，不是"临街立面"的有值率。结论方向不变（PLATEAU 仍必需），但数字的含义必须改写。
- 同一个 bbox 有三个互相矛盾的口径标签：脚本头注释写"axis ±60 m"、行内注释写"~±45 m in latitude"、摘要 JSON 写"axis ±45 m"，而实算是 **±88.75 m**（0.0016° × 110940.65 = 177.51 m）。A12 断言这个带是走廊的**超集**（±88.75 m ≫ ±20 m），所以不阻塞——但标签必须修。

**8.3 需要 Lead 处理的两件事（文件不在我的写入范围）**

- `docs/handOff/dsh-bundle-tourguide-2.5d/package.json`：把 `"./world-grid": "./tools/world-grid.mjs"` 加进 `exports`，并考虑加一条 `"check:geo": "node tools/world-grid.mjs"`；契约条款二要求这个常量"进 CI"，目前**尚未接线**。
- `validate-city-pack.mjs`：加一条 `valueKind` 校验（枚举合法 + "已验证"栏准入），把条款四从声明变成门。

---

## 9. 本契约**不**覆盖什么

- **纵向比例**（θ = 70.53°、米 × 10.67 px、带 1–6 的立面预算）是渲染常量，与地面网格无关。**`abstract` 高度不得被换算成格**。
- **`.pmtiles` → `ground.png` / `collision.png` / `heights.png` / `scene.bin` 的烘焙流程**（§8.2.1 ②）——本契约只固定这些产物必须遵守的坐标与格定义。
- **`pack.json` / `places.json` / `transit.json` 的字段 schema**——那在 `validate-city-pack.mjs` 与技能 `tourguide-fact-integrity` 的范围。
- **字形普查的两个口径**（450 加权 vs 1,566 按串计数，§8.2.1）——招牌层的事。

---

## 10. 变更规程

改动 `worldGrid` / `PROJECTION` / `VALUE_KIND` 的任何一个字面量，**不是改 config，是改契约**：

1. 先改 [`world-grid.mjs`](../../docs/handOff/dsh-bundle-tourguide-2.5d/tools/world-grid.mjs) 的字面量，并**同步改上面对应的派生量与断言**（A2 会抓出手改不一致）；
2. 跑 `node tools/world-grid.mjs`，它必须回到 `N/N passed, 0 failed`；
3. 任何**已烘焙**的栅格一律作废重烘——不存在"只改一格"的迁移；
4. 在本文档 §6 重新粘贴真实输出，并在 §7 说明受影响的 GAP。

**A8 是这条规程的执行者**：任何一次改动都会改变那个 `sha256`。哈希不变 = 没改到实质；哈希变了 = 必须有人签字。
