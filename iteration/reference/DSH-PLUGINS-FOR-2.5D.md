# 本机 DSH 插件清单与用法判断

> 来自另一个 DSH 会话（PaperReading 工作区）的整理，2026-09-28 实测安装。
> 目标读者：正在做「改造旅游项目为 2.5D 游戏规划」的会话。
> 全部插件装在**同一台机器的同一个 profile**（`~/.dsh/profiles/web`），因此你的会话也直接可用。

---

## 0. 先看这里：一句话结论

| 你的当前任务 | 直接对应的插件 |
|---|---|
| 技术选型调研 + 地理数据合规调研 | `dsh-research-report`（把调研固化成**逐条可验证**的封存报告）|
| 遗留代码复用盘点（recon-codebase-salvage） | `dsh-repo-scanner` + `dsh-arch-doc` |
| GAP 分析 + 分阶段实施规划 | `dsh-refactor-insight` + `@weibaohui/experts-management` |
| 旅游/文旅行业与政策合规 | `dsh-industry-research`（产业链建图 + 政策时间线）|
| 攻略/回忆录长文内容 | `lunheng-article-pipeline` |

**最该先用的是 `dsh-research-report`** —— 你的会话里合成类子代理已经两次在落盘前中断（turn 1 的 "shell 在授予工作区写权限时失败 Win32 5"，以及 draft 里"合成任务的子代理同样在落盘前终止"）。这个插件把"调研结论"变成**带证据哈希的封存产物**，而不是又一份可能丢失的散文。

---

## 1. 已装插件全表（13 个外部插件 + 2 个 dsh 自带）

| 插件 | 版本 | 类别 | 与你的相关性 |
|---|---|---|---|
| `dsh-research-report` | 0.3.16 | 可验证研究引擎 | ⭐⭐⭐ 调研合成 |
| `dsh-industry-research` | 0.3.15 | 行业研究（产业链/政策/公司）| ⭐⭐⭐ 文旅行业 |
| `@weibaohui/experts-management` | 0.5.9 | 50+ 专家人设多视角讨论 | ⭐⭐⭐ 选型评审 |
| `dsh-repo-scanner` | 0.1.2 | 只读仓库事实扫描 | ⭐⭐⭐ 复用盘点 |
| `dsh-arch-doc` | 0.1.4 | 架构文档生成 | ⭐⭐⭐ 遗留代码 |
| `dsh-refactor-insight` | 0.1.3 | 重构优先级诊断 | ⭐⭐ GAP 分析 |
| `lunheng-article-pipeline` | 18.47.0 | 9 角色长文流水线 | ⭐⭐ 攻略/回忆录 |
| `dsh-plugin-console` | 0.5.4 | 插件市场 + 框架升级回滚 | ⭐ 管理面板 |
| `dsh-secret-scrub` | 0.1.1 | 密钥脱敏 | ⭐ 地图 API Key |
| `@wanghailong0419/dsh-toolkit` | 0.1.10 | 工具套件 | ⭐ |
| `geometry-knowledge` | 0.1.9 | 离线几何/物理知识库 | ⭐ 引擎数学 |
| `dsh-chinese-poetry` | 1.4.0 | 诗词（**非离线**）| 内容素材 |
| `dsh-notify-win` | 0.1.1 | Windows toast 通知 | 长任务提醒 |
| `dsh-experimental-agent-team-profile` | dsh 自带 | Agent Teams | 多角色协作 |
| `dsh-experimental-auto-review` | dsh 自带 | 逐工具授权复核 | 安全 |

> `dsh-notify-win` 需要**重启 dsh web** 才生效；其余均已即时加载。

---

## 2. 用法判断（逐条，含边界）

### 2.1 `dsh-research-report` —— 把调研变成可验证产物

**机制**：先 `evidence_add` 登记证据快照（URL / DOI / 工作区文件路径），拿到 evidence id 和 SHA-256；再 `research_report` 组装，每个 claim 必须绑定 evidence id，报告会用**存储的字节**逐条核验；最终 manifest + 封存哈希。`ledger_query` 可回查绑定与结论。

**关键纪律（它的设计如此，不是可选项）**：
- 每个数字/引用必须能在证据快照里**逐字定位**，否则该 claim 会被标记 `[未核实]` 或 `[与证据矛盾]`
- **未核实的 claim 不会被悄悄放过**，会带着标记留在正文并列入附录 A
- 这正好治你的病：地理数据合规、"真实可用"的攻略，最怕的就是数字无出处

**对你的具体用法**：
```
evidence_add(origin: "工作区相对路径", ...)   ← 把你要引用的调研材料登记为证据
research_report(topic: "2.5D 旅游游戏技术选型", sections: [...], claims: [...])
```

**省 token 技巧**：`research_report(gather: true, depth: "deep")` 会先跑一轮检索并把快照登记为证据，**只返回候选清单与缺口清单**，不会自动组装——你确认后再组装。

---

### 2.2 `dsh-industry-research` —— 文旅行业与政策合规

四个工具，**专为"不编造数字"设计**：

| 工具 | 用途 | 纪律 |
|---|---|---|
| `industry_map` | 产业链上中下游建图 | 有数值的指标必须带 `sourceRef`；无数值的槽位**显式标为待补** |
| `industry_track` | 政策/要闻时间线 | 每条带日期、来源 URL、抓取快照哈希，追加去重 |
| `company_scan` | 公司速览卡 | 数字必须标来源文件+行号+asOf；不接付费/需登录源 |
| `industry_report` | 组装行业报告 | 挂载研究引擎时走封存；否则降级并**如实标注 `engine: builtin-fallback`** |

**对你的具体用法**：
- 用 `industry_map` 画日本 3–5 城的**旅游产业链**（景点/交通/住宿/内容平台/纪念品）
- 用 `industry_track` 跟**地理数据合规政策**（这正是你 in_progress 的那条调研）
- ⚠️ 它与 `dsh-research-report` **互锁**：检测到 `ctx.researchReport` 引擎时会走封存路径，否则走内置降级。两个都装了，所以你会拿到封存版。

**合规话术**：这四个工具的输出都带"仅供研究，不构成投资建议"——做商业内容时注意保留。

---

### 2.3 代码侧三件套：`repo-scanner` → `arch-doc` → `refactor-insight`

这三个是同一作者（duyanta123）的**递进关系**，建议按序用：

1. **`dsh-repo-scanner`**（`/repo-scanner-runbook`）：只读提取**确定性硬事实**——仓库探测、文件索引、模块、依赖、入口点、符号、Git 基线，输出 JSON。**不改任何文件。**
2. **`dsh-arch-doc`**（`/arch-doc`）：基于这些事实生成**架构文档**——模块职责、依赖图、入口点、运行方式，输出 Markdown + JSON。
3. **`dsh-refactor-insight`**（`/refactor-insight`）：检测坏味道（超长文件 / 长函数 / 深嵌套 / 上帝对象 / 高耦合 / TODO 密度），输出**带定位、优先级、依赖顺序**的重构计划。**只读，不自动改码。**

**对你的具体用法**：你做过 `recon-codebase-salvage.md`（可复用资产盘点）。用它跑一遍遗留旅游项目，能得到一份**别人（和未来的你）能直接读懂的架构现状文档**，这是"现有代码哪些能直接搬到 2.5D 版本"的关键输入。重构优先级那份清单则直接喂给 GAP 分析的分阶段规划。

---

### 2.4 `@weibaohui/experts-management` —— 多视角决策评审

50+ 专家人设，用 `/expert-<名称>` 让模型以专家身份执行任务。**这是清单里最接近"战略讨论/多视角辩论"的 npm 可用方案。**

**对你的具体用法**：Phaser 3 vs 其他引擎、3–5 城范围、攻略+回忆录闭环这些**已经澄清的分歧点**，可以让不同专家视角各出一份意见做交叉检验。

⚠️ **行为边界（我查过源码）**：它内部会 `execFile` 调用外部命令克隆专家库（`gitcode.com/weibaohui/ntd-resource.git`），并在提示词里指导你**主动授权后**才能发布专家到官方仓库。它**不会自动外发**你的数据，但首次使用会联网拉取专家库。

---

### 2.5 `lunheng-article-pipeline` —— 攻略/回忆录长文

9 个独立角色（文献/数据/案例检索、分析、写作、批判、审计、终检、同行评审）跨 6 阶段，含 4 个人在环节点、三角验证、M 门机械终检。附 11 个 `/lunheng` 斜杠命令。

**适用**：≥2000 字、证据须可追溯的长文（学术论文 / 商业评论 / 行业分析 / 公众号）。
**不适用**：<2000 字短文、即时问答、文学创作、营销软文。
**成本**：官方标注**数小时**、4 个人在环节点——别用它写一段游戏内文案。

---

### 2.6 其余

- **`dsh-plugin-console`**：设置页里的插件面板，内置 500+ 插件多源索引，支持一键安装/停用、**框架升级失败自动回滚**、不适配插件自动禁用。想再装插件优先用它，比命令行直观。
- **`dsh-secret-scrub`**：默认 `balanced` 档，把 API key / Bearer 令牌在写入会话日志和模型请求前替换为 `[REDACTED:...]`。**你接地图/地理数据 API 时应该开着**，避免密钥进日志。纯文本变换，无网络能力。
- **`geometry-knowledge`**：纯离线 BM25，208 篇几何/物理文章 + 871 条已验证真理，5 个工具（`geo_list`/`geo_search`/`geo_read`/`geo_truth`/`geo_calc`）。做 2.5D 投影数学、坐标变换、物理量计算时可用；`geo_calc` 是纯计算器。
- **`dsh-chinese-poetry`**：给会话头加"诗词"标签页（搜索/飞花令/每日一诗/分享卡片）。**注意：并非离线**——数据取自第三方公开 API `poetry.palemoky.com`，3 字以上查询会联网。做"回忆录"文学素材可用。
- **`dsh-notify-win`**：任务完成/需审批时弹 Windows 原生 toast + 任务栏闪烁。长任务挂着跑时有用。**需重启生效。**

---

## 2.7 【项目专属】针对 TourGuideAI 实际代码库的判断

我读过你的 `package.json`、`_research/` 与 `.cursor/`，以下是**按你现状**给的结论。

### 你的技术栈（`tour-guide-ai@1.0.0-RC1`）

- 前端：React + MUI + `@react-google-maps/api` + heatmap.js + recharts/chart.js
- 后端：Express + openai + `@sendgrid/mail` + aws-sdk + jsonwebtoken + helmet + express-rate-limit
- 测试：60+ 个 npm script（stability / cross-browser / load / security / ux-audit / user-journeys）

### 三条高优先级建议

**① `dsh-secret-scrub` 从"可选"升级为"建议立刻开"**

你的依赖里有 **四类凭据**：`openai`、`@sendgrid/mail`、`aws-sdk`、`jsonwebtoken`，加上 `dotenv` 和 `.env.example`。2.5D 改造必然会接新的地图/地理数据 API（你 `_research` 里已经在收 Ekispert 和 Foursquare 的材料）。

这个插件默认 `balanced` 档，把 API key / Bearer 令牌在写入会话日志和模型请求前替换成 `[REDACTED:...]`。**改动很小、收益很直接**：避免密钥滚进会话历史和日志。

**② `dsh-arch-doc` 对你的价值比一般项目更高**

你根目录已有一份 `ARCHITECTURE.md`（11.2 KB），但：

- 你有 17 个顶层目录 + **60+ 个测试脚本**，测试体系相当庞杂
- `.cursor/` 里有前人留下的 `.milestones` / `.todos` / `.workflows`（合计约 100 KB），说明这个项目换过规划和工具
- 你的目标是**判断"哪些代码能搬进 2.5D 版本"**

建议顺序：先 `dsh-repo-scanner` 拿确定性硬事实（模块、依赖、入口点、符号、Git 基线）→ 再 `dsh-arch-doc` 生成当前架构文档 → **拿它和已有的 `ARCHITECTURE.md` 对读**，差异处往往就是文档腐化或理解偏差的地方 → 最后 `dsh-refactor-insight` 出重构优先级，直接喂给 GAP 分析。

**③ `dsh-industry-research` 正好接你的两条 in_progress 调研**

你 `_research/` 里已有 `ekispert-index.txt`（路径 API）和 `fsq-usage-guidelines.txt`（Foursquare 使用条款）——**这正是"真实地理数据源与合规"那条待办**。

- `industry_map`：建**日本 3–5 城旅游产业链**图（景点/交通/住宿/内容/纪念品），每个数值必须带来源，无数值的槽位显式标待补
- `industry_track`：跟踪数据源许可与文旅政策变化，每条带抓取快照哈希、追加去重
- `evidence_add`：**把你已经抓下来的那些 `.txt` / `.raw.html` 直接登记为证据快照**（传工作区相对路径即可），后面写报告时每个数字都可回溯到这些文件

### 关于 Phaser 3 的一个提醒

`geometry-knowledge` 是纯离线 BM25 的几何/物理知识库（含 `geo_calc` 计算器）。2.5D 投影、坐标变换、等距/斜投影的数学推导可以用它查证。但**它不含任何 Phaser 3 / 游戏引擎 API**——引擎层面的选型调研它帮不上，那部分还是要靠你自己的调研子代理。

---

## 3. 明确不推荐装的（附原因，供你避坑）

| 包 | 原因 |
|---|---|
| `dsh-knowcode` | 88 MB 体积，二进制**只有 linux-x64 和 darwin-arm64，没有 Windows**；7 个依赖含 falkordb + tree-sitter；真实 spawn `redis-server` + `execSync('git diff')`。你说的"2.5D 游戏"如果要在 Windows 上开发，它跑不起来。 |
| `@fakechris/dsh-track` | npm 与 GitHub 都**未声明任何许可证**，法务含义模糊 |
| `dsh-commander`（裸名）| **名称碰撞**：npm 上那个包无 repository 字段，与作者的仓库包（v2.1.0）完全不同 |
| `keel`（裸名）| npm 上是 teamkeel/keel，AGPL-3.0，**带 postinstall**，与 DSH 的 spec-driven 无关 |
| `folio` / `adversarial-review` / `dsh-flow`（裸名）| 均为同名无关包 |

---

## 4. 结构性缺口（省得你再去找）

两个独立调研都确认：这份 800+ 条清单里

- **没有**专门的头脑风暴 / PRD / 路线图插件
- **没有**专门的 ADR / 系统设计评审 / C4 / PlantUML / 时序图插件
- `mermaid` 仅作为渲染能力出现在 `dsh-qingagent`（且依赖本地桌面应用）

**替代做法**：多视角战略讨论用 **Agent Teams**（已启用）起多个 teammate 分工辩论，配合 `dsh-research-report` 做证据封存；架构图用 `arch-doc` 产出的依赖图 + 现成的 mermaid 渲染能力。

---

## 5. 两个操作提醒

1. **`dsh plugin` 安装要写 `--profile web`**：`dsh plugin --profile web add <包名>`
2. **pnpm 有发布年龄门槛**（`minimumReleaseAge`）：刚发布的版本会被故意跳过而降级到旧版。想装最新版就写显式版本号，例如 `add '<pkg>@^0.5.9'`，pnpm 会把它记入 `pnpm-workspace.yaml` 白名单。

---

## 6. 附：本次安装的安全校验方法（可复用）

每个包我都下载 tarball 解包做静态扫描，检查：`child_process` / `execSync` / `spawnSync` / `eval(` / `new Function(` / 读 `*_KEY|*_TOKEN` 环境变量 / 出现的外部域名。结论：

- 全部 13 个包 **均无 preinstall/postinstall 脚本**（这是供应链投毒最常用的位置）
- 唯一真实的命令执行在 `@weibaohui/experts-management`（克隆专家库）和 `gavel-review`（取 git diff），用途可解释
- `dsh-arch-doc` 与 `dsh-refactor-insight` 扫描出的 `child_process` 是**误报**——那是 Node 内置模块名单字符串数组，用于给扫描到的 import 分类

> 声明：以上为静态分析 + npm 元数据核验，**未做逐行代码审计**。安装来源均为 npm 官方 registry + MIT/Apache-2.0 许可。
