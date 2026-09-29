# 契约 · 导出层（游玩 → 路线攻略）

> **性质：下游契约，不是设计决策。** 父文档是 [`design-core.md`](design-core.md)（§3 真实性、§5 攻略即产品界面、§8.2.1 决断、§8.2.2 多语言导出边界）；投影 / 网格 / `valueKind` 由 [`contract-geo-pipeline.md`](contract-geo-pipeline.md) 冻结，本文**不重述它们的任何字面量**。
> **唯一权威实现**：[`../tools/emit-guide.mjs`](../tools/emit-guide.mjs)（发射）+ [`../tools/validate-guide.mjs`](../tools/validate-guide.mjs)（断言）。
> **作者**：`export-guard`（共享任务 `task-16`）。
> **状态**：v1 落盘。**多语言只留结构**（§7），出口只有一种语言。
> **产物**：`build/guide.md`（人读）+ `build/guide.json`（机读）+ `build/guide.html`（导出边界断言用）。`build/` 被 `.gitignore:86` 排除，所以烘焙产物不会变成被跟踪的仓库内容。

---

## 0. 这份契约解决什么

**在 task-16 之前，仓库能产出场景二进制与一份校验过的事实表，但产不出一条路线。** 导出边界断言（`assert-export-boundary.mjs`，task-4）守着一扇门，门后没有东西。

本文冻结"门后那个东西"的形状，并规定**它凭什么可信**。核心是一句话：

> **攻略里每个值都必须能回指事实层的一个值；回指不到，它就只能以缺口的形式出现。**

### 0.1 三个必须分开的东西

C6（pack.json `contradictions`）记过一个真实的混淆：技能文档写 `places.json [{ lat, lng }]`，而契约 §5 冻结的是 `latUdeg / lonUdeg`。导出层踩同一个坑会更贵，所以先分清：

| 名字 | 是什么 | 谁产生 |
|---|---|---|
| `latUdeg` / `lonUdeg` | 事实层坐标，**整数微度**，权威 | `places.json` |
| `lat` / `lng` | 同一个值的十进制表示，`coordinateSystem.compatFields` 明说它是**派生**、不是独立值 | `places.json`（派生字段） |
| `x_m` / `y_m` | 投影到冻结原点的米数，**只出现在构建期** | `world-grid.mjs` 的 `projectMicroDeg` |

**攻略不得打印 `x_m` 当坐标。** 契约 §5 反例 A 记的就是这个：把米数存进事实层会让重切走廊时整体平移，而 µ度仍然正确。`x_m` 在攻略里的唯一用途是**排序与人类可读的里程**，且必须标成"自本段起点的沿街里程"而不是"位置"。

---

## 1. 路由从哪来（一个必须写明的决定）

**事实层里没有"行程"。** `places.json`（22 地点）、`transit.json`（9 段）、`doors.json`（12 门）都是事实与几何；`pack.json` 里没有 itinerary / routePlan / walkOrder 字段（已搜过：`iteration/design/*.md`、`pack.json`、`iteration/tools/*.mjs` 全部零命中）。

按 `design-core.md` §4，行程应该是 ③ ITIN 层从**玩家动作日志**推导的结构化 `GuideDoc`。**本次没有玩家动作日志**——那需要游戏跑起来，而 Gate 1 尚未开始。

所以发射器**不编造一次游玩**。它做的是设计里"一键生成"那句话字面意义上的事：

> **以冻结的 `ORIGIN` 为起点，沿 `四条通` 走完 `transit.json` 那条已策展的链，在每个链端点输出一个停留点。**

| 决定 | 值 | 理由 |
|---|---|---|
| 路由来源 | `transit.json` 的 9 段**策展链**（按 x 与拓扑连续性排序） | 链是策展产物，每段带 `source_url` + `valueKind`。**不从坐标现算一条"最优路线"**——那是另一个产品的工作量（design-core §5：不做全网算路） |
| 起点 | 链的**最西端点** | 与冻结原点同向，读者的里程从 0 开始增长 |
| 支线 | 主链之外的 leg（L07/L08/L09）作为**支线**列出，不改主链顺序 | L07/L08 是"从车站到建仁寺"的替代入口，L09 是主链末端的延伸 |
| 没有 leg 连接的站点对 | **缺口**，不补 | 见 §4 |

**一句话：路线是事实层链的确定性投影，不是推荐。** 攻略里不得出现"推荐""最佳""必去"这类词——那是策展判断，不是事实。

---

## 2. `guide.json` 结构（v1）

```jsonc
{
  "schema": "tourguide.guide/v1",
  "city": { "cityId": "kyoto-shijo", "nameLocal": "…", "nameEn": "…",
            "country": "JP", "timeZone": "Asia/Tokyo", "currency": "JPY" },
  "language": { "export": "zh-Hans", "available": ["zh-Hans"],
                "placeNameFields": ["nameZh", "nameJa", "nameEn"],
                "structureNote": "…" },          // §7
  "inputs": {                                    // 每个输入带 sha256
    "factLayer": [ { "path": "city-packs/kyoto-shijo/places.json", "sha256": "…" }, … ],
    "scene": { "path": "build/scene.bin", "sha256": "…", "bytes": 393979,
               "contractHash": "…", "grid": { "wTiles": 1600, "hTiles": 40 } },
    "contract": { "fingerprint": "…", "source": "world-grid.mjs" }
  },
  "route": {
    "derivation": "…",                          // §1 的机械描述
    "legs": [ {
      "legId": "L02", "mode": "walk",
      "from": "kyoto-shijo-bus-shijo-takakura-A", "to": "…-kawaramachi-E",
      "fromNameJa": "…", "toNameJa": "…",
      "values": [ { "field": "minutes", "value": 7, "unit": "min",
                    "valueKind": "licenced", "labelJa": "規約定数（80 m/分）から算出",
                    "verifiedColumn": false, "sourceUrl": "…", "derivation": "…" } ]
    } ]
  },
  "stops": [ {
    "seq": 1, "placeId": "…", "nameJa": "…", "nameZh": "…",
    "category": "…", "factTier": "static",
    "alongStreetM": 173.98,                     // 见 §3.2：这是里程，不是坐标
    "inSceneWindow": true,                      // 见 §3.2
    "verified": [ … ],                          // 只能用 observed
    "otherKinds": [ … ]                         // 其余，每项带自己的 kind
  } ],
  "branchLegs": [ … ],
  "fares": { … },                               // §5，D-31
  "gaps": [ { "gapId": "...", "kind": "...", "scope": "...",
              "statementJa": "...", "count": 78, "valueKind": "abstract",
              "why": "…", "sourceUrl": "…" } ],
  "licences": { … },                            // §6
  "summary": { "placeCount": …, "legCount": …, "valueCounts": { "observed": …, "parsed": …, … },
               "verifiedColumnCount": …, "gapCount": …, "fares": { "computedFromDistance": 0 } }
}
```

### 2.1 每个值都是一个 cell

**"值"是一条 `{field, value, valueKind, verifiedColumn}`。** 不是"一行地点"，也不是"一个字段名"。

这是本契约最容易做错的地方，所以定死：`valueCounts` 统计的是 **cell 数**，且每个 cell 恰好属于一个 `valueKind`。这样一个 cell 的分布可以被机械核对，而"22 个地点都是 observed"这种说法掩盖了"其中 2 个地点的某个字段不是 observed"。

---

## 3. 条款一 · `valueKind` 逐值透传，"已验证"栏只放 `observed`

### 3.1 闸门是 import 来的，不是抄来的

```js
import { GUIDE_VERIFIED_COLUMN_ALLOWED, mayAppearInGuideVerifiedColumn } from '…/world-grid.mjs';
```

**本契约不写 `['observed']` 这个数组。** 发射器与校验器都只能通过 import 得到它。理由与 `validate-city-pack-v2.mjs:61-67` 相同：抄一份就会与契约各自漂移，而 A9b 的存在正是为了拦住"加一个枚举成员顺手把闸门放宽"。

`contract sha256` 由 `contractFingerprint()` 给出，写进 `inputs.contract.fingerprint`；发射器**断言它等于 import 到的值**，所以攻略与它依据的契约版本绑在一起。

### 3.2 三个布尔/数值字段的语义

| 字段 | 含义 | 不得混淆为 |
|---|---|---|
| `verifiedColumn` | 该 cell 是否**允许**印在"已验证"栏。**由 `mayAppearInGuideVerifiedColumn(cell.valueKind)` 计算**，不得手写 | 不能理解为"这个值对"或"这个值重要" |
| `alongStreetM` | 该地点投影到冻结原点的 **x_m**，即"自本段起点沿四条通的距离" | **不是坐标**（§0.1） |
| `inSceneWindow` | 该地点是否落在 `scene.bin` 的冻结窗口 `x∈[0,1600) row∈[0,40)` 内 | 不是"这个地点值不值得去"，也不是"数据缺失" |

**`inSceneWindow: false` 是导出层的真实发现，必须显示。** 22 个地点里 **13 个在窗口外**——冻结核对的走廊只有 **40 m 宽**，而法观寺、清水寺、知恩院、八坂神社本殿都在数十到近千米之外。它们**必须**进攻略（读者要走过去），但**不可能**在 2.5D 场景里有几何。攻略对这类地点只能说"沿街走 X m 后转入"，**不得**打印一个场景内坐标。

### 3.3 "已验证"栏的准入是两道，不是一道

契约 §4 的准入是 `valueKind`；`places.json` 里还有第二道**逐记录**闸门 `provenance.guideVerifiedColumnAllowed`（22 条里 2 条为 `false`）。两条**同时**为真才允许进"已验证"栏：

```
verifiedColumn = mayAppearInGuideVerifiedColumn(cell.valueKind)   // 来自 import 的枚举闸门
              && record.provenance.guideVerifiedColumnAllowed === true   // 来自事实层的逐记录闸门
```

被第二道闸门拦下的两条，理由在事实层里已经写明，本层只透传：

| 记录 | `guideVerifiedColumnAllowed` | 原因（`guideGateNote` 原文要点） |
|---|---|---|
| `kyoto-shijo-crossing-karasuma-east` | `false` | `valueKindPerField.nameJa` 是策展人写的名字，OSM 上该对象没有 name 标签 |
| `kyoto-shijo-subway-shijo-exit1` | `false` | `valueKindPerField.nameZh` 是策展人写的名字，OSM 无对应标签 |

**注意这两条的 `provenance.valueKind` 都是 `observed`。** 所以"`valueKind === observed` ⇒ 进已验证栏"是错的，写成那样会印出两个没有来源的名字。**这是 GAP-7 的第二个实例**：事实层声明了闸门，但至今没有校验器执行它。

---

## 4. 条款二 · 缺失就是缺失

**攻略里不得省略缺口，也不得填默认值。** 每个缺口在 `gaps[]` 里有一条记录，且 `guide.md` 里有一个可见条目。缺口类别（`kind`）：

| `kind` | 来源 | 当前计数 |
|---|---|---|
| `unsourced-height` | `emit-scene` 的 `abstract` 建筑（`heightM: null`） | **78** |
| `no-running-time` | `pack.transit.gaps`：无站间所要时间/班距/初终电 | pack 的 8 条 + 0 条内部腿 |
| `no-bus-subway-leg` | 有运赁来源但无所要时间 ⇒ 不构成 leg | 见 `pack.transit.scopeNote` |
| `coordinate-unavailable` | `南座前`：**OSM 里不存在**，属"世界没有公布" | 1 |
| `leg-missing-between-stops` | 相邻停留点之间 `transit.json` 无 leg | 由发射器实测 |
| `scene-window-outside` | 地点在 40 m 冻结走廊之外，无场景几何 | 13 |
| `dropped-leg` | `attestations/dropped-legs.json` | 当前 0 |
| `ungeoreferenced-place` | `attestations/ungeoreferenced-places.json` | 当前 0 |

**缺口的措辞有规则**（`pack.transit.gapWordingRule`）：必须明示是**"世界没有公布"**还是**"本包的来源范围内没有取得"**。这两句不能互换——前者要求换来源，后者要求再查一次。本层照抄该规则，不得自己造第三种说法。

**禁令**：`gaps[]` 里的 `statement` 不得出现"约""大约""估计"来修饰一个**本可以是确定值**的量。`南座前` 的"约徒歩5分"是**运营方自己写的**，可以引用，但必须原样带出处，且不得被换算成米。

---

## 5. 条款三 · 运赁只能查表（D-31）

**这是本任务最容易自信地做错的一步。**

`pack.transit.subwayZones.zoneIsNotGeographic` 原文：

> 地下鉄の「区」は事業者の運賃区分であって、地理的距離の関数ではない。
> **evidence**: 東西線 T13 烏丸御池（四条から 1 駅）と T01 六地蔵（4.6 km 離れている）が同じ 4 区であり、T01〜T07 の 9 km が 1 区に収まる。
> **consequence**: A zone may be LOOKED UP for a subway station pair. It may never be COMPUTED from coordinates or from distance **.**

`subwayZones.fareByZone` **同时携带 `kmUpTo`**（`1区 kmUpTo: 3 → 220 円`）。那个字段是这座陷阱的诱饵：它让"按距离算运赁"看起来是数据支持的。

### 5.1 本层的机械处置

1. **攻略里不出现任何由距离派生的运赁。** `validate-guide.mjs` 断言 `fares.computedFromDistance === 0`，并断言每个 `fares` 条目的 `basis` 是 `lookup`。
2. **`kmUpTo` 不进入 `guide.json`。** 不 import、不复制、不引用。它存在于事实层是它的记录，本层没有用途。
3. **能查到的照实打印**：`subwayZones.answerForThisPack` 说 `kyoto-shijo-subway-shijo-exit1 → 烏丸御池` 是 **1 区 / 大人 220 円 / 小児 110 円**，`fareIsNowSourced: true`。
4. **但 `priceableAsALeg: false`**，缺的是**终点地点记录**与**站间所要时间**，不是运赁。所以本层把 220 円作为**参考运赁**打印并显式标注它**不构成本包的 leg**，不把 220 円印在任何一段行程上。
5. **市バス 230 円**同理：`fareReference[0]` 有来源（`whyReferenceOnly` 说明缺的是所要时间），作为参考打印。
6. **不得出现运赁的推算值。** 若将来出现一个没有查表依据的运赁，校验器**失败**而不是警告（`validate-guide.mjs` 的 `FARE_NOT_LOOKED_UP`）。

---

## 6. 条款四 · 不引评价原文；只引日本官方开放文本

三条调研线（`iteration/recon/review-source-*.md`）的结论：**任何平台都不允许离线存储并永久再分发评价文本**。所以本层：

| 允许 | 禁止 |
|---|---|
| 事实层自带的 `nameJa` / `nameZh` / `nameEn` / `category` / `addressJa` | 任何平台的评价正文、评分、条数（含"5 条用户评价"这类表述） |
| `curatedLabelJa` / `curatedLabelEn`（事实层标注了 `labelProvenance` 的策展短标签） | 从平台上抄来的推荐语 |
| 缺口说明、里程、来源归属 | 由本层**新写**的任何景点描述 |

**本层不生成一个字的景点描述。** 如果将来要 `recommended_reason`，它只能取自日本官方开放文本（PDL 1.0 / CC BY 4.0，无 share-alike），并且**逐条带 `source_url`**。这一条是**禁令**，不是待办。

### 6.1 许可义务必须随攻略出门

`pack.licenceObligations` 规定了两项**必须随导出物传播**的归属：

- **ODbL 1.0**：`© OpenStreetMap contributors`，`kyoto-shijo-osm-places.json` 是 ODbL 派生文件；
- **CC BY 4.0（京都市）**：`licenceObligations.ccByAttributionJa` 是**逐字要求**的归属格式（京都 オープンデータ利用規約 (2)ア），且 `ccByNote` 明说：**凡是引用了 CSV 说明文本的地点，这个归属必须随导出的攻略一起走。**

本层把两者**逐字**写进 `guide.json.licences` 与 `guide.md` 的结尾，`validate-guide.mjs` 断言它们逐字存在（`LICENCE_ATTRIBUTION_MISSING`）。**这是合规项，不是装饰。**

---

## 7. 条款六 · 多语言边界（只留结构）

`design-core.md` §8.2.2 ② 要求考虑多语言导出边界。**本 v1 只出口一种语言（`zh-Hans`），但把结构留对**：

| 留了什么 | 具体 |
|---|---|
| `language.export` | 当前 `zh-Hans`；**单一出口** |
| `language.available` | 当前 `["zh-Hans"]`；加语言时**只加这一项**，不改数据结构 |
| `language.placeNameFields` | 取值顺序 `["nameZh","nameJa","nameEn"]`，**按地点逐字段降级**：`nameZh` 为空则用 `nameJa`，再空则 `nameEn`。降级**必须显示实际用了哪个字段**（`nameFieldUsed`），否则读者无法知道这是译名还是原名 |
| 原文一律并列 | `nameJa` **永远同时打印**，不因为出口是中文就丢掉原名——读者在街上看到的是日文招牌 |
| 不复用游戏字体的子集 | 附录 §4 的 `guide.woff2`（已学 ∪ 攻略所需）是**渲染层**的事；本层出的是 Markdown/JSON，不假设字形集 |

**没有做的**（如实记录，不是遗漏）：没有第二种出口语言；没有把 `nameZh` 缺失的地点译出来（那会是本层自造的名字，违反条款四）；`stateNoteJa` 等日文备注字段**只在日文出口**里出现，中文出口以缺口条目代替。

---

## 8. 条款五 · 确定性

**同一输入两次运行 ⇒ `guide.md` / `guide.json` 逐字节相同。**

实现手段（与 `emit-scene.mjs` 的 S3/S4 同源）：

- 所有集合在输出前**显式排序**，键序固定，不依赖对象插入顺序；
- 数字用固定小数位（里程 2 位），不用 `toLocaleString`；
- 不带时间戳、不带随机数、不带绝对路径（路径写**仓库相对**形式）；
- `guide.json` 用 `JSON.stringify(value, null, 2)` + 结尾换行；`guide.md` 用 `\n` 行尾（**不是** `\r\n`——`.gitattributes` 管仓库，不管产物，所以由代码保证）；
- 输入 sha256 写进 `inputs`，所以"输入变了"与"代码变了"可以从产物区分。

校验器跑两次并比较 sha256（**两次独立进程**，不是同进程跑两遍——同进程会掩盖模块级缓存）。

---

## 9. 与导出边界断言的关系（task-4 的接续）

[`assert-export-boundary.mjs`](../../docs/handOff/dsh-bundle-tourguide-2.5d/tools/assert-export-boundary.mjs) 要求在 HTML 导出上声明区域（`data-tgf`）与溯源（`data-prov` / `data-entity` / `data-time`）。

本层因此**额外**产出 `build/guide.html`：一个最小的 HTML 视图，每个 prose 元素都声明区域，每个事实值都在 `data-prov` 子树里，实体板声明 `data-entity`，时刻句声明 `data-time`。

**这把两边接起来了**：task-4 守的门后第一次有了东西，而且那东西**通过**了那道门。`validate-guide.mjs` 直接调用 `assert-export-boundary.mjs` 的函数并断言 `pass === true`。

> `build/guide.md` / `guide.json` 是人读与机读产物；`guide.html` 是**给边界断言吃的**。三者由同一次发射产生，所以不可能互相漂移。

---

## 10. 本契约**不**覆盖什么

- **`pack.json` / `places.json` / `transit.json` 的字段 schema** —— 在 `validate-city-pack-v2.mjs` 与技能 `tourguide-fact-integrity` 的范围；
- **12 扇门的未决**（D-24/D-25）—— 本层按现有 12 门导出，并**明确标注门是 `authored`**：门不是事实行（`pack.scope.doorsArePlaces: false`），位置无来源（`doors.json.provenance.whyNotObserved`）。攻略里门只作为"建筑有几个入口"出现，**不带门牌号、不进"已验证"栏**；
- **真实游玩日志 → GuideDoc** —— §1。做到那一步需要游戏先能玩；
- **深链接的 URL 形式与离线劣化** —— `pack.transit.gaps` 第 6 条明确说那是攻略层的设计，但本 v1 没有实现（如实记录）；
- **PDF / A5 折页 / 子集字体** —— 附录 §3b 的产物，需要渲染层。

---

## 10. 实测结果（真实输出，非描述）

`node iteration/tools/emit-guide.mjs`（2026-09-30，node v26.8.2）：

```
  scene     : build/scene.bin  404406 B  sha256 F3855B4E2DC9D596483F518E7086341F4E7327F9BFC688A692E67B713CB7C6DD
  contract  : F50E4144E5BBAD1D14F889C944BDFD58A7CD6681349411F67A6AB9B23BC422A9
  route     : longest simple path 地下鉄四条駅1番出入口 -> 清水寺 over the curated legs (8 of 9)
  stops on the main chain : 9 of 22 place records
  passed-alongside places : 13   accounted for: 22 of 22
  measured total          : 3530.07 m along 四条通
  outside 40 m window     : 6 of 9 chain stops, 7 of 13 passed-alongside
```

### 10.1 值分布（本项目首次测量）

| `valueKind` | cell 数 | 进"已验证"栏 |
|---|---|---|
| `observed` | **134** | 其中 **127** 进栏；**7** 被事实层的 `guideVerifiedColumnAllowed=false` 拦下 |
| `parsed` | **0** | 0（本层不消费场景高度） |
| `authored` | **2** | 0（12 扇门 → 2 条 `entrances` 计数） |
| `licenced` | **19** | 0（17 条规约算出的分钟数 + 其他） |
| `abstract` | **0** | 0 |
| **合计** | **155** | **127 进栏 / 28 在栏外** |

**校验器核对**：`sum(valueCounts) === cellCount === 155`；**进"已验证"栏的 127 个 cell 的 `valueKind` 全部是 `observed`**（G4）。

`licenced` 19 条的构成：`transit.json` 里 `minutesValueKind: "licenced"` 的分钟数（80 m/分规约算出，非观测）是主要来源——**这正是条款四存在的理由**：来源距离是 `observed`，而分钟数是常数算出来的，两者在同一条 leg 上，不能混成一列。

### 10.2 缺口（全部写出）

**18 条缺口记录 / 166 个缺口项**，逐条在 `guide.md` 里可见（G8b）：

| `kind` | 条数 | 缺口项 |
|---|---|---|
| `unsourced-height` | 1 | **144** 栋建筑无来源高度（与 `scene.bin` manifest 的 `heightAbstract` **逐数核对相等**，G8） |
| `no-running-time` | 8 | 8（`pack.transit.gaps` 全部透传） |
| `coordinate-unavailable` | 4 | 2（南座前 + 站点集 1 未取得） |
| `leg-missing-between-stops` | 4 | 1（未用到的 L04）+ 5 条运营方公表但无坐标的区间 |
| `scene-window-outside` | 1 | 6 + 7 = **13** 个地点在 40 m 冻结走廊之外 |

`sum(gap[].count)` 与 `summary.gapItemCount` 都是 **166**，两者相等由发射器计算、校验器读取。

**5 条运营方公表值被保住了**（`约徒歩25分` / `徒歩7分` / `徒歩10分` / `徒歩約5分` / `徒歩約8分`）。第一版发射器读 `note || how || gap`，而 `placeGapNotes` 的字段是 `gap` / `value` / `whyNotALeg`——**5 条有来源的运营方数字因此从攻略里消失了**。这不是格式问题：`design-core` §3 要求"每条都带来源"，而它们有来源。现在它们逐条带 `source_url` 打印，并显式标注"读取到了，但它不能构成本包的一段行程"。

### 10.3 确定性

两次**独立 node 进程**：

```
guide.json  379BA2071DDE142D2F381B7CC4AF46DA16FA21ABC7E5B16F200BD65644093449  identical=True
guide.md    BA790362BA21723C358ACD121A5F2D884B6980F0C8A9995AC14B2EE3D447C0D1  identical=True
guide.html  59A9D89631CA08A68B6F499EF7E43004A2694C021B62FAE4BA54933F3A06B30E  identical=True
```

### 10.4 D-31 的机械结果

3 条运赁全部 `basis: "lookup"`，`computedFromDistance: 0`，`priceableAsALeg: 0`。
**`kmUpTo` 在 `guide.json` 里零命中**（G10b）——那个字段是这座陷阱的诱饵，本层不读、不抄、不引用。

### 10.5 一处诚实的方向瑕疵（未修，记录在案）

主链在 **x = 902.69 m（阪急河原町駅）** 分叉去 **建仁寺（x = 1331.72 m）**，再**折返**经 **祇園四条駅（x = 1114.74 m）** 继续向东。所以攻略上第 5 个停留点的沿街里程大于第 6 个——一条**来回支线**。

- 几何上是对的：L08 = 605.3 m 去、L07 = 427.4 m 回（本层如实计入 3530.07 m）。
- 读者体验上不顺：攻略没有标出"这一段是折返，多走 X m"。
- **没有修**，因为没有来源陈述过一条更优的顺序，而本层不得自行排序成"看起来更顺"的样子。**这是一个需要 Lead 或策展层裁定的 UX 问题，不是数据问题。**

---

## 11. 缺口清单（本层发现的，未关闭）


| # | 缺口 | 影响 |
|---|---|---|
| **E-1** | **没有玩家动作日志**，所以 §1 的路由是事实层链的投影，不是一次真实游玩 | 攻略的"你的路线"这个说法在 Gate 1 之前没有依据；本层用"沿四条通的策展链"表述 |
| **E-2** | **13 / 22 个地点在 40 m 冻结走廊之外**（清水寺 y = −979 m） | 攻略必须给出"沿街走 X m 后转入"，而场景里没有它们的几何。这**不是**本层的缺陷，是走廊宽度的后果 |
| **E-3** | **地下铁与バス没有任何 leg**，只有参考运赁 | 攻略只能给运赁区间，不能给"坐到哪一站、几点几分"。D-31 保证它不会变成错数 |
| **E-4** | **`guideVerifiedColumnAllowed` 这道逐记录闸门没有校验器** | 与 GAP-7 同源。本层**执行**它，但没有权力让事实层执行 |
| **E-5** | **多语言只有一种出口** | §7 |
| **E-6** | **深链接未实现** | design-core §5 要求"冷门区间给深链并加注'出发前确认'"；本 v1 只有缺口条目 |
| **E-7** | **主链在阪急河原町駅分叉折返去建仁寺**（§10.5） | 几何正确、读者体验不顺；需要裁定顺序，本层不得自行优化 |
| **E-8** | **`guide.json` 的 `recommended_reason` 字段不存在** | 条款四禁止本层自撰景点描述。要它就得先裁定一份日本官方开放文本来源，并逐条带 `source_url` |
