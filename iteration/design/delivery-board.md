# 交付看板（Delivery board）

> **这份文件是"当前目标 ↔ 团队分工 ↔ 实测状态"的单一入口。**
> 存在理由：GUI 的 Team panel 只对当前会话可见，而**仓库里没有任何一处能回答"现在在做什么、谁在做、卡在哪"**。这是登记册里 D-06/D-07/D-08 的同一类缺陷——**状态只在某个人脑子里，而那个人会换**。
>
> **更新规则**：每次共享任务状态变化时更新本文件；`ledger` 与门是真相，本文件是它们的指针。

**最后更新**：2026-09-30 · `iteration` = `e2d9845`

---

## 一 · 总目标

**把项目从"调研与契约"推进到 Gate 1 的可验证结果：一支真人在京都四条通上按游戏导出物走通一次。**

| 阶段 | 目标 | 状态 |
|---|---|---|
**S1** | **证伪或证实"一个 40×40 街区含 12 个可进入门洞"** | ✅ **容量上证实**（实测 60.000 m 临街 → 17–20 门）；**但 12 个位置 0 个被观察**，见 D-24…D-27 |
**S2** | 事实层收尾，干净 checkout 中 **10/10 门通过** | ✅ **达成** |
**S3** | 投影与栅格化（OSM 几何烘焙 → 地面/碰撞/高度） | 🟢 **可以开工**——它依赖 OSM 几何，而几何不依赖门位 |
**S4** | 12 套室内 + 招牌管线（100–160 h） | ⏳ |
**S5** | Gate 1 验收：一个真人走通 | ⏳ |

**为什么 S3 现在可以开工**：它烘焙的是 **OSM 几何**，而几何**不依赖门位**——门是后贴上去的。原先的顾虑（"烘焙会让 12 个手作门看起来像被验证过"）**已由 S1 解决**：它们的 `valueKind` 是 `authored`、`guideVerifiedColumnAllowed: false`，且现在有 **D-24…D-27** 四条记录在案。**门的问题与几何解耦了。**

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
| task-12 | 事实层收尾（UNKNOWN/D-15/D-18） | `pack-curator` | ✅ 完成 |

**团队编制**：8 个 teammate（**上限即 8**）。派新活时**优先复用已收工成员**——第一次派 `task-11`/`task-12` 就因满编被拒。

---

## 三 · 实测状态（真相在这些命令里，不在本文件）

| 项 | 命令 | 当前 |
|---|---|---|
**全部门** | `node iteration/tools/run-gates.mjs` | **10 道 · 干净克隆 10/10 exit 0** ✅ |
**仓库规则** | `node iteration/tools/check-repo-hygiene.mjs` | **7 条**（R1–R5,R7 过；R6 KNOWN-ACCEPTED） |
**溯源对齐** | `node iteration/tools/check-source-alignment.mjs` | `PRESENT 21  AS-PARTS 10  OSM-ELEMENT 9  **ABSENT 0**  NEAR-VARIANT 0  UNKNOWN 4`（起点 8 / 12；**4 是诚实下限**：2 条组合地址 + 2 条 OSM 无名字对象的手作标签） |
**分支同步** | `node iteration/tools/check-branch-sync.mjs` | 全部 in-sync |
**CI** | GitHub → Actions → Fact Integrity | **#7 success**（前 6 次失败已修） |
**分支保护** | `master` + `iteration` | 已生效，check 名为真实值（`Fact-integrity gates` / `build-and-test (18.x)`） |

---

## 四 · 卡在哪（按优先级）

| # | 阻塞 | 谁能解 |
|---|---|---|
**B1** | **门位需要人工街景核对**（`DOOR-CHECKLIST-for-human.md`，约 5 分钟）。**12 个位置 0 个被观察** | **用户**（agent 环境取不到街景） |
**B2** | `deps` 门红——teammate 新抓的 3 个 OSM 寺院文件与 5 个工具脚本未跟踪 | `pack-curator`（在跑，提交即解） |
**B3** | ~~`restore-parked-records.mjs` 被删~~ | 已判断为**被替代**：新增 `restore-temple-legs.mjs` 与 `check-build-lossless.mjs`；后者检查的是**性质**而非修补症状，比原脚本更强。等 teammate 确认 |
**B4** | **`kyoto-kotsu-fare-bus-teiki.*` 被删**（与 `-normal` 逐字节相同的重复份），但其引用仍在 9 处，含**核验者记录 3 处** | `pack-curator` 改工作引用；**核验者记录不动**（已登记 **D-23**） |
**B5** | 227 条依赖告警（遗留代码） | 用户已定暂不管；npm 更新块已按此关闭 |
**B6** | 遗留代码搬迁（**22 个 npm scripts + 4 个 CI 作业**受影响） | 用户 |

---

## 五 · 本文件不做什么

**不复制门的内容。** 门的判定在门的输出里，本文件只给命令与结论。**一份抄了判断的看板，会在下一次改动后变成新的"文档承诺 ≠ 仓库实况"** —— 也就是 D-07 那一类。
