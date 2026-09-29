# 京都四条 pack — 事实核验报告（来源是否真的支撑取值）

- **核验者**：`fact-verifier`（验证与交付守门人）
- **被核对象**：`city-packs/kyoto-shijo/`（`places.json` 19 条 / `transit.json` 6 条 / `pack.json` / `attestations/source-attestations.json` / `evidence/` 57 份快照）
- **产出者**：`pack-curator`（共享任务 task-10）——**不是本报告的核验者**
- **核验日期**：2026-09-30
- **本报告的机器可读版本**：`city-packs/kyoto-shijo/attestations/verification-verifier.json`
- **核验脚本**：`iteration/recon/verify-kyoto-shijo/v1…v6-*.mjs`（自写，不 import 产出者任何代码）
- **被核对象一律只读**：本次核验只**新增**上述两处文件，未改动 `places.json` / `transit.json` / `pack.json` / `source-attestations.json` / `evidence/` 的任何一个字节（§6 有哈希证据）。

---

## 1. 这份报告回答什么，不回答什么

`validate-city-pack.mjs` 查溯源**存在性**；`validate-city-pack-v2.mjs` check A 把「URL 是否解析到非空证据字节」机械化了。两者都正确，也都不能回答本报告的问题：

> **被引用的那份来源里，有没有一句话，真的说了这个取值？**

判据只有一条：**「支持」必须能指出来源里的哪一句支撑了哪个值。** 来源存在不算，页面非空不算，产出者的 `whatIRead` 写得好听也不算——**产出者的自述本身是被核对象，不是证据**。本报告每一行的 `evidenceLocator` 都是核验者自己打开 `evidence/` 的原始字节找到的。

**产出者的校验器只跑了一次，且只是为了对照**（§7）：它 15 项全过。它全过这件事，对本报告的任何一条裁决都不构成证据。

### 独立判据与产出者自述的对齐情况

| 产出者自述 | 核验者的独立结论 |
|---|---|
| `whatIRead` 引用文件与行号 | 抽查的行号**绝大多数准确到行**（`chion-in-guide.txt:87`、`kenninji-access.txt:9`、`japan-rftfc…txt:5189-5194` 全部对得上） |
| 「已打开并读过」 | **14 个来源中 12 个确已打开**；2 个没有快照（ODbL 全文、OSM copyright），详见 §5.5 |
| 「无坐标」 | 坐标系确实**没有**被打开过；但「来源里没有坐标」是**错的**，详见 §4.4 |
| 「干净的空缺」 | 17 处空 `hours/admission` **全部是正确克制**，核验者逐条复核后同意 |

---

## 2. 裁决汇总

| 裁决 | 行数 | 含义 |
|---|---:|---|
| **支持** | **26** | 来源里有一句话直接陈述了该取值，`evidenceLocator` 可复现 |
| **部分支持** | **8** | 取值对，但**记录在案的理由**错、过度外推，或**溯源指针指错了地方** |
| **不支持** | **8** | 来源不支持该取值，或该字段的出处指针指向一个没有该值的页面 |
| **无法判定** | **0**（行） | 无法判定的都是**事项**不是事实行，见 §5 的 5 条显式清单 |
| 合计 | **42** 行 | `verdictCounts` 由 `v6` 脚本从 `rows[]` 重算并断言，非手写 |

`supports: false` 共 13 行 = 8 条「不支持」+ 5 条「理由本身站不住」的部分支持。

**最重要的三句话**：

1. **数值核心是稳的。** 19 个坐标从原始 OSM 几何反算，最大偏差 **0.056 m**；6 条腿的沿街距离用核验者**自己重新串起来的 11 段四条通链**（62 节点，总长 1716.803 m）复现，**6/6 误差 < 1 cm**。产出者的算术、链装配、微度双写、引用行号都准。
2. **一处真错值**：八坂神社西楼門的 `addressJa` 写成 `祇園町北側125`，被引的那页写的是 `祇園町北側625`。差一位数字，玩家照着输进地图 App 会被带到别处。
3. **一处被说反的事实**：包反复称「三座寺院在**任何来源**里都没有坐标」。**错的**——三座都在 OpenStreetMap 里，建仁寺离抽取框边只有 **53 米**。这是抽取范围问题，被写成了来源缺失。

---

## 3. 逐行核验表

> 全部 42 行连同 `evidenceLocator`、`supports`、逐行说明见 `attestations/verification-verifier.json`。此处按类型给出关键行。

### 3.1 票务与时间（全部打开原页逐句核对）

| factId | field | claimed（逐字） | sourceOpened | evidenceLocator | supports | verdict |
|---|---|---|---|---|---|---|
| kyoto-shijo-kennin-ji | admission 一般 | `800` | ✅ | `evidence/kenninji-access.txt:9` = 「一般 800円、学生（小・中・高） 500円 ※小学生未満のお子様は無料」 | true | 支持 |
| kyoto-shijo-kennin-ji | admission 学生 | `500` | ✅ | 同上 `:9` | true | 支持 |
| kyoto-shijo-kennin-ji | admission 2027 改定後 | `1000` / `effectiveFrom 2027-01-01` | ✅ | `evidence/kenninji-news-fee2025.txt:10`「改定時期：2027年1月1日」／`:13`「改定後 拝観料：一般 1,000円」／`:14`「小・中・高生…以前と同様に500円」 | true | 支持 |
| kyoto-shijo-kennin-ji | admission 一般 `.effectiveFrom` | `2026-09-29` | ✅ | `kenninji-access.txt:9` 只有金额，**没有任何日期** | false | **部分支持** |
| kyoto-shijo-kennin-ji | admission 一般 `.supersededFrom` | `2027-01-01` | ✅ | `kenninji-news-fee2025.txt:10` | true | 支持 |
| kyoto-shijo-kennin-ji | hours | `10:00`–`16:30`，appliesTo 受付終了（17:00 閉門） | ✅ | `kenninji-access.txt:7`「午前10時～午後4時30分受付終了（午後5時閉門）」 | true | 支持 |
| kyoto-shijo-kennin-ji | closedDays | `[]`（CSV 有休館日） | ✅ | `kyoto-sight-DSIGHT_1.csv` id 1000043 col25 有；官方页无 | true | 支持 |
| kyoto-shijo-chion-in | hours | `06:00`–`16:00` 開閉門時間（通年） | ✅ | `chion-in-guide.txt:87`「開閉門時間は午前6時から午後4時です。」 | true | 支持 |
| kyoto-shijo-chion-in | admission 方丈庭園 大人 | `400` | ✅ | `chion-in-guide.txt:123`「方丈庭園」+ `:128`「400円」 | true | 支持 |
| kyoto-shijo-chion-in | admission 友禅苑 大人 | `300` | ✅ | `:122`「友禅苑」+ `:127`「300円」 | true | 支持 |
| kyoto-shijo-chion-in | admission 共通券 大人 | `500` | ✅ | `:124`「共通券」+ `:129`「500円」 | true | 支持 |
| kyoto-shijo-chion-in | admission 共通券 小人 | `250` | ✅ | `:131`「小人」+ `:134`「250円」 | true | 支持 |
| kyoto-shijo-chion-in | admission.note 15:20 | `共通券の販売は 15:20 まで` | ✅ | `:149`「※共通券販売は午後3時20分まで」 | true | 支持 |
| kyoto-shijo-kiyomizu-dera | hours ×3 | `06:00-18:00 / -18:30 / -21:30` | ✅ | `kiyomizudera-access-hours.txt:28`「2026年の拝観時間」+ `:34-67` 表 | true | 支持 |
| kyoto-shijo-kiyomizu-dera | hours[0].appliesTo | 把表里 **4 个独立日期行**并成 1 条 | ✅ | `:34-36, 42-44, 57-59, 65-67` 是四行 | false | 部分支持（信息未丢失） |
| kyoto-shijo-kiyomizu-dera | addressJa | `京都市東山区清水一丁目294` | ✅ | `:20`「〒605-0862 京都市東山区清水1丁目294」 | true | 支持 |
| kyoto-shijo-kiyomizu-dera | admission | `{}` | ✅ | `:28-30, 61-67` 只有时间表；`kiyomizudera-faq.txt:21-28` 谈团体/免除但**不说基础票价** | false | 部分支持（理由错，见 §4.1） |
| kyoto-shijo-yasaka-nishiromon | stateNoteJa / hours 为空 | `24時間参拝可能`；hours 不写 9–17 | ✅ | `yasaka-jinja-access.txt:151`「9：00～17：00（社務所）」`:153`「24時間参拝可能」`:206`「社務所受付 9:00～17:00」 | true | 支持 |
| kyoto-shijo-yasaka-nishiromon | **addressJa** | `京都市東山区祇園町北側125` | ✅ | `yasaka-jinja-access.txt:201` = 「京都府京都市東山区祇園町北側**625**」 | **false** | **不支持** |
| kyoto-shijo-yasaka-nishiromon | coordinates | `35.003741,135.777526`，source_url = 神社页面 | ✅ | 坐标真实来源是 `evidence/osm-corridor-map.json` 的 `way/105449683`；被引页面**不含坐标** | false | **不支持** |
| kyoto-shijo-yasaka-honden | coordinates | `35.003645,135.77859`，source_url = 建造物页面 | ✅ | 同上，`way/88108397`；被引页面不含坐标 | false | **不支持** |
| kyoto-shijo-yasaka-honden | admission 为空（CSV 是 2016 年） | `28年3月12日～3月21日` | ✅ | `kyoto-sight-DSIGHT_1.csv` id 1000040（物理行 40）col27 | true | 支持（含一处措辞外推，见 §4.3） |
| kyoto-shijo-yasaka-honden | hoursNote：900/1600 不采用 | `col26「駐車場　自家用車50台(有料)」` | ✅ | 同 id 1000040：col21=`900`、col23=`1600`、col26=「駐車場　自家用車50台(有料)」 | true | 支持 |

### 3.2 坐标（19/19 从原始几何反算）

| 检查 | 结果 |
|---|---|
| `lat/lng` ↔ `latUdeg/lngUdeg` 双写一致 | **19/19 完全一致**，0 处不符 |
| 坐标能否在原始 OSM 字节里复现 | **19/19 复现**，最大偏差 **0.056 m**（即 1e-6 度取整的量化下限） |
| node 类：直接取该 node 的 `lat/lon` | 17 条 |
| way 类：取该 way 全部成员节点的**算术平均** | 2 条（西楼門 10 节点、本殿 19 节点），与包内 `walkMeasurement.anchors` 一致 |
| 被引 OSM 对象是否真的存在于抽取中 | **17/17**；另 2 条（八坂神社 2 处）`source_url` 根本不是 OSM 永久链接 |
| 坐标级 `valueKind` | 声称为 `observed`；对 node 成立。way 的「顶点平均」是**复核者可复算**的量，不是来源公布的值——记录为观察，不作为违规 |

**一处必须说清的细微差别**：把坐标从来源的几何里**算出来**，不等于来源**陈述了**坐标。17 条 node 类记录里，OSM 确实带着那对数字；2 条 way 类记录与 2 条 transfer 记录则是派生量。§4.4 会把这件事的分寸讲完。

### 3.3 六条腿（transit.json）

| id | minutes | alongStreetM | 核验者复算 | verdict |
|---|---:|---:|---|---|
| L01 | 3 | 164.707 | ✅ < 1 cm，`ceil(164.707/80)=3` | 支持 |
| L02 | 7 | 559.152 | ✅，`ceil(559.152/80)=7` | 支持 |
| L03 | 3 | 169.606 | ✅，`ceil(169.606/80)=3` | 支持 |
| L04 | 3 | 211.538 | ✅，`ceil(211.538/80)=3` | 支持 |
| L05 | 1 | 54.301 | ✅，`ceil(54.301/80)=1` | 支持 |
| L06 | 6 | 427.002 | ✅，`ceil(427.002/80)=6` | 支持 |

复算方式：核验者**自己**按共享节点把 11 段四条通 way 串成一条 62 节点链，算出总长 **1716.803 m**——与包内 `walkMeasurement.corridorChain.totalM` 逐位一致——再把两端点节点投影到链上取弧长差。**6/6 在 1 cm 内吻合。**

**但分钟的出处是另一回事**（§4.5）：6 条腿的 `source_url` 全部是 OSM bbox API，而把米换成分钟的那条 **80 m/分 规则**并不在这 6 条记录上，它在 `pack.json` 的 `transit.walkTimeRule` 里，引自一份**不动产广告**规约。

---

## 4. 卡片点名要独立判的六处

### 4.1 清水寺 admission 为空 —— 产出者的**判断理由被原始字节推翻**

**产出者说**：CSV 的「本堂・舞台 大人400円」挂在 row 10000008「清水寺　狛犬」那一行，「**主体が違う行の金額**」，所以不能采用。

**核验者自己写的解析器读到的字节**（`v1-raw-csv.mjs`，自写 RFC4180 解析，自带物理行号）：

```
--- id 10000008  (starts at physical CSV line 593, 30 fields) ---
  col 8 = "清水寺　狛犬"
  col27 = "料金 一部施設（本堂・舞台）\n\n大人　　　400円\n\n大学生　　400円\n\n高校生　　400円\n\n中学生　　200円\n\n小学生　　200円\n\n障害者予約無料"
```

**裁决：不支持（对产出者的理由，不是对空值）。**

- 产出者说「主体是狛犬」——**行确实是「清水寺　狛犬」**，这一半对。
- 但**费用单元格自己写明了它的主体**：`一部施設（本堂・舞台）`，大人 400 円。**费用属于清水寺的本堂与舞台**，`狛犬` 只是这一行的列表锚点。
- 所以「主体が違う行」这个说法**把行主体与费用主体混为一谈**。字节说的是：同一行里，`name` 字段是狛犬，`fee` 字段是清水寺本堂・舞台的票价。

**这条为什么值钱**：`pack.json` 的 `contradictions[C1].with` 和 `ungeoreferenced-places.json` 的 `whyEmpty` 都把这条理由写成了「矛盾」。**理由是错的，而理由会被后来的人重新推导一遍**——一旦有人复核 C1 发现 CSV 明写了 `本堂・舞台`，整个 C1 条目的可信度就跟着塌。

**核验者不越界**：本报告**不**主张清水寺票价应该填 400 円。CSV 无日期、官方页无金额，拒绝填仍然可以是正确的**策展决定**。核验者只主张：**记录在案的那个理由，与字节不符。**

### 4.2 建仁寺 2027-01-01 涨价 —— **支持**（这是包里引用最扎实的一组）

```
evidence/kenninji-news-fee2025.txt:10  改定時期：2027年1月1日
evidence/kenninji-news-fee2025.txt:11  改定前 拝観料：一般 800円
evidence/kenninji-news-fee2025.txt:13  改定後 拝観料：一般 1,000円
evidence/kenninji-news-fee2025.txt:14  ※小・中・高生につきましては、以前と同様に500円となります。
```

`1,000`、`effectiveFrom 2027-01-01`、以及「学生维持 500」三件事**全部逐字在页**。**支持。**

**唯一保留**：同一 `admission` 数组里，**`一般 800円` 那条的 `effectiveFrom: "2026-09-29"` 不是来源说的日期**，它是采集日。`:9` 只给金额不给日期，改定告知自己的日期是 `:2` 的 2026年9月14日。字段名问的是「这个价从哪天起生效」，**没有来源回答这个问题**。→ 该行判**部分支持**。

### 4.3 八坂神社本殿的 2016 年 —— **年份判断成立，但元号是推断，不是字节**

```
id 1000040 (physical line 40)  col27 =
  本殿特別拝観日（予定）\n\n28年3月12日～3月21日（京都東山花灯路期間中）\n\n
  （但し3月15日、17日、20日は13:00～16:00）（但し祭典中は拝観不可）\n\n
  大人　　　　500円\n\n中学生以下　300円
```

核验者的机械检查：

```
  contains "28年"     : true
  contains "平成"     : false      ← 单元格里没有元号前缀
  contains "平成28年" : false
  every year-like token in the entire row: ["平成14年","28年"]
```

**裁决：支持（结论），但产出者的措辞把推断写成了事实。**

- 原始字节是 **`28年`**，**不是** `平成28年`。产出者写「col27 に『28年3月12日～3月21日』とあり、これは平成28年（2016年）の予定」——前半是字节，后半是判断。
- 该判断**有依据**：同一行描述列出现 `平成14年`，是整行唯一的元号线索；搭配「京都東山花灯路期間中」与 3 月中旬的日期，平成读法合理。
- 但它仍是**推断**。更精确的写法是 `28年（元号不明、同一行の記述から平成と推定）`。
- **结论本身核验者同意**：这是一条 10 年落旧的**动态**信息，按 skill「dynamic は never cache as truth」，不进事実层是对的。

### 4.4 三座寺院无坐标 —— 「**确实无来源**」是错的，正确说法是「**在我们的抽取框外**」

这条是本次核验**影响最大**的发现。

**产出者的说法**（`kyoto-shijo-osm-places.json` 三处 `reason`、`pack.json` `placeGapNotes`、`ungeoreferenced-places.json` `whatWouldCloseThis`）：

> `no OSM object in the extract and no coordinates in any source read for this pack`

**核验者独立查询 OSM 官方 Nominatim**（2026-09-30）：

| 寺院 | OSM 对象 | lat / lon | 与包内 bbox（lat 35.0028–35.0047）的距离 | Nominatim 返回的地名 |
|---|---|---|---|---|
| 知恩院 | `amenity/place_of_worship` | 35.0056216 / 135.7835389 | **框外 435.6 m** | 知恩院, 華頂通, **林下町**, 東山区 |
| 清水寺 | `amenity/place_of_worship` | 34.9943030 / 135.7844389 | **框外 1069.7 m** | 清水寺, **清水一丁目**, 東山区 |
| 建仁寺 | `amenity/place_of_worship` | 35.0002572 / 135.7737408 | **框外 52.7 m** | 建仁寺, 花見小路, **祇園町南側** |

三座寺院的返回地名**与包内记录的历史地址完全吻合**（林下町 / 清水一丁目 / 松原通四条下る＝祇園町南側一带），说明查到的就是正确的对象。

**裁决：部分支持。**

- **狭义说法成立**：包里 57 份快照确实没有这三处坐标；648 行 CSV 里**一个坐标形状的 token 都没有**（核验者全表扫过）。产出者**没有**从地址字符串编造坐标——这一点做得对，`whyEmpty` 的「住所を座標へ変換するのは導出であって観測ではない」是**正确的克制**。
- **广义说法是错的**：「`no coordinates in any source`」把「我们的抽取框没覆盖」说成了「来源里没有」。**来源里有**，就在产出者为其余 19 个坐标所用的**同一个来源族**（OpenStreetMap）里。
- **后果是可量化的**：因为 bbox 而不是因为来源，包里才有 3 条 ungeoreferenced 记录和 2 条被丢弃的腿（L07 祇園四条→建仁寺 `徒歩7分`、L08 京都河原町→建仁寺 `徒歩10分`）——**这两条腿的分钟数是运营者自己公布的**（`kenninji-access.txt:20,:21`），本来可以直接用。
- **包里自己就自相矛盾**：抽取文件里含有 `node/339087268 烏丸御池`，lat **35.0099743**，比 bbox 上边界还北 **585 m**，标签齐全。所以那个 bbox 连「抽取了什么」都没干净地描述。

**核验者不主张**：不主张现在就把坐标填进去。填入坐标必须走一次**被打开并读过的**来源，并带 `verified_at`——这正是 `whatWouldCloseThis` 该说的话。核验者主张的是：**那句话该改成「需要一个覆盖到寺院的抽取」，而不是「没有来源有坐标」。** 三座寺院里，清水寺是本产品**最头牌的终点**。

### 4.5 步行时间规则 —— 引用**逐字准确**，但**用它算攻略步行时间，超出了这份文书的管辖对象**

**产出者引的位置**：`evidence/japan-rftc-hyouji-kiyaku.txt:5189-5194`（`pack.json` `transit.walkTimeRule.readAtLine` 写作 `evidence/japan-rftc-hyouji-kiyaku.txt 5189-5194`，逐字一致）。

**核验者打开这六行**（`v2-places-transit.mjs` 输出，逐行）：

```
evidence/japan-rftc-hyouji-kiyaku.txt:5189 = "(９) 徒歩による所要時間は、道路距離８０"
evidence/japan-rftc-hyouji-kiyaku.txt:5190 = "メートルにつき１分間を要するもの"
evidence/japan-rftc-hyouji-kiyaku.txt:5191 = "として算出した数値を表示するこ"
evidence/japan-rftc-hyouji-kiyaku.txt:5192 = "と。この場合において、１分未満の"
evidence/japan-rftc-hyouji-kiyaku.txt:5193 = "端数が生じたときは、１分として算"
evidence/japan-rftc-hyouji-kiyaku.txt:5194 = "出すること。 "
```

**引用这一半完美**：`道路距離８０メートルにつき１分間` 在、`１分未満の端数…１分として算` 在、**行号 5189–5194 精确命中**。这是全包里引用最准的一条。

**但**：

```
instrument title found in document head       : true
document mentions 寺院 (temple)               : false
document mentions 観光 (tourism)              : false
document mentions 旅行 (travel)               : false
document mentions 宅地/建物 (its real subject): true / true
```

- 这份文书是**不動産の表示に関する公正競争規約 施行規則**——**房地产广告**的公平竞争规约，规范的是**房源广告可以怎么写**。全文没有出现过寺院、观光、旅行。
- 第 (9) 项的句式是「**表示すること**」（**要这样标示**），是给广告主的**表示义务**，不是「走路速度是 80 m/分」的事实陈述。
- 上下文的 (8)(10)(11) 分别讲团地到车站的距离、**汽车**所需时间、**自行车**所需时间——整节都是房源交通标示。

**裁决：部分支持。** 值（距离 ÷ 80 向上取整）算得对，引文一字不差；**把这份规约当成本攻略步行时间的规范来源，超出了它的管辖对象。**

**产出者自己知道这件事**，而且写得很清楚：

> `transit.json` `L01.provenance.whyLicencedMinutes`：「距離は観測（OSM 幾何の実測）。3 分は観測ではなく、道路距離に 80 m/分 という規約定数を適用した結果である。valueKind はこの区別を潰さないために分けて記録する。8 の値は契約 §4 により guideVerifiedColumn に入れてはならない。」

→ `minutesValueKind = "licenced"`，6 条腿全是。**这个自我标注是对的。**

**没人写下来的那句后果是**：`iteration/design/design-core.md` §8.2.2 ④ 规定「**只有 `observed` 能进攻略的已验证栏位**——`authored` / `abstract` / `licenced` 一律禁止」。既然 6 条腿的分钟都是 `licenced`，**这条攻略里最核心的「要走几分钟」在契约下全部拿不到「已验证」标记**。这不是产出者藏了什么，是**没人把这两条事实接起来过**。

### 4.6 六条腿全为零 —— **包里确实没有**（核验通过），但「取不到」的措辞**夸大了障碍**

**产出者说**（`pack.json` `transit.scopeNote` + `transit.gaps[0..2]`）：有意 0 条巴士/地铁/私铁腿，因为「no sourced stop-to-stop running time, headway or first/last departure for any route, and no source at all for Hankyu or Keihan fares」。

**核验者全库扫描 57 份快照**（`v2` 脚本）：

| 检索词 | 命中 | 落在哪 |
|---|---:|---|
| 乗車時間（乘车时长） | **0** | — |
| 運行間隔（班距） | **0** | — |
| 初発（首班） | **0** | — |
| 終電（末班） | **0** | — |
| 時刻表（时刻表） | **0** | — |
| 乗換案内（换乘引导） | **0** | — |
| 所要時間 | 64 | 房地产规约 40、京都 CSV 8（**全是参观/游船/缆车时长**）、其余零散 |

**裁决：部分支持。**

- **「本包的 14 个来源里没有站到站时长」——成立。** 核验者逐份扫过，确认没有任何一份快照带站点间运行时间、班距、首末班。**「0 条」不是漏查，是这 14 个来源确实供给不了。**
- **但「取不到」是错的，而且包里自己指出了路**：
  ```
  evidence/kyoto-kotsu-fare-search.txt:126  市バスの路線・ダイヤについて
  evidence/kyoto-kotsu-fare-search.txt:129  地下鉄の路線・ダイヤ
  ```
  这是**运营者自己的线路/时刻表索引页**——**被抓下来了，但没打开**。核验者另行确认京都市还公开了按**距离**分区的地铁运赁表（**1区＝3 km まで** 220 円 … **5区＝15 km 超** 360 円）与班距数据。
  → **诚实的写法是「本包的来源清单内没有取到」，不是「无法取到」。**

- **地铁那条 gap 有一处措辞要修正**：
  > `transit.gaps[2]`：地下鉄区間：**四条駅→烏丸御池駅の区数が不明。区数が決まらないと運賃が確定しない。**

  前半对（已打开的页面只有分区价目表，没有区间宽度，也没有逐对查询）。**后半不成立**：运营者**公布了分区边界**，而 四条→烏丸御池 的实际站距约 0.6–1.0 km，落在 **1区** 内；两站也都已经是 OSM 对象（`node/339087186`、`node/339087268`）。
  **核验者不把这个当作包内取值**——核验者算出的区数，仍然不是事实层打开过的来源。正确的处置是**打开包里自己引用的那一页**。

- **私铁部分**：阪急/京阪的运赁与时刻页**根本没进来源清单**。这是**覆盖范围的取舍**，不是来源不存在。产出者的措辞（「ユーザーの『許可来源一覧』に両社は含まれておらず、開いていないものを引用しない」）是**诚实的**——值得肯定。

---

## 5. 缺口清单与无法判定项（显式列出，不省略）

### 5.1 无来源的字段

| 缺口 | 性质 | 说明 |
|---|---|---|
| 巴士/地铁/私铁的**站到站时长** | 本包内确实未取到（**可获取**） | 见 §4.6；运营者时刻表索引页**已抓未开** |
| **知恩院/清水寺/建仁寺的坐标** | **范围限制，不是来源限制** | 三座都在 OSM；建仁寺离框边 **52.7 m**。见 §4.4 |
| **ODbL 全文与 OSM copyright 页** | **被引用但从未打开，且无快照** | 两份都可达（HTTP 200 / 51176 B、21314 B）。见 §5.5 |
| 京都市オープンデータ利用規約 (2)ア 的**逐字署名串** | 声称受来源强制，**无法从盘上字节核实** | 只存 PDF，无 `.txt` 抽取（包内另两份 PDF 都做了抽取） |
| **16/19 个地点的 hours/admission/closedDays** | 刻意留空，**核验者同意** | 全部是 OSM 识别对象（楼、站牌、出入口、案内板、横断步道、银行）；`whyEmpty` 逐条写明。**未发现任何一处「来源给了值却被丢掉」** |

**关于空字段的一句公道话**：核验者逐条复核了 17 处空 `hours/admission`。**没有一处**属于「有来源而不用」。产出者对**建仁寺 16:30 是「受付終了」而非闭门、闭门是 17:00** 的区分、对**八坂神社 9–17 是社務所而不是境内开放时间**的拒绝，都是这份 gate 存在的理由本身。**这两处做得很好。**

**唯一一处用户可见的真空洞**：`kyoto-shijo-bank-mufg-kyoto`（三菱ＵＦＪ銀行 京都支店）是一个玩家会真的走进去的营业场所，hours 空、且**没有为它打开过任何银行官方页**。这是一处真缺口，且已被如实声明。

### 5.2 无法判定的项（5 条，显式保留）

| # | 事项 | 为什么无法判定 | 什么能关掉它 |
|---|---|---|---|
| 1 | `evidence/kiyomizudera-guide.html/.txt` | 被 `S10` 列为清水寺小时数的证据之一，但核验者在此文件中**找不到**小时表（表在 `kiyomizudera-access-hours.txt:28-67`）。文件存在，但对 S10 的证据清单而言角色不明 | 说明它在 S10 里承担什么 |
| 2 | `evidence/kyoto-city-kiyaku-syoban.pdf` | 这是 `ccByAttributionJa` 声称「规约要求逐字」的那份文书。**只存 PDF、无文本抽取**，且核验者为读一份事实层取值范围之外的许可文书而临时搭 PDF 管线并不合适 | 抽取文本、读 (1)(2)ア・イ，像产出者对房地产规约 PDF 做的那样 |
| 3 | DSIGHT_1.csv **30 列各自的列义** | **无表头**（已确认：648 条记录、全部 30 字段宽、首条即数据 id 1000001）。包内用到的列名（col8 name / col17 address / col21,23 open / col25 closed / col26 hours / col27 fee）**全是推断**，产出者自己也记了。核验者用行内容独立佐证了 col0/col8/col17/col27，**其余 26 列的列义无法仅凭字节佐证**。§4.1、§4.3 的判决建立在核验者**自己读行内容**之上，不建立在列名来源之上 | 找到任何一份带表头的同源数据 |
| 4 | 两份**字节完全相同**的巴士运赁快照 | `kyoto-kotsu-fare-bus-normal.{html,txt}` 与 `kyoto-kotsu-fare-bus-teiki.{html,txt}` **逐字节相同**（sha256 `CAD3F056…` / `8695CF20…`），文件名却暗示两个页面。取值无错（被引的 `page/0000240682.html` 确有 230 円），但「两份独立抓取」的外观不成立，57 份快照里实际只有 55 份独立内容 | 删掉重复的一份或注明其真实出处 |
| 5 | `evidence/osm-corridor-os.json` 的哈希 | ODbL 半边记录了 `5152995D…`，核验者**未独立重算**（对任何裁决都不是必需）。裁决攸关的两份（CSV 与 `osm-corridor-map.json`）**都重算并吻合** | 跑一次 `Get-FileHash` |

### 5.3 包是**选集**不是**清单**（首次量化）

抽取文件里有：`railway=subway_entrance` **12** 个（用了 2）、`highway=bus_stop` **23** 个（用了 8）、`tourism=information` **22** 个（用了 2）、`amenity=bank` **13** 个（用了 1）、`highway=crossing` **160** 个（用了 1）、`building=*` way **1512** 个（用了 2）。

19 个地点是锚定街区的一次**刻意切片**，包内没有任何一处声称它是全集。但如果有人把「19 places」读成「block 0 的内容」，那是错的。**这不是缺陷，是之前没人量化过的边界。**

### 5.4 结构性缺口（属于导出层，不属于本包）

清水寺官方页自己写着 `kiyomizudera-access-hours.txt:29`「＊夜間特別拝観の期間は年ごとに変更になります」，而包里带着三个随季节变化的闭门时间、`verified_at` 为 2026-09-29。tier 是 semi-static，skill 要求导出的攻略必须给 **Plan B 与缓冲**。**这条义务现在落在导出层，不在本包。**

### 5.5 来源可达性（2026-09-30 实测）

包内引用的 **17 个 URL 全部 HTTP 200**，且多数返回字节数与盘上快照一致：

```
[200]      7265 B  data.city.kyoto.lg.jp/resource/?id=7052
[200]      8505 B  data.city.kyoto.lg.jp/dataset/00073/
[200]    164482 B  www2.city.kyoto.lg.jp/.../kiyaku_syoban.pdf
[200]     21314 B  www.openstreetmap.org/copyright
[200]     51176 B  opendatacommons.org/licenses/odbl/1-0/
[200]   1529907 B  www.tfkoutori.jp/data/pdf/kiyaku-202209.pdf
[200]     26679 B  city.kyoto.lg.jp/kotsu/page/0000240682.html     (230円 现价，无过期)
[200]     36977 B  city.kyoto.lg.jp/kotsu/page/0000240757.html
[200]     26840 B  www.yasaka-jinja.or.jp/access/
[200]     81284 B  www.yasaka-jinja.or.jp/about/architecture/
[200]     24093 B  www.chion-in.or.jp/guide/
[200]     28836 B  www.kiyomizudera.or.jp/access.php
[200]      9655 B  www.kenninji.jp/access/
[200]     17564 B  www.kenninji.jp/news/?p=2352
[200]   3730909 B  api.openstreetmap.org/api/0.6/map.json?bbox=…  (与盘上 sha256 吻合)
[200]     42639 B  www.openstreetmap.org/way/205732558
[200]     42559 B  www.openstreetmap.org/way/205732536
```

**结论：没有断链。** 卡片说的「部分来源可能已不可达」在本次实测中**没有发生**，无需记录为缺口。

**核验者顺手排除了一次自己造的假警报**：现网巴士页里有 **7 处「240」**，一度像是票价涨到 240。逐条读上文后确认——那是**页码 240682**。被引页面 `運賃額 大人 230円 小児 120円` 现在仍然成立，**没有过期**。同理，快照里的 `120円/60円` 是**福祉割引**价，不是基础票价。

---

## 6. 与设计文档的一致性检查

### 6.1 契约违反：两个 `licenced` 字段带着 `guideVerifiedColumnAllowed: true`

`design-core.md` §8.2.2 ④ 的原文：

> 新增 `valueKind: observed | authored | licenced | abstract`（四态）……**只有 `observed` 能进攻略的「已验证」栏位**——`authored` / `abstract` / `licenced` **一律禁止**。否则「亲自到过」会给一个抽象高度背书，或给一次手作判断背书成「我们核实过」——两种不同的可信度混在一列里。

核验者在 `places.json` 的 `provenance.valueKindPerField` 里找到 **6 处 `licenced`**，其中**两处真的装着值**，而这两条记录的 `guideVerifiedColumnAllowed` **都是 `true`**：

| 字段 | 值 | OSM 里有吗 | 判定 |
|---|---|---|---|
| `kyoto-shijo-crossing-karasuma-east.nameJa` | `四条烏丸交差点 東側横断歩道` | **没有 `name` 标签**（`node/2737069286` 只有 `highway=crossing` 等） | curator 自撰名 |
| `kyoto-shijo-subway-shijo-exit1.nameZh` | `四条站出口1` | **没有 `name:zh`**（`node/11283562286` 只有 `name="Exit 1"`） | curator 自撰名 |

**这是 `places.json` 里唯一一处真正的契约违反**：一个由策展者写下的名字，在一个允许进「已验证」栏位的记录里。它现在**还没有**伤到用户，因为攻略层尚未把这些字段渲染成徽章——**一旦渲染，一个自撰的地名就会被标成「我们核实过」。**

**产出者是诚实的，只是旗子插错了**：它把这两个字段正确标成 `licenced`，并在 `whyEmpty` 里写下「nameJa は OSM に name タグが無く、本パックの位置記述（東側横断歩道）は curator の記述なので licenced とした」。分类是有意的；**只有 `guideVerifiedColumnAllowed` 这一个布尔值错了。**

**同一类里还有一处无害的分类错误**：`bldg-mitsui.category` / `bldg-daiya.category` = `building-commercial` 被标成 `licenced`，但 OSM 明写 `building=commercial`，这是**直接标签变换**。按 §8.2.2 ④ 的分类，`licenced` 指的是「授权模板」（道路宽度、LOD1 抽象高度）。核验者确认：**没有任何一处 `licenced` 分类在掩盖一个事实值**——真正承载事实值的只有上表那两个名字。

### 6.2 攻略「📖 已核实」徽章的语义空洞

`design-core.md` §3 定义：

| 玩家做了什么 | 攻略里的标记 |
|---|---|
| 在游戏里读过来源 | 📖 已核实 |

而 §4 的 `read: Set<FactId>` **同时是游戏进度、存档内容与攻略可信度字段**。

**问题**：`📖 已核实` 的字面含义是「**我读过来源**」，而这枚徽章的可信度**完全依赖于「来源确实说了这个值」**——那正是本次核验在做的判断。玩家在游戏里「读过」的，是**产出者声称来源说了什么**，不是来源本身。

**这不是设计缺陷，是本设计对核验层的依赖**：攻略页承诺「这是你亲自读过的」，那么事实层必须先被证明——**每一条能拿到这枚徽章的记录，其来源都必须真的支撑取值**。本次核验给出的答案是好坏参半：26 行干净、8 行部分、**8 行不支持**。**在 8 行不支持被处置之前，「📖 已核实」在这 8 条上没有语义。**

### 6.3 `lat/lng` 与 `latUdeg/lonUdeg` 的指令冲突仍未消解

`pack.json` `coordinateSystem.compatFields` 说得很谨慎：

> `lat / lng` are the same value expressed in decimal degrees for consumers that expect that shape; they are **derived from latUdeg / lonUdeg** and are **not an independent value**.

`design-core.md` C6 的 Lead 裁定**恰好相反**：

> **`lat` / `lng`（十進数の数値）が事実層の正準形。**……整数マイクロ度は **provenance 形式**として残り……`osmRecord` で到達する。

核验者不裁定谁对（这是 Lead 的权限，且已裁定过一次）。核验者只报告**机械事实**：两份文件对**哪一个是从属表示**的表述**互相颠倒**，而 `pack.json` 在 C6 里已经记录了这次裁定、`coordinateSystem` 字段却没有跟着更新。**数值上无影响**（19/19 双写一致，核验者已验），**表述上不一致**，会绊住下一个读契约的人。

---

## 7. 核验方法、可复现性与独立性

### 7.1 核验者自写的脚本（全部只读）

| 脚本 | 做什么 |
|---|---|
| `iteration/recon/verify-kyoto-shijo/v1-raw-csv.mjs` | **自写 RFC4180 解析器 + 自写物理行号记账**，直接读 378,453 字节 CSV；全表搜「本堂/舞台」「清水寺」「坐标形状 token」 |
| `iteration/recon/verify-kyoto-shijo/v2-places-transit.mjs` | 双写一致性；被引 OSM 对象是否存在于抽取；**自己重新串接 11 段 way 成 62 节点链并复算 6 条腿**；房地产规约逐行读取；三座寺院 bbox 距离 |
| `iteration/recon/verify-kyoto-shijo/v3-fact-table.mjs` | 从**事实文件**（非产出者自述）抽取值；`valueKind` / 徽章资格审计 |
| `iteration/recon/verify-kyoto-shijo/v4-coverage-and-ways.mjs` | **19 个坐标逐个反投影**到原始几何；way 类取成员节点均值；量化 19 个地点相对抽取的覆盖率 |
| `iteration/recon/verify-kyoto-shijo/v5-remaining-sources.mjs` | 知恩院票务/时间、清水寺 FAQ、建仁寺地址、6 条腿的 source_url 分布 |
| `iteration/recon/verify-kyoto-shijo/v6-check-attestation.mjs` | **对本报告自身输出做机械验收**：必备列、裁决枚举、`支持` 必带 locator、**逐条重新打开每个 locator 并断言该行存在**、哈希未变、无法判定项未省略 |

### 7.2 验收自检（`v6` 真实输出，节选）

```
===== A. machine-readability & required columns =====
  PASS  rows array parses (42 rows)
  PASS  every row carries all 8 required columns
  PASS  every verdict is one of 支持/部分支持/不支持/无法判定
  PASS  every supports=true row carries an evidenceLocator

===== B. verdict counts (recomputed, not trusted) =====
  recomputed: {"部分支持":8,"不支持":8,"支持":26}  total 42
  PASS  counts are declared as recomputed-from-rows rather than hand-written
  PASS  no row has a verdict that contradicts its supports flag

===== C. independence: are any verdicts copied from the producer? =====
  producer attestation contains "支持": false
  producer attestation contains "部分支持": false
  producer attestation contains "不支持": false
  producer attestation contains "无法判定": false
  PASS  the verdict vocabulary does not exist in the producer file, so no verdict could have been copied

===== D. every "支持" locator, re-opened and re-read =====
  ok  evidence/kenninji-access.txt:9        L9="一般 800円、学生（小・中・高） 500円 ※小学生未満のお子様は無料"
  ok  evidence/chion-in-guide.txt:87        L87="開閉門時間は午前6時から午後4時です。"
  ok  evidence/japan-rftc-hyouji-kiyaku.txt:5189  L5189="(９) 徒歩による所要時間は、道路距離８０"
  ok  evidence/kyoto-kotsu-fare-bus-teiki.txt:51  L51="大人 230円"
  ...
  locators re-opened: 30, unresolvable: 0
  PASS  every 支持 locator points into a file that exists and a line that exists

===== E. the audited files were not modified =====
  PASS  CSV evidence unchanged
  PASS  OSM evidence unchanged

ACCEPTANCE: PASS
```

### 7.3 只读证明

本次核验**只新增两个文件**；被核对象逐一原样：

| 文件 | 结论 |
|---|---|
| `places.json` / `transit.json` / `pack.json` | 未改动 |
| `attestations/source-attestations.json` | 未改动（`verification-verifier.json` **并列存在**，不覆盖它） |
| `evidence/kyoto-sight-DSIGHT_1.csv` | sha256 **`233736CE…`**，与产出者记录**逐位吻合** |
| `evidence/osm-corridor-map.json` | sha256 **`56B45615…`**，与产出者记录**逐位吻合** |
| `evidence/` 其余文件 | 只读打开 |

### 7.4 独立性

- 核验者 `fact-verifier` **不是**产出者 `pack-curator`。
- **未 import、未执行**产出者的任何脚本以求裁决；`validate-city-pack-v2.mjs` 只在收尾时跑过一次**用于对照**，其全过对本报告任何一行都不构成证据（事实上本报告有 8 行不支持，它全过）。
- `source-attestations.json` **只作为被审对象**被读；每一个 `evidenceLocator` 都是核验者在原始字节里**自己找到**的。
- 裁决词汇「支持/部分支持/不支持/无法判定」**在产出者的文件里根本不存在**（§7.2 C 段的机械检查）——**结构上不可能抄**。

---

## 8. 给 Lead 的结论

**事实层的数值核心成立，可以继续；但有 8 条记录不该带着现在的出处进攻略层。**

**做对了、且值得肯定的：**

1. **算术与几何准确**。19 个坐标反算最大偏差 0.056 m（取整下限）；6 条腿的沿街距离用独立重串的链复现，误差 < 1 cm；总长 1716.803 m 逐位吻合。产出者的链装配与投影实现是对的。
2. **引文精确**。房地产规约 `:5189-5194`、知恩院 `:87`、建仁寺 `:9`、清水寺 `:28` 全部**精确到行**。这是核验者抽查到的最高水准。
3. **克制是对的，而且克制得很细**。建仁寺 **16:30 受付終了 vs 17:00 閉門**的区分、八坂神社 **9–17 是社務所而不是境内**的拒绝、**拒绝从地址字符串造坐标**、拒绝无日期的 CSV 休馆表——这四处正是本 gate 存在的理由。17 处空字段里**没有一处**是「有来源而不用」。
4. **自我标注诚实**。`minutesValueKind=licenced`、`whyEmpty` 对清水寺票价的说明、`dropped-legs.json` 对丢弃原因的记录——产出者没有藏东西，有几处甚至**主动交代了对自己不利的事实**。

**必须处置的（按严重度）：**

| # | 问题 | 严重度 | 建议 |
|---|---|---|---|
| 1 | **`kyoto-shijo-yasaka-nishiromon.addressJa` = `祇園町北側125`，被引页面写 `625`** | **高** | 要么改值并补 CSV 出处，要么改 `source_url`。一个差一位的地址会把人送到错的地方 |
| 2 | **两条八坂神社记录把坐标的出处指向不含坐标的页面** | 中 | 坐标本身正确（OSM way 校验过），但 `source_url` 该指向 OSM 或补 `osmRecord` 说明 |
| 3 | **「三座寺院在任何来源都没有坐标」是错的** | 中 | 改为「在抽取框外」；这是一次 bbox 扩框就能关掉的缺口，涉及 2 条已有时长的腿与头牌终点清水寺 |
| 4 | **C1 的理由与 CSV 字节不符**（`一部施設（本堂・舞台）` 自带主体） | 中 | 保留「不采用」的决定，**改掉记录在案的理由**——错理由会被下一个人重新推导，然后连带否掉整条 C1 |
| 5 | **两条 `licenced` 名字带着 `guideVerifiedColumnAllowed: true`** | 中 | 翻成 `false`。现在无害，渲染徽章那一刻就有害 |
| 6 | **ODbL 与 OSM copyright 从未打开、无快照**，而许可义务建立在其上；`§4.5(a)` 被说成它不是的东西；同一文件被同时称为 Derivative 与 Collective Database | 中 | 抓两份页面存快照，重读 §4.3/§4.5，统一术语 |
| 7 | **6 条腿的分钟全是 `licenced` → 契约下全部拿不到「已验证」** | 中 | 决策项：要么接受（并在攻略里明确显示这是规约换算），要么为这几对点补运营者公布的步行分钟 |
| 8 | **零巴士/地铁/私铁腿的措辞夸大了障碍**；地铁「区数不明」的后半句不成立 | 低-中 | 改成「本包来源清单内未取到」；打开包里**自己引用**的时刻表索引页 |
| 9 | **`source-attestations.json` 把已抓取并转写过的 `dataset/00073` 列为 `unopenedUrls`** | 低 | 从 `unopenedUrls` 移出——这个字段是下一个人找「还差什么」的地方，写错会把人引开真正的缺口 |
| 10 | **`coordinateSystem.compatFields` 与 C6 裁定的从属关系互相颠倒** | 低 | 数值无影响（19/19 一致），表述需与裁定对齐 |

**核验者不越界**：本报告**不改**任何被核对象，**不替 Lead 做取舍**，**不主张把某个具体数值填进事实层**——包括清水寺的 400 円与地铁的 1 区。凡核验者自己算出来的量（区数、bbox 距离、缺失坐标），都只是**给复现路径**，**不是**可以进事实层的取值。取值得走一次被打开、被读过、带 `verified_at` 的来源。

**判据未放宽**：42 行每行都有裁决，「支持」行必带 `evidenceLocator`（`v6` 逐条重开断言过），无法判定项 5 条显式列出未省略，缺口 7 类显式列出未省略。
