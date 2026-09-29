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
| 1 | `fact-integrity.yml` 触发分支改为 `master` + `iteration` | ✅ 已改 |
| 2 | 其余 4 个 workflow 的 `main`/`develop` → `master`/`iteration` | ⏳ 待办 |
| 3 | `CONTRIBUTING.md` 转 UTF-8 并改正分支名 | ⏳ 待办 |
| 4 | 把 `fact-integrity.yml` 送上 `master`，让 `workflow_dispatch` 可用 | ⏳ **需你授权**（动 `master`） |
| 5 | 给 `master` 与 `iteration` 配真正的分支保护 | ⏳ 待办（需 GitHub 权限） |
| 6 | 清理已完成的远程分支（先核 tag） | ⏳ 待办 |
| 7 | 其余 3 个 UTF-16LE 文档转码 | ⏳ 待办 |

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
