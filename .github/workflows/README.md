# GitHub Workflows

**本文件由 `iteration/tools/check-repo-hygiene.mjs` 的 R2 检查守着**：它断言本文件命名的 workflow 与磁盘上的 `.yml` 完全一致。不一致就红。

> **为什么要加这条检查。** 本文件此前承诺了 **5 个从未存在过**的 workflow（`lint.yml`、`test.yml`、`docs.yml`、`task-prompt-testing.yml`、`ux-audit-validation.yml`），同时**没有提到**当时真实存在的 6 个。而全仓 5 个 workflow 又都过滤在不存在的分支 `main` / `develop` 上。
> **结果是一个自洽的假象**：文档说有 CI，文件也叫 CI，而实际上**一次都没运行过**。
> 这是"文档承诺 ≠ 仓库实况"这一类缺陷的典型，R2 的存在就是不让它复发。

---

## 实际存在的 workflow（7 个）

| 文件 | 触发 | 作用 |
|---|---|---|
| **fact-integrity.yml** | push/PR → `master` `iteration` `release-*`，限 `city-packs/**` `iteration/**` `dsh-bundle/tools/**`；+ `workflow_dispatch` | **事实完整性门**：调 `iteration/tools/run-gates.mjs`，6 道门。见下 |
| **ci-cd.yml** | push/PR → `master` `iteration` `feat-*` `release-*`；+ `workflow_dispatch` | 基础设施感知的构建/测试；`build-and-test` job 是分支保护要求的 check 之一 |
| **e2e-tests.yml** | 每周一/四定时 + PR；+ `workflow_dispatch` | 端到端测试 |
| **security-scan.yml** | 每周定时 + push → `master` `release-*`，限源码与 `package*.json` | 安全扫描；`security-scan` 是分支保护要求的 check 之一 |
| **stability-tests.yml** | 每周三定时 + PR（限 `src/**`）；+ `workflow_dispatch` | 稳定性与负载测试 |
| **dependency-updates.yml** | 每周一定时；+ `workflow_dispatch` | Dependabot 元数据 |
| **branch-protection.yml** | 每周一定时；+ `workflow_dispatch` | 用 `gh api` 给 `master` / `iteration` / `release-*` 配分支保护 |
| **mvp-release.yml** | push → `mvp-release` `release/mvp-*`；PR → `mvp-release`；+ `workflow_dispatch` | MVP 发布流水线（railway / vercel / heroku）。**仅存在于 `master`**——`iteration` 既无该分支也无此 workflow |

**分支名是实测的，不是照惯例写的**：本仓库默认分支是 **`master`**，**没有 `main`，也没有 `develop`**。完整模型与逐条出处见 [`iteration/design/branching-model.md`](../../iteration/design/branching-model.md)。

---

## 事实完整性门（**fact-integrity.yml**）

它跑 `node iteration/tools/run-gates.mjs`，6 道门全部**零依赖**，且**可在本地原样运行**——一个从没被推上去过的 workflow 不算证据。

| # | 门 | 守什么 |
|---|---|---|
| 1 | `world-grid.mjs` | 冻结的投影 / 网格 / 原点 / `valueKind`；**18 条断言** |
| 2 | `assert-export-boundary.mjs --self-test` | **导出边界**——七层守卫唯一没守的那一边；无允许清单时 **fail-closed** |
| 3 | `validate-city-pack.mjs` | stock 契约门（查溯源**存在性**） |
| 4 | `validate-city-pack-v2.mjs` | 事实层门（查溯源**充分性**：URL 是否真被打开、每条时间/票价是否各有来源、计数是否重推、枚举是否 import） |
| 5 | `validate-doors.mjs --strict` | 12 个门 + ODbL 分表；`--strict` 是**发布门** |
| 6 | `build-pack.mjs` | 9 阶段构建，**幂等**（两次输出逐字节相同） |

**退出码刻意不合并**：`1` = 事实层违规（要人去打开来源或删记录）；`2` = 环境问题（pack / 枚举 / 工具找不到）。两者要不同的人响应，混在一起会叫错人。

另有两个辅助检查器，不在 workflow 里但可随时跑：

- `iteration/tools/check-repo-hygiene.mjs` —— **本文件所在的 R2** 及另外 5 条仓库规则
- `iteration/tools/find-untracked-deps.mjs` —— 扫描"被跟踪脚本读取、但自身未被跟踪"的文件（这类文件在干净 checkout 里会缺）

---

## ⚠️ 已结案：5 个从未存在过的 workflow

以下 5 个在本文件的历史版本里被承诺，**但仓库里从来没有过它们**。列出而不是删掉，是为了让"文档说过、实际没有"这件事留痕：

| 曾经承诺 | 实况 |
|---|---|
| `lint.yml` | **从未创建**。现有 lint 能力在 **ci-cd.yml** |
| `test.yml` | **从未创建**。测试在 **ci-cd.yml**（`build-and-test`）与 **stability-tests.yml** |
| `docs.yml` | **从未创建** |
| `task-prompt-testing.yml` | **从未创建** |
| `ux-audit-validation.yml` | **从未创建** |

---

## 基础设施状态

部署相关基础设施**尚未就绪**：域名、AWS（S3 / CloudFront）、GitHub Secrets 均未配置。**ci-cd.yml** 会在部署前先做基础设施就绪检查，未就绪时**跳过部署而不是失败**。

细节见 [`INFRASTRUCTURE_AWARENESS.md`](INFRASTRUCTURE_AWARENESS.md) 与 [`INFRASTRUCTURE_DEPENDENCY_SOLUTION.md`](INFRASTRUCTURE_DEPENDENCY_SOLUTION.md)。

---

## 已知的仓库级缺陷（本文件之外，记录在案）

1. **分支保护要求的 3 个 check 名从未被满足过**——`build-and-test` / `e2e-tests` / `security-scan`。它们对应真实 job，但那些 workflow 此前过滤在不存在的分支上，所以**永不触发**；而按 GitHub 文档，被过滤跳过的 workflow 其 check 会**停留 Pending**，从而**阻止合并**。
2. **branch-protection.yml 此前给 `main` / `develop` 配置保护**——两个都不存在，所以真正的 `master` 与 `iteration` **长期无保护**。已改。
3. **`workflow_dispatch` 需要 workflow 文件位于默认分支**（GitHub 文档原文）。默认分支是 `master`，而 **fact-integrity.yml** 只存在于 `iteration`，所以它**当前无法被手动触发**。
