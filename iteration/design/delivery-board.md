# 交付看板（Delivery board）

> **这份文件是"当前目标 ↔ 团队分工 ↔ 实测状态"的单一入口。**
> 存在理由：GUI 的 Team panel 只对当前会话可见，而**仓库里没有任何一处能回答"现在在做什么、谁在做、卡在哪"**。这是登记册里 D-06/D-07/D-08 的同一类缺陷——**状态只在某个人脑子里，而那个人会换**。
>
> **更新规则**：每次共享任务状态变化时更新本文件；`ledger` 与门是真相，本文件是它们的指针。

**最后更新**：2026-09-30 · `iteration` = `016621f`

---

## 一 · 总目标

**把项目从"调研与契约"推进到 Gate 1 的可验证结果：一支真人在京都四条通上按游戏导出物走通一次。**

| 阶段 | 目标 | 状态 |
|---|---|---|
**S1** | **证伪或证实"一个 40×40 街区含 12 个可进入门洞"** | 🔄 **进行中** |
**S2** | 事实层收尾，干净 checkout 中 **10/10 门通过** | 🔄 **进行中** |
**S3** | 投影与栅格化（OSM 几何烘焙 → 地面/碰撞/高度） | ⏳ **被 S1 挡**（见下） |
**S4** | 12 套室内 + 招牌管线（100–160 h） | ⏳ |
**S5** | Gate 1 验收：一个真人走通 | ⏳ |

**为什么 S3 被 S1 挡**：S3 会把**真实的几何**烘焙进世界。一旦烘焙完成，**12 个手作门会看起来像是被验证过的**——而它们没有。**先证伪，再让它们进入几何管线。**

---

## 二 · 分工（共享任务板实况）

| 卡 | 主题 | owner | 状态 |
|---|---|---|---|
| task-1 | Geo 管线契约冻结（投影/worldGrid/valueKind/格定义） | `geo-contract` | ✅ 完成 |
| task-2 | 12 门位置清单（登记真实 OSM building id） | `doors-author` | ✅ 完成 |
| task-3 | 事实核验报告（非产出者核验） | `fact-verifier` | ✅ 完成 |
| task-4 | 导出物边界断言 | `export-guard` | ✅ 完成 |
| task-5 | L-A 国际评价平台条款横评 | `review-src-intl` | ✅ 完成 |
| task-6 | L-B 日本本地平台 + 官方开放数据 | `review-src-jp` | ✅ 完成 |
| task-7 | L-C 中文评价平台条款横评 | `review-src-zh` | ✅ 完成 |
| task-8 | 修正 wTiles（2000→1600）+ 冻结投影原点 | `geo-contract` | ✅ 完成 |
| task-9 | 修 validate-doors 指向 ODbL 分表 + 加断言 | `doors-author` | ✅ 完成 |
| task-10 | 事实层落地（pack/places/transit） | `pack-curator` | ✅ 完成 |
| **task-11** | **12 个门的现实核对** | **`fact-verifier`** | 🔄 **进行中** |
| **task-12** | **事实层收尾（UNKNOWN/D-15/D-18）** | **`pack-curator`** | 🔄 **进行中** |

**团队编制**：8 个 teammate（**上限即 8**）。派新活时**优先复用已收工成员**——第一次派 `task-11`/`task-12` 就因满编被拒。

---

## 三 · 实测状态（真相在这些命令里，不在本文件）

| 项 | 命令 | 当前 |
|---|---|---|
**全部门** | `node iteration/tools/run-gates.mjs` | **10 道**（本地 10/10） |
**仓库规则** | `node iteration/tools/check-repo-hygiene.mjs` | **7 条**（R1–R5,R7 过；R6 KNOWN-ACCEPTED） |
**溯源对齐** | `node iteration/tools/check-source-alignment.mjs` | `PRESENT 21  AS-PARTS 10  OSM-ELEMENT 9  **ABSENT 0**  NEAR-VARIANT 0  UNKNOWN 4` |
**分支同步** | `node iteration/tools/check-branch-sync.mjs` | 全部 in-sync |
**CI** | GitHub → Actions → Fact Integrity | **#7 success**（前 6 次失败已修） |
**分支保护** | `master` + `iteration` | 已生效，check 名为真实值 |

---

## 四 · 卡在哪（按优先级）

| # | 阻塞 | 谁能解 |
|---|---|---|
**B1** | **S1 的结论**：若可确认门洞远少于 12，**S4 的美术量与 S3 的几何都要改** | `fact-verifier`（在跑） |
**B2** | `deps` 门当前红——三个新抓的 OSM 寺院文件未跟踪 | `pack-curator`（在跑） |
**B3** | `restore-parked-records.mjs` 被删；它是 `task-10` 里"修一个会销毁数据的构建步骤"的权威定义 | 已问 `pack-curator` |
**B4** | 227 条依赖告警（遗留代码） | 用户已定暂不管；npm 更新块已按此关闭 |
**B5** | 遗留代码搬迁（22 个 npm scripts + 4 个 CI 作业受影响） | 用户 |

---

## 五 · 本文件不做什么

**不复制门的内容。** 门的判定在门的输出里，本文件只给命令与结论。**一份抄了判断的看板，会在下一次改动后变成新的"文档承诺 ≠ 仓库实况"** —— 也就是 D-07 那一类。
