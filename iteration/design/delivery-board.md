# 交付看板（Delivery board）

> **这份文件是"当前目标 ↔ 团队分工 ↔ 实测状态 ↔ 卡在哪"的单一入口。**
> 存在理由：GUI 的 Team panel 只对当前会话可见，而**仓库里没有任何一处能回答"现在在做什么、谁在做、卡在哪"**。这是登记册里 D-06/D-07/D-08 的同一类缺陷——**状态只在某个人脑子里，而那个人会换**。
>
> **更新规则**：每次共享任务状态变化时更新本文件。
> **本文件只做索引**：判定在门与登记册里，这里只给**命令与结论**。**抄了判断的看板会变成下一条"文档承诺 ≠ 仓库实况"（D-07）。**

**最后更新**：2026-09-30 · `iteration` = `1d77e77` · **门 11 道**

---

## 一 · 总目标

**把项目从"调研与契约"推进到 Gate 1 的可验证结果：一支真人在京都四条通上按游戏导出物走通一次。**

| 阶段 | 目标 | 状态 |
|---|---|---|
**S1** | 证伪或证实"一个 40×40 街区含 12 个可进入门洞" | ✅ **容量上证实**——实测 **60.000 m** 四条通临街 → 按实测门距 **17 门**、按设计模块 **~20 门**<br>⚠️ **但 12 个位置 0 个被观察**（街景在 agent 环境取不到）。见 D-24…D-27 |
**S2** | 事实层收尾，干净 checkout 中全门通过 | ✅ **达成**（干净克隆 10/10 exit 0 已验证；现为 11 道门） |
**S3** | 投影与栅格化（OSM 几何烘焙 → 地面/碰撞/高度） | 🔄 **进行中**——发射器 + `scene.bin` 已交付；**GAP-10 裁定补全中**（见 §4 B2） |
**S4** | 12 套室内 + 招牌管线（100–160 h） | ⏳ **模型待改**：D-24 门类型（`street-shop`/`building-lobby`/`transit-mouth`），见 `door-type-model.md` |
**S5** | Gate 1 验收：一个真人走通 | ⏳ |
**＋** | **导出层**（"一键生成路线攻略"——核心卖点所在） | 🔄 **进行中**（`task-16`，此前是"守着一扇后面什么都没有的门"） |

---

## 二 · 分工（共享任务板实况）

| 卡 | 主题 | owner | 状态 |
|---|---|---|---|
| task-1 | Geo 管线契约冻结 | `geo-contract` | ✅ |
| task-2 | 12 门位置清单 | `doors-author` | ✅ |
| task-3 | 事实核验报告（非产出者核验） | `fact-verifier` | ✅ |
| task-4 | 导出物边界断言 | `export-guard` | ✅ |
| task-5/6/7 | L-A/L-B/L-C 评价源条款横评 | `review-src-intl`/`jp`/`zh` | ✅ |
| task-8 | 修正 wTiles（2000→1600）+ 冻结原点 | `geo-contract` | ✅ |
| task-9 | 修 validate-doors 指向 ODbL 分表 | `doors-author` | ✅ |
| task-10 | 事实层落地 | `pack-curator` | ✅ |
| task-11 | **12 个门的现实核对** | `fact-verifier` | ✅ **裁决：有门 0 / 无门 0 / 无法判定 12** |
| task-12 | 事实层收尾（UNKNOWN/D-15/D-18） | `pack-curator` | ✅ **22 places / 9 legs** |
| task-13 | **投影与栅格化（发射器 + scene.bin）** | `geo-contract` | 🔄 补全 GAP-10 裁定 |
| task-14 | 补车站坐标 + 地铁分区 + 缺口措辞 | `pack-curator` | ✅ **496 格运赁矩阵已解码** |
| task-15 | **拆 doors.json 的枚举镜像**（V1 被漂移打红） | `doors-author` | 🔄 |
| task-16 | **导出层：可带出门的路线攻略** | `export-guard` | 🔄 |

**团队编制**：**8 个 teammate，上限即 8，当前满编**。
**派新活时优先复用已收工的成员**——第一次派 `task-11`/`task-12` 就因满编被拒。
**要真正新增成员必须先腾位**；四个 running 成员与 `fact-verifier`、三名评价源成员**都持有活上下文，不为此退役**。

---

## 三 · 实测状态（真相在这些命令里）

| 项 | 命令 | 当前 |
|---|---|---|
**全部门** | `node iteration/tools/run-gates.mjs` | **11 道**（新增 `scene`）。最近一次：**9 过 2 红**（`scene` S8、`doors` V1，**两条都在改**） |
**仓库规则** | `iteration/tools/check-repo-hygiene.mjs` | **7 条**，R1–R5 过、R6 KNOWN-ACCEPTED、**R7 NOTE（信息性）** |
**溯源对齐** | `iteration/tools/check-source-alignment.mjs` | `PRESENT 21  AS-PARTS 10  OSM-ELEMENT 9  **ABSENT 0**  NEAR-VARIANT 0  UNKNOWN 4`<br>（起点 8/12；**4 是诚实下限**：2 条组合地址 + 2 条 OSM 无名字对象的手作标签） |
**场景** | `node iteration/tools/emit-scene.mjs --assert` | 真实几何进管线。`scene.bin` **393,979 B**，两次运行 + 逆序遍历 + `lanes` 污染后 **sha256 均相同** |
**契约** | `node docs/handOff/dsh-bundle-tourguide-2.5d/tools/world-grid.mjs` | **18/18**，`contract sha256=F50E4144…` |
**分支同步** | `iteration/tools/check-branch-sync.mjs` | 全部 in-sync |
**CI** | GitHub → Actions → Fact Integrity | **#7 success** |
**分支保护** | `master` + `iteration` | 已生效，check 名为真实值（`Fact-integrity gates` / `build-and-test (18.x)`） |
**登记册** | `iteration/design/repo-defect-registry.md` | **32 条**（D-01…D-32） |

---

## 四 · 卡在哪（按优先级）

| # | 阻塞 | 谁能解 |
|---|---|---|
**B1** | **12 个门位需要人工街景核对**（`DOOR-CHECKLIST-for-human.md`，**约 5 分钟**）。**12 个位置 0 个被观察**，而它**决定 S4 的美术量** | **用户**（街景在 agent 环境取不到：Street View 无 key `REQUEST_DENIED`、3D Tiles 403、Bing 无数据、Mapillary 需 OAuth、Commons 800 m 内 0 张） |
**B2** | `scene` 门 `S8` 红——**我裁定的 GAP-10 不完整**：窗口深 40 m 而建筑深达 ±556 m，裁剪产出**整幅 40 m 深的板**，轴线行可走比例由 0.826 掉到 0.679 | `geo-contract`（在跑：加**深度上限** + 把 `S8` 改成**可走比例下限 + 连通性**） |
**B3** | `doors` 门 `V1` 红——`doors.json` **抄了一份 `VALUE_KINDS`** 而它是活的枚举 | `doors-author`（在跑 `task-15`：**拆镜像而非更新副本**，且须**证明防漂移有效**） |
**B4** | 227 条依赖告警（**遗留代码**） | 用户已定暂不管；npm 更新块已按此关闭 |
**B5** | 遗留代码搬迁（**22 个 npm scripts + 4 个 CI 作业受影响**） | 用户 |

---

## 五 · 只在对话里存在、还没落进仓库的（**这是本文件存在的理由**）

| 事项 | 状态 |
|---|---|
`DOOR-CHECKLIST-for-human.md` | ✅ 已落盘，**等用户填** |
`door-type-model.md`（D-24 的解法 v2） | ✅ 已落盘（提案，未落进 `doors.json`） |
`legacy-code-map.md` | ✅ 已落盘（**未执行搬迁**） |
`emit-guide.mjs`（导出层） | 🔄 `export-guard` 在做 |

---

## 六 · 本文件不做什么

**不复制门的内容，也不复制登记册的缺陷描述。** 判定在门的输出与登记册里。
**一份抄了判断的看板，会在下一次改动后变成新的"文档承诺 ≠ 仓库实况"**——也就是 D-07 那一类。
