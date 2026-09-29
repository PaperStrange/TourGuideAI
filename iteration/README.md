# iteration/ — TourGuideAI 2.5D 重启：设计与调研

**本目录是入口。** 长期存活的文档与工具在这里（已进 git）；一次性的抓取语料留在 [`../docs/handOff/`](../docs/handOff/)。

- **回归线运行时产出的说明**：`docs/handOff/` 下只剩被引用的资产（evidence 快照、bundle 工具），**没有需要索引的文档**
- **需求初始来源（产品原型）**：[`../docs/prototype/`](../docs/prototype/) —— 3 份 JSON。**未读完之前不要讨论范围**（见下 §3）

---

## 1. 先读哪一份

| 文件 | 作用 | 什么时候读 |
|---|---|---|
| [`design/design-core.md`](design/design-core.md) | **设计内核**：核心命题、三个时间尺度、四个设计支点、真实性契约、四层世界模型、架构边界、门式规划、**决断记录 §8**、自陈风险、§11 专家红队评审 | 想知道"这东西到底怎么做、为什么这么做" |
| [`design/contract-geo-pipeline.md`](design/contract-geo-pipeline.md) | **已冻结的地理管线契约**：投影 / `worldGrid` / `valueKind` / 格定义 + 7 个 GAP | 要动任何与坐标、格、地图有关的东西之前 |
| [`design/appendix-visual-and-ui-spec.md`](design/appendix-visual-and-ui-spec.md) | **实现级视觉与 UI 规格**：像素常量、投影推导、风格包、三套界面、字形渲染、资产许可、必须自建 ⑧ 项 | 要开始做美术与界面时 |
| [`design/architecture-server-current-state.md`](design/architecture-server-current-state.md) | 旧 `server/` 现状实测（44 文件 / 8,569 行；约 1,400 行属已废 beta 产品） | 要判"server 删不删"时 |
| [`recon/gap-analysis-and-plan.md`](recon/gap-analysis-and-plan.md) | **GAP 与规划**：现状实测、GAP 矩阵、游戏优先原则、9 阶段规划、已取证工期 | 想知道"差距在哪、要几周" |
| [`recon/recon-2.5d-game-research.md`](recon/recon-2.5d-game-research.md) | **2.5D 调研权威版**（1186 行）：Q1–Q7 全量证据、引擎选型、美术成本、LLM 边界、工期基准；**Appendix A** 目录布局 · **Appendix B** 七层隔离 · **Authored by** 逐块来源 | 想知道"为什么选 Phaser 4.2.1 + 俯视分层" |
| [`recon/recon-codebase-salvage.md`](recon/recon-codebase-salvage.md) | 旧项目代码级盘点（逐行引用）：约 4,500 行可搬、约 77,000 行可零损失删除 | 想知道"旧代码哪些能用" |
| [`reference/`](reference/) | 外部输入：DSH 插件清单、Q5 AI 落地证据、检索计划 | 配置工具链时 |

**证据与工具不在这里**：[`../docs/handOff/evidence/`](../docs/handOff/evidence/)（14 份条款原文快照）、[`../docs/handOff/dsh-bundle-tourguide-2.5d/tools/`](../docs/handOff/dsh-bundle-tourguide-2.5d/tools/)（两道门 + 校验器）。

---

## 2. 当前状态（2026-09-30）

| 项 | 状态 |
|---|---|
| 分支 | `iteration` |
| 两道可执行门 | `world-grid.mjs` **14/14 PASS**；`assert-export-boundary.mjs` **SELF-TEST PASS**（均已独立复现） |
| **唯一硬阻塞** | **投影原点 `(λ₀, φ₀)` 未冻结**——`buildWorldGrid()` 对未冻结/缺失/占位三种情况**全部抛错**，没人能拿"看起来合理"的坐标偷偷开工 |

---

## 3. ⚠️ 读之前必须知道的三件事

**① 需求根不是"游戏"。** `docs/prototype/` 描述的是「**LLM 生成行程 + 真实地图校验 + 社区分享**」的聊天式旅行规划器，**不是游戏**。而原型里已埋着它失败的原因：`user_route_transportation_validation` 想用 Google Maps **纠正** LLM 幻觉，但 Google Maps **不是可验证来源**（条款只许缓存 30 天）→ **该校验回路注定无法永久分发**。改成游戏，本质是**把不可能的外部校验换成了游玩本身**。

**② 原型里没有"日本 3–5 城"。** 它写的是 `"wish a 3-day US travel plan during christmas!"`、`Hotel Washington`、`mile`、`GMT-4`。**"日本 3–5 城"是本轮新增的范围决策。**

**③ 原型含社区功能，而设计把它列进了拒收清单**（upvote 排行榜、打开他人路线、live popup、附近兴趣点 + 5 条评论、"Feel lucky?" 随机生成）。**用户尚未裁定这部分是否算范围**——连带决定是否需要账号体系。

---

## 4. 本目录的构成

| 目录 | 内容 | git |
|---|---|---|
| `design/` | 设计内核、地理契约、视觉规格、server 现状、README | 跟踪 |
| `recon/` | 三份调研报告 + `sections/` 三份分节草稿 | 跟踪（抓取缓存 `_raw*` 除外） |
| `reference/` | 外部输入 | 跟踪 |
| `tools/` | `fix-relative-links.mjs`（搬迁时用的链接修复器，解析式、非模式叠加） | 跟踪 |
