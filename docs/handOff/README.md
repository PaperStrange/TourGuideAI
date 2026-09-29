# docs/handOff — 规划/调研阶段交接材料

本目录是 **TourGuideAI 重启计划阶段**的全部产出，统一存放，便于一次性交接与复查。
开发正式开始后请按仓库既有文档规范落盘，**不要继续往本目录追加**。

## 先读哪一份

| 文件 | 作用 | 什么时候读 |
|---|---|---|
| [`design/design-core.md`](design/design-core.md) | **设计内核**：核心命题、三个时间尺度、四个设计支点、真实性契约、四层世界模型、架构边界、门式规划、自陈风险、**专家红队评审记录与分歧** | 想知道"这东西到底怎么做、为什么这么做" |
| [`design/appendix-visual-and-ui-spec.md`](design/appendix-visual-and-ui-spec.md) | **实现级视觉规格**（下沉，不污染主文档）：像素常量、投影推导、风格包定义、三套界面、字形渲染、资产许可 | 要开始做美术与界面时 |
| [`recon/gap-analysis-and-plan.md`](recon/gap-analysis-and-plan.md) | **GAP 与规划**：现状实测、GAP 矩阵、游戏优先原则、目标引导与变现、9 阶段规划、工期（已取证） | 想知道"现在什么状态、差距在哪" |
| [`recon/recon-codebase-salvage.md`](recon/recon-codebase-salvage.md) | 旧项目代码级盘点（逐行引用）：5 条结构性真因、可搬走的约 4,500 行、可零损失删除的约 77,000 行 | 想知道"旧代码哪些能用、哪些必须扔" |
| [`recon/recon-2.5d-game-research.md`](recon/recon-2.5d-game-research.md) | **2.5D 调研权威版**（1186 行）：Q1–Q7 全量证据、引擎选型、美术成本、难点系统设计、LLM 边界、工期基准；**Appendix A** 目录布局、**Appendix B** 隔离机制、**Authored by** 逐块来源 | 想知道"为什么选 Phaser 4.2.1 + 俯视分层" |
| [`reference/DSH-PLUGINS-FOR-2.5D.md`](reference/DSH-PLUGINS-FOR-2.5D.md) | 本机 DSH 插件清单与对本项目的用法判断 | 想配置工具链 |
| [`reference/Q5_ai_in_the_loop.md`](reference/Q5_ai_in_the_loop.md) | AI 在游戏中的落地证据（按 URL 引用） | 想做 LLM 叙事层 |
| [`reference/research-plan-jobs1.txt`](reference/research-plan-jobs1.txt) | 当时的检索计划原始配置 | 考古用 |
| [`evidence/`](evidence/) | **许可条款原文快照**（Google Maps ToS、ODbL、OSM 瓦片政策）+ 逐字引文核验 | 想知道"地理数据到底能不能用、能不能永久分发" |
| [`archive/corpora/geo-japan/`](archive/corpora/geo-japan/) | **⚠️ 尚未开采**：日本地理数据一手来源 132 份（GMP 条款、ODbL 原文、OSM 政策、Geofabrik 日本包、Ekispert/Jorudan 换乘、ODPT、MLIT GTFS…）。**当前无任何报告引用** | 做地理合规 pre-flight 时——起点 |

## 本目录的完整构成

| 目录 / 文件 | 判据（为什么在这） | 体积 |
|---|---|---|
| **文档层** | 有人会从头读它 | |
| [`design/`](design/) | **活文档**——随开发演进：`design-core.md`（设计内核，含 §11 专家评审记录）+ `appendix-visual-and-ui-spec.md`（实现级规格，下沉不污染主文档） | 0.05 MB |
| [`recon/`](recon/) | **冻结**——本次调研的结论性产出：`gap-analysis-and-plan.md`、`recon-codebase-salvage.md`、`recon-2.5d-game-research.md`（1186 行权威版） | 0.4 MB |
| [`reference/`](reference/) | **外部输入**——不是我们产的：DSH 插件清单、Q5 AI 落地证据、检索计划 | 0.1 MB |
| **证据层** | 只在核验某个断言时才打开 | |
| [`evidence/`](evidence/) | **★承重**——被逐字核验引用的条款原文（Google Maps ToS、ODbL、OSM 瓦片政策）+ `CLAUSES-verbatim.md` | 2.4 MB |
| `archive/` | **存档**——抓取但未被结论引用的原始字节。分四块：`engine/`（引擎文档快照 + `REGISTRY-FACTS.md`）、`page-cache/`（HTML 与转好的 `.txt`）、`corpora/geo-japan/`（**尚未开采**的日本地理语料 131 份）、`fetch-scripts/` | 89.8 MB |
| **工具** | 它是能执行的工具，不是材料 | |
| `dsh-bundle-tourguide-2.5d/` | **活工具**：`tourguide` 预设的 bundle + 13 个校验/取证/合并/重组脚本。以 junction 链入 DSH profile，**移动它必须重装**（见下） | 0.1 MB |

**两条结构原则：**

1. **文档与证据用不同规则。** 文档是**权威式**的——一个主题一份当前版本（实测：`design/` 2 份、`recon/` 3 份、`reference/` 3 份，**零重复**）；证据是**累积式**的——同一内容会被反复抓下来（实测：58 组精确重复、已去重释放 24.9 MB）。
2. **轮次不进目录。** 第二轮调研**不新开目录层**，而是：新主题 → `recon/` 里加一份文档；同一主题的新结论 → **写进原文档**（溯源记在文内，如 `recon-2.5d-game-research.md` 的 `Authored by` 段）。证据则靠**文件名带抓取日期**区分（`name__YYYY-MM-DD.ext`）——**这条规则对未来的抓取生效**；现存文件未加日期，因为给部分文件改名会让约定变成混合制，反而更乱。

**注意事项：**

1. **顶层只放 `README.md` 与目录。** 文档入三个子文件夹（各带自己的 README）；证据语料保持独立目录，因为被文档按文件名引用。
2. **约 108 MB 抓取快照都不被 `.gitignore` 覆盖**——提交前请决定：加 `.gitignore`、精简、还是照收。`archive/page-cache/`（60 MB）是首选清理对象。
3. **已做内容寻址去重（2026-09）**：删掉 73 个逐对 SHA-256 相同的副本 + 整个 `recon-cache/`（与其它目录零同名、内容与本项目无关），释放 **24.9 MB**。去重前对"被文档引用的文件名"做了 pin，确保不打断任何引用。
4. `.q5cache/` 曾在本次会话中途被删除且**不可恢复**（未被 git 跟踪）。教训：任何承载结论的调研材料都必须落到**被跟踪**的文件里。`evidence/` 下的快照就是按这条教训建的。
5. `archive/engine/npm_*.json`（13 个文件、约 26 MB 的完整版本历史）已删除，被引用的版本事实保存在 `archive/engine/REGISTRY-FACTS.md`。
6. **移动 `dsh-bundle-tourguide-2.5d/` 会断链。** 它通过 junction 链入 profile，移动后必须重新 `plugin_manager install_bundle`（新路径）——而且因为链接目标变了，需要**重启 `dsh`** 才能让 loader 重新解析。
7. **已知遗留断链 1 处**：`archive/page-cache/r3f_intro.md` 引用 `../banner-r3f.jpg`，该图片**抓取时就没落盘**，仓库内不存在。属原始快照的既有缺口，不做伪造补齐。

## 取证与核验方法（可复现）

本目录中的事实性数字都来源可查。脚本在
[`dsh-bundle-tourguide-2.5d/tools/`](dsh-bundle-tourguide-2.5d/tools/)：

```powershell
$T  = 'D:\All-Downloads\TourGuideAI\docs\handOff\dsh-bundle-tourguide-2.5d\tools'
$EV = 'D:\All-Downloads\TourGuideAI\docs\handOff\evidence'

# 逐字核验 CLAUSES-verbatim.md 里每条 '> ' 引文是否真的存在于抓取原文中（当前 24/24 通过）
node "$T\verify-quotes.mjs" "$EV\CLAUSES-verbatim.md" "$EV\SOURCES-plaintext.txt"

# 从抓取页面里显示指定条款的上下文
node "$T\show-clause.mjs" "$EV\google-maps-service-terms.html" "14\.3 Caching" 60 900

# 事实层契约校验（city-pack）
node "$T\validate-city-pack.mjs" <city-pack-dir>

# 补丁 / skill 结构自检
node "$T\check-patch-yml.mjs" 'D:\All-Downloads\TourGuideAI\docs\handOff\dsh-bundle-tourguide-2.5d\cordis.patch.yml'
node "$T\check-skill-md.mjs"  'D:\All-Downloads\TourGuideAI\.dsh\skills'
```

## 重启 dsh 之后的检查清单

上一次会话结束时有两个未决项，重启后按顺序验证：

**1. `tourguide` 预设是否生效**（它因 bundle 移动而处于 `restart-required`）

- 刷新 GUI → 预设列表应显示 **TourGuide 2.5D**，且**不再是 "Failed to load"**。
- 若仍报错，把报错原文记下来。上一轮就是靠报错原文定位到根因的（两条 `dsh-persona` 撞同一个硬编码 prompt 段名 `deployment:persona-prefix`）。
- 严格验证要**新建会话并选择 TourGuide 2.5D**——`status: schema` 只证明声明合法，不证明能组合。

**2. `evidence_add` 的账本 cwd 是否已修正**

重启前它把"工作区"解析成 `C:\Users\NemoH`（进程 cwd），因此拒绝相对路径和 `D:\` 绝对路径。
重启后应能直接登记本目录文件：

```powershell
# 期望：成功返回 evidence id + SHA-256（重启前会报 ORIGIN_OUTSIDE_WORKSPACE / ENOENT）
evidence_add(origin: 'docs/handOff/evidence/CLAUSES-verbatim.md')
```

若仍然拒绝，就继续用**内联传 `content`** 的方式，不要卡在这里。

**3. 三条网络路径的可用性**（可选复核）

```powershell
node docs/handOff/dsh-bundle-tourguide-2.5d/tools/check-patch-yml.mjs `
     docs/handOff/dsh-bundle-tourguide-2.5d/cordis.patch.yml      # 期望 18 plugin rows
node docs/handOff/dsh-bundle-tourguide-2.5d/tools/verify-quotes.mjs `
     docs/handOff/evidence/CLAUSES-verbatim.md `
     docs/handOff/evidence/SOURCES-plaintext.txt                  # 期望 24/24 verbatim
```

**4. 待办（重启后继续）**

- **组装地理合规报告**：证据已备齐（24 条引文逐字核验通过），报告本身尚未组装。
- **决定 110 MB 抓取快照的 git 处置**：加 `.gitignore` / 精简 / 照收。
- **阶段 0 的 7 日证伪**：用户要求等所有子代理跑完再启动（现已全部结束）。

## 环境限制（已实测，别重复踩）

**这台机器上有三条网络路径，行为各不相同**，不要因为一条失败就断定"查不到"：

| 路径 | 状态 | 实测证据 |
|---|---|---|
| harness `web_fetch` 工具 | **被拦** | 域名解析到非公网 IP |
| `curl` | 能出网，逐站不一 | `platform.openai.com` → 200；`en.wikipedia.org` → exit 28 超时 |
| `Invoke-WebRequest`（`tools/fetch-page.ps1`） | **在 curl 超时的站点上仍可用** | Wikipedia → 约 1 秒返回，内容可用 |

顺序：`web_fetch` → `curl` → `Invoke-WebRequest`。三条都失败才可判"查不到"。

- `evidence_add` 的账本把"工作区"解析为进程 cwd（`C:\Users\NemoH`），因此**相对路径与 D: 盘绝对路径都会被拒**。要用它登记本目录文件，需内联传 `content`，或重启 `dsh` 让 Host 在正确 cwd 启动。
- 本仓库曾被**其他进程并发写入**（例如 `q2-engines.md` 是在本会话进行中由别的进程落盘的）。改动目录结构后请重新扫一遍陈旧引用。

