# 仓库缺陷登记册（Repo defect registry）

> **为什么有这份文件。** 这轮工作里发现的缺陷，**几乎全部是"纸面上的规则与仓库实况不一致"**，而且**没有任何东西在看**。这类缺陷不会报错、不会失败、不会有人抱怨——它们只是**一直不生效**。
> 登记册的用途不是记录历史，而是**让每一类缺陷都对应一个机器检查**；没有机器的地方显式列出，不假装有。

**核验方式**：`node iteration/tools/run-gates.mjs`（8 道门）与 `node iteration/tools/check-repo-hygiene.mjs`（R1–R6）。

**状态含义**：

| 状态 | 含义 |
|---|---|
**AUTOMATED** | 已有检查器断言它，**复发会红** |
**KNOWN-ACCEPTED** | 检查器**每次都会报出它**，但**不算失败**——修它需要业主决定。**不是"通过"** |
**OPEN** | 无机器，或需要仓库外权限（GitHub 设置） |

---

## 一 · 承重资产未进版本控制（最严重的一类）

> 共同后果：**干净 checkout 里没有它们，而所有"读数据"的门都照样通过。** 本地全绿、CI 全绿、线上缺失。

### D-01 · 三个门脚本未被跟踪 —— **AUTOMATED**

| | |
|---|---|
发现于 | 写 CI 时查 `git ls-files`
现象 | `world-grid.mjs`（18 条断言，冻结投影/网格/原点/`valueKind`）、`assert-export-boundary.mjs`、`validate-city-pack.mjs` **都不在版本控制里**
根因 | 排除理由是"bundle 被 junction 链入 DSH profile，移动要重装"。**实测该前提为假**：`docs/handOff/dsh-bundle-tourguide-2.5d/` 与其 `tools/` **都没有 `LinkType`**——junction 是 DSH 安装时**指向**此目录而创建的
修复 | `.gitignore` 反向；除 `node_modules/` 外全部跟踪
**防复发** | **R4**（每个被文档点名的门必须存在**且**被跟踪）+ `deps` 门

### D-02 · 三个承重实测记录未被跟踪 —— **AUTOMATED**

| | |
|---|---|
发现于 | 在**干净 checkout** 里跑门 → `doors` 门 ENOENT
现象 | `kyoto-slice-origin-candidate.json`（**A13 断言的**）、`kyoto-slice-measurement-summary.json`（A12/V11/`pack.json` 引用）、`kyoto-slice-overpass.json`（解析 12 个 `osmBuildingId`）都在被排除的 `archive/` 下
**注意** | 第一个是**冻结点所镜像的实测记录**——排除它意味着**契约在对一个 CI 看不见的文件做断言**
修复 | 逐个放行
**防复发** | `deps` 门（**机械扫描**：被跟踪脚本读取的路径中，哪些自身未被跟踪）

### D-03 · 规范文档本身未被跟踪 —— **AUTOMATED**

| | |
|---|---|
发现于 | 主动查 `.dsh/` 是否被跟踪
现象 | `tourguide-fact-integrity/SKILL.md`（**这个项目的规范文档**，`task-10` 里刚被规范化更新过）在 `.dsh/` 下、被忽略、未跟踪
后果 | **干净 checkout 里有每一道门，却没有那份说"这些门在守什么"的文档**
修复 | 放行 `.dsh/skills/`；`settings.json` / `experts` / `plugins` 仍排除
**防复发** | **R4**

---

## 二 · gitignore 的否定规则静默失效（同一陷阱踩了三次）

### D-04 · 目录模式让 `!` 否定永久无效 —— **AUTOMATED**

| | |
|---|---|
现象 | `docs/handOff/archive/` 这种**光秃目录模式**让 git **不再深入该目录**，其下所有 `!` 否定**永不生效**。权威表述：*"It is not possible to re-include a file if a parent directory of that file is excluded."*
代价 | **我为此改了三次**：archive 语料两次、`.dsh` 一次。每次都是**编辑看起来成功了**，实际什么也没发生
修复 | 改为 `dir/*` 形式（目录保持可穿透）+ **逐层重新包含父目录**
**防复发** | 规则写在模式旁边的注释里；`deps` 门会在文件真的缺席时报错

---

## 三 · checkout 改写字节（对内容寻址的事实层是致命的）

### D-05 · 行尾转换静默使全pack 哈希断言失效 —— **AUTOMATED**

| | |
|---|---|
发现于 | **在真实干净树里跑门**（本地一直全绿）
现象 | `core.autocrlf=true` + `.gitattributes: * text=auto` → 同一文件 931 行在 checkout 时变 CRLF：**28545 B / 931 CRLF** vs 工作区 **27614 B / 931 LF**
**为什么致命** | 事实层是**内容寻址**的。`world-grid` A12/A13、`validate-doors` V10/V11/V18、`pack.json` 溯源**全在做 SHA-256 断言**。**改写字节让每一条都失效，而所有"只读数据"的门依然愉快通过**——而这份 pack 的产物是**印出来让真人在京都照着走的**
修复 | `.gitattributes` 加 **`*.json -text`**（对所有协作者生效，不论其本地 `autocrlf`）+ `git add --renormalize .`（65 个文件）
**防复发** | **R5**

**⚠️ 这一条我自己查得很乱，已记录**：我连续提出四个假设（文件缺失 / 陈旧缓存 / 提交了错误格式 / 搞错了树），**每个都被一次本身不可靠的检查"验证"过**——`Out-File` 不是字节安全的、`git archive` 与 `git cat-file` 是不同次运行、两次比较是**不同路径下的同名文件**。最后定案的证据只有一行：**用 node 读字节、数 CRLF**。
> **教训与门里写的是同一条：读那个值，不要推断它。**

---

## 四 · 文档承诺 ≠ 仓库实况

### D-06 · 五个 workflow 过滤在不存在的分支上，**从未运行过** —— **AUTOMATED**

| | |
|---|---|
现象 | 默认分支是 **`master`**，而 **`main` 与 `develop` 都不存在**。`ci-cd` / `e2e-tests` / `security-scan` / `stability-tests` / `branch-protection` 全部过滤在那两个名字上
**为什么比"不跑"更糟** | GitHub 原文：*"If a workflow is skipped due to branch filtering … then checks associated with that workflow will remain in a **Pending** state. A pull request that requires those checks to be successful will be **blocked from merging**."* —— **被跳过的 workflow 会把 check 永久留在 Pending，从而挡住合并**
修复 | 全部改为 `master` / `iteration` / `release-*`
**防复发** | **R1**

### D-07 · workflows README 描述 5 个不存在的 workflow —— **AUTOMATED**

| | |
|---|---|
现象 | README 承诺 `lint.yml`、`test.yml`、`docs.yml`、`task-prompt-testing.yml`、`ux-audit-validation.yml`——**五个全都从未存在**；同时**没提到**当时真实存在的六个
**合起来的后果** | **一个自洽的假象**：文档说有 CI，文件也叫 CI，而**一次都没运行过**
修复 | README 重写为与实际 7 个一致；**"消失的五个"显式结案**而不是静默删掉
**防复发** | **R2**（断言 README 命名的 workflow 与磁盘 `.yml` 一致）

### D-08 · `CONTRIBUTING.md` 让贡献者从一个不存在的分支开始 —— **AUTOMATED（编码部分）/ OPEN（内容）**

| | |
|---|---|
现象 | 第 17 行：*"create your branch from `main`"*——`main` 不存在
**为什么长期没被发现** | **该文件是 UTF-16LE 编码**。它是全仓 8 个非 UTF-8 文本文件之一
修复 | 转干净 UTF-8 无 BOM；改为从 `iteration` 切出并注明 `master` 不得从此切出
**防复发** | **R3**（UTF-8）+ **R2 类**（文档指向的名字必须存在）

### D-09 · 分支保护给不存在的分支配保护 —— **OPEN（需 GitHub 权限）**

| | |
|---|---|
现象 | `branch-protection.yml` 给 `main` 与 `develop` 配保护 → **真正的 `master` 与 `iteration` 长期无保护**，**没有任何东西阻止直接推 `master`**
已做 | 文件里的分支名已改对
**未做** | **真正调用 `gh api` 生效需要 GitHub 权限**，不在本仓范围内

### D-10 · 分支保护要求的 3 个 check 从未被满足 —— **OPEN**

| | |
|---|---|
现象 | 要求 `build-and-test` / `e2e-tests` / `security-scan`。它们**对应真实 job**（已核实 job 名匹配），但那些 workflow 过滤在不存在的分支上 → **永不触发** → **按 D-06 的机制，PR 会被永久挡住**
已做 | 分支过滤已修
**未做** | 需要在 GitHub 上确认实际保护配置（可能与仓内文件不一致）

---

## 五 · 本项目自身产出的缺陷（**全部由"跑起来"发现，无一由"想清楚"发现**）

### D-11 · 门脚本按自己文档的命令跑不起来 —— **AUTOMATED**

| | |
|---|---|
现象 | `validate-city-pack-v2.mjs` 把仓库根解析到 `HERE/../../../..`，而到根只有 **2** 层 → 落到 `D:\` → **文档里的原样命令报 usage error 而 pack 完全正常**
根因（我的） | 我要求"必须贴真实输出"，**却没要求"文档里的命令从仓库根能跑"**
> **只能从一个 cwd 跑的校验器，就是一个迟早没人跑的校验器。**
**我的过程失误** | **我改这一行改了三次，因为我在推理路径而不是打印路径**
**防复发** | 该文件现已 4 种 cwd 全过；`run-gates` 从任意 cwd 调用它

### D-12 · 枚举漂移：检查器硬编码了它自己那份常量 —— **AUTOMATED**

| | |
|---|---|
现象 | `world-grid.mjs` 的 `valueKind` 增加第四个成员 `authored` 后，**pack 的 check F 硬编码了三成员** → **它会拒绝正确标签、放过错误标签**（比不检查更糟）
修复 | 改为 **`import` 契约常量**；新增 check **N**：每个 `valueKind`（含子事实）必须是导入枚举的成员，**且非 `observed` 必须关闭"已验证"栏**
**同类** | `doors.json` 内嵌的 `valueKinds` 镜像也是三成员，而**同一文件的散文已写着 `authored`**——**散文说手作、字段说模板**

---

## 六 · 已知并接受（**不是通过**）

### D-13 · 分支名与顶层目录名冲突 —— **KNOWN-ACCEPTED**

| | |
|---|---|
现象 | 分支 `iteration` 与目录 `iteration/` 同名 → `git log -1 iteration` 报 `fatal: ambiguous argument ... both revision and filename`
现状 | **检查器每次运行都会报出它**（R6），但**不算失败**
为何不自动修 | **重命名一条 200 个提交的长寿命分支是业主的决定**；而且**一个为"还没人做的决定"永久变红的检查，是一个人们学会忽略的检查**——那会削弱 R1–R5
**已做的替代缓解** | 已知歧义存在时，用 `--` 分隔（`git log -1 -- iteration/`）

---

## 七 · 规则与机器对照表

**这是本登记册的核心。** 每条规则必须说清它靠什么机器执行——**没有机器的规则就是会漂移的规则**。

| 规则 | 机器 | 状态 |
|---|---|---|
| 每个被文档点名的门必须存在且被跟踪 | R4 + `deps` 门 | AUTOMATED |
| 被跟踪脚本读取的文件必须自身被跟踪 | `deps` 门（机械扫描） | AUTOMATED |
| workflow 的分支过滤必须命名真实分支 | R1 | AUTOMATED |
| workflows README 必须与实际 `.yml` 一致 | R2 | AUTOMATED |
| 仓库文本文件必须是 UTF-8 无 BOM | R3 | AUTOMATED |
| 内容寻址文件不得在 checkout 时被改写字节 | R5 | AUTOMATED |
| 无分支名可遮蔽顶层目录 | R6 | KNOWN-ACCEPTED |
| 事实层：每个值必须有来源 | stock `validate-city-pack` | AUTOMATED |
| 事实层：来源必须**支撑**取值 | `validate-city-pack-v2` check A/D | **部分**——见下 |
| 事实层：来源是否**真的支撑**取值（人工判断） | **无机器** | **OPEN** —— `task-3` 的核验者在做 |
| 导出物不得含无来源的事实形状文本 | `assert-export-boundary` | AUTOMATED |
| 投影/网格/原点/枚举冻结 | `world-grid` 18 条断言 | AUTOMATED |
| ODbL 派生值不得出现在我们的文件里 | `validate-doors` V16/V17 | AUTOMATED |
| 分支保护真的生效 | **无机器** | **OPEN（需 GitHub 权限）** |
| 发布分支删除前 tag 必须存在 | **无机器** | **OPEN** |

---

## 八 · 登记册自身的维护规则

1. **每发现一类新缺陷，先问"能不能变成一条机器检查"**。能，就加检查并把状态标 AUTOMATED；不能，标 OPEN 并写清为什么。
2. **修好一条，不要把状态改成 PASS**——改成 AUTOMATED 并保留原条目。**"曾经违反过"是有价值的信息**。
3. **KNOWN-ACCEPTED 必须写明"为什么不修"**。没有理由的接受就是疏忽。
4. **检查器本身也会错**：本轮新写的 R1 第一版把 `paths:` 里的文件路径误判成分支名；R3 第一版漏了 184 个快照文件。**两个都是靠"跑它并读输出"发现的，不是靠审代码。**
