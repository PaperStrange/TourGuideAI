# 分支策略（Branching model）

> **本文的规则来自实测与权威出处，不是自创。** 出处逐条列在 §5。
> 定于 2026-09-30，当时 `iteration` 已领先 `master` **198 个提交**。

---

## 1. 两条长寿命分支

| 分支 | 角色 | 规则 |
|---|---|---|
| **`master`** | **生产就绪分支**——HEAD 永远反映可发布状态 | **只在发布稳定版时合并进来**，并打 tag。平时不动 |
| **`iteration`** | **开发主线（integration）**——日常所有工作汇入这里 | 功能分支从它切出、合回它 |

> 出处（GitFlow 原文）：*"We consider origin/master to be the main branch where the source code of HEAD always reflects a **production-ready state**."*
> 这正是「除非稳定版本否则不动 main 分支」的原始表述。

**功能分支**：从 `iteration` 切出，短命，用完即删。命名 `feat-*` / `fix-*` / `chore-*`。

**发布**：`release-*` 从 `iteration` 切出 → 硬化 → **同时合回 `iteration` 与 `master`** → 在 `master` 上打 tag。

**hotfix**：从 `master` 切出 → **同时合回 `master` 与 `iteration`**（否则修好的东西会在下一次发布时丢回去）。

---

## 2. ⚠️ 仓库实测出的六个偏差（必须修）

### ① 五个 workflow 引用**不存在的分支名**——所以它们从未运行

实测：**`main` 不存在，`develop` 不存在**。默认分支是 **`master`**。

| 文件 | 引用的分支 |
|---|---|
| `ci-cd.yml` | `main`, `develop` |
| `e2e-tests.yml` | `main`, `develop` |
| `security-scan.yml` | `main` |
| `stability-tests.yml` | 仅 `src/**` 路径 |
| `branch-protection.yml` | 给 **`main`** 和 **`develop`** 配置保护 |
| `CONTRIBUTING.md` L17 | 「create your branch from **`main`**」 |

**权威机制（这条解释了后果）**：

> *"If a workflow is skipped due to **branch filtering**, path filtering, or a commit message, then checks associated with that workflow will remain in a **Pending** state. A pull request that requires those checks to be successful will be **blocked from merging**."*

所以：**被跳过的 workflow 不会"安静地不跑"——它会把 check 永久留在 Pending，而要求该 check 的分支保护会因此挡住合并。**

### ② `workflow_dispatch` 需要 workflow 文件在**默认分支**上

> *"This trigger only receives events when the workflow file is on the default branch."*

因为默认分支是 `master`，而 `fact-integrity.yml` 只存在于 `iteration`，**它当前无法被手动触发**。

### ③ `CONTRIBUTING.md` 是 **UTF-16LE**，且指向不存在的分支

它的开场是 *"create your branch from `main`"*——**照做的贡献者第一步就会失败**。编码异常很可能就是它长期没被正确阅读的原因。

全仓实测：**620 个已跟踪文本文件中，8 个非 UTF-8**（4 个 UTF-16LE + 4 个带 BOM）。

### ④ 分支名与目录名冲突

`iteration` **既是分支名，也是顶层目录名**。实测后果：`git log -1 iteration` 报

```
fatal: ambiguous argument 'iteration': both revision and filename
```

其他 git 子命令正常，但这个名字会让脚本和人不时踩到。**记录在案**；改名影响面大，不擅自做。

### ⑤ 远程有 11 个分支，大部分是已完成的发布分支

`release-0.5.0-ALPHA1/2`、`release-1.0.0-RC1`、`release-mvp-demo`、`mvp-release`、`feat-cursor*`、`cursor/fix-mvp-*`——**全部最后一次提交在 2025 年**。

按 GitFlow，**发布分支发布后即删**；已完成的功能分支同理。**清理前先确认 tag 已存在**（发布分支删掉而 tag 没打，发布记录就没了）。

### ⑥ 分支保护配在一对不存在的分支上

`branch-protection.yml` 给 `main` 与 `develop` 配保护。**真正的 `master` 与 `iteration` 都没有保护**——所以现在**没有任何东西能阻止直接向 `master` 推送**。

---

## 3. 待办清单

| # | 事项 | 状态 |
|---|---|---|
| 1 | `fact-integrity.yml` 触发分支改为 `master` + `iteration` | ✅ 已完成 |
| 2 | 其余 4 个 workflow 的 `main`/`develop` → `master`/`iteration` | ✅ 已完成 |
| 3 | `CONTRIBUTING.md` 转 UTF-8 并改正分支名 | ✅ 已完成 |
| 4 | 把门基础设施送上 `master`（让 `workflow_dispatch` 可用） | ✅ **已推送**（见 §3.1） |
| 5 | 给 `master` 与 `iteration` 配真正的分支保护 | ⏳ **被 token 挡住**（见 §3.2） |
| 6 | 清理已完成的远程分支 | ⏳ **被 PR 挡住一个**，其余 8 个已判定可删（见 §3.3） |
| 7 | 其余 3 个 UTF-16LE 文档转码 | ✅ 已完成（全仓 0 非 UTF-8） |

### 3.1 `master` 已收到门基础设施（2026-09-30）

| | |
|---|---|
推送前 | `069f93d`（2025-03-19，PR #32） |
**推送后** | **`c054308`** |
跟踪文件 | 508 → **647** |
**范围** | **只有 CI 基础设施与事实层**——**不含应用代码**（那仍在 `iteration`，等它够发布标准） |

**⚠️ 一个必须先纠正的前提**：我原以为"推一个 4 KB 的 workflow 文件"就够了。**实测发现不够**——那个 workflow 调用 `run-gates.mjs`，而它需要：
`iteration/tools/`、`iteration/design/`、`city-packs/`、`dsh-bundle-*/tools/`、**以及三个实测记录**。**缺任何一个，门要么报错、要么静默降级。**

**⚠️ 另一个差点造成事故的前提**：**本地 `master` 落后 `origin/master` 198 个提交**（自 2025-03 未 fetch）。基于本地 `master` 提交再推，会是一次**非快进推送**，可能覆盖远程工作。
**正确做法**：先 `fetch`，再基于 `origin/master` 建 worktree。**推送是快进的**（`069f93d..c054308`）。

**推送后核实**：GitHub API 显示 **`Fact Integrity` 状态 `active`** ✅ —— 而 `workflow_dispatch` 需要 workflow 文件位于默认分支，**现在满足了**。

### 3.2 分支保护：**被 token 挡住**（我可以调用但无权）

```
GET /repos/PaperStrange/TourGuideAI/branches/master/protection
→ HTTP 401  {"message": "Requires authentication"}
```

本机 **`gh` CLI 未安装**；git 凭据是 GitHub credential manager（OAuth），**其 scope 不含 administration**。

**需要**：一个有 repo admin 权限的 PAT，或在 GitHub 网页 UI 上设置。
**顺带一条实测**：`branch-protection.yml` 里的 `gh api` 也需要同样的权限——**所以那个 workflow 即使触发，也会因为没有 token 而失败**。

### 3.3 远程分支清理：**8 个可删，1 个不能**

判定规则：**分支内容已被某个 tag 覆盖 → 删分支不丢发布记录。**

现有 tag：`v1.0.0-rc1`、`v1.1.0-mvp`（本地与远程一致）。

| 分支 | 最后提交 | 被 tag 覆盖 | 判定 |
|---|---|---|---|
`feat-cursor` | 2025-03-17 | ✅ 两个 | **可删** |
`feat-cursor-beta-release` | 2025-03-27 | ✅ 两个 | **可删** |
`release-0.5.0-ALPHA1` | 2025-03-23 | ✅ 两个 | **可删** |
`release-0.5.0-ALPHA2` | 2025-03-25 | ✅ 两个 | **可删** |
`feat-cursor-backend` | 2025-06-09 | ✅ `v1.1.0-mvp` | **可删** |
`release-1.0.0-RC1` | 2025-05-20 | ✅ `v1.1.0-mvp` | **可删** |
`mvp-release` | 2025-06-24 | ✅ `v1.1.0-mvp` | **可删** |
`release-mvp-demo` | 2025-06-11 | ✅ `v1.1.0-mvp` | **可删** |
| **`cursor/fix-mvp-deploy-configuration-errors-073f`** | 2025-06-24 | **❌ 无** | **⛔ 不能删** |

**为什么那一个不能删**：**它有 1 个开着的 PR（#33，base = `mvp-release`）**，且**有 1 个提交未并入 `origin/master`**（`b8dd0b7`）。**删分支会把这个 PR 直接作废。**

**所以正确的顺序是**：先决定 PR #33 的命运（合并或关闭），**再**删分支。**不是"先删了再说"。**

**执行命令**（需认证，我无法代跑）：
```bash
git push origin --delete \
  feat-cursor feat-cursor-beta-release \
  release-0.5.0-ALPHA1 release-0.5.0-ALPHA2 \
  feat-cursor-backend release-1.0.0-RC1 mvp-release release-mvp-demo
```

---

## 4. 提交信息与合并方式

- **提交信息**：`<type>(<scope>): <subject>`，type 用 `feat` / `fix` / `chore` / `docs` / `test` / `refactor`。正文说明**为什么**，以及**实测到了什么**。
- **合并**：功能分支合回 `iteration` 用 **merge commit**（保留分支语境）。**不要 rebase 已推送的共享分支**——重写共享历史会让所有协作者的分支失效。
- **`iteration` → `master`**：用 merge（或 `--no-ff`），**保留发布点可追溯**。

---

## 5. 出处

| 结论 | 出处 |
|---|---|
| `master` = 生产就绪；`develop`/integration 并行；功能分支从 integration 切出；release 同时合回两条长寿命分支；hotfix 亦然 | [A successful Git branching model (Vincent Driessen, nvie.com)](https://nvie.com/posts/a-successful-git-branching-model/) |
| 分支/路径过滤被跳过 → check 停留 Pending → 会挡住要求该 check 的 PR | [GitHub Docs — Triggering a workflow](https://docs.github.com/en/actions/how-tos/write-workflows/choose-when-workflows-run/trigger-a-workflow) |
| `branches` / `paths` 两者都定义时**必须同时满足**；`workflow_dispatch` 需要 workflow 文件在默认分支 | 同上 |
| 长寿命开发分支是要**抵抗**的压力；release 分支按需从 trunk 切出、发布后删除 | [Trunk Based Development](https://trunkbaseddevelopment.com/) |

**注**：Trunk-Based Development 主张**不要**长寿命开发分支。本项目**有意偏离**——`iteration` 就是一条长寿命开发分支。代价是合并成本随时间增长（现已 198 个提交），**缓解办法是发布节奏而不是取消分支**：稳定即合回 `master`，别让它无限期漂移。
