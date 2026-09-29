# docs/handOff — 遗留语料与工具（**文档已迁出**）

> **2026-09-30 结构调整**：长期存活的文档与工具**已按生命周期分层迁出**。
> - **设计文档、调研报告、外部材料** → **[`../../iteration/`](../../iteration/)**（已进 git）
> - **本目录只保留**：一次性抓取语料、许可证据快照、DSH 预设 bundle
>
> 本目录现在**不是入口**。要读设计与调研，去 [`iteration/README`](../../iteration/) 或 [`iteration/design/design-core.md`](../../iteration/design/design-core.md)。

---

## 本目录构成

| 目录 / 文件 | 判据 | 体积 | git |
|---|---|---|---|
| [`evidence/`](evidence/) | **★承重**——被逐字核验引用的条款原文（Google Maps ToS、ODbL、OSM 瓦片政策、PLATEAU、GSI、MLIT KSJ）+ `CLAUSES-verbatim.md` | 2.4 MB | **已跟踪**（bundle 里的工具按相对路径引用它） |
| `archive/` | **一次性存档**——抓取但未被结论引用的原始字节。四块：`engine/`（引擎文档快照 + `REGISTRY-FACTS.md`）、`page-cache/`（HTML 与转好的 `.txt`）、`corpora/geo-japan/`（日本地理语料 131 份）、`fetch-scripts/` | 90.1 MB | 排除 |
| `dsh-bundle-tourguide-2.5d/` | **活工具**——`tourguide` 预设的 bundle + 全部校验/取证/门禁脚本。以 **junction 链入 DSH profile**，**移动它必须重装 bundle 并重启 `dsh`** | 0.4 MB | 排除（见下） |
| `README.md` | 本文件 | — | 已跟踪 |

**为什么 bundle 被排除而不是跟进 git**：它通过 junction 链入 `$DSH_PROFILE_DIR/node_modules/@local/tourguide-2.5d`，路径一变就必须重装 + 重启。用户明确要求**不移动它**。`iteration/design/contract-geo-pipeline.md` 按**相对路径**引用它（`../../docs/handOff/dsh-bundle-tourguide-2.5d/tools/…`）。

**bundle 里的门禁脚本**（`node <脚本> --help` 看用法）：

| 脚本 | 作用 |
|---|---|
| `tools/world-grid.mjs` | 投影 / `worldGrid` / `valueKind` / 格定义契约 + **14 条机械断言** |
| `tools/assert-export-boundary.mjs` | **导出物边界断言**（七层守卫唯一没守的一边）+ 13 条断言、`--self-test` |
| `tools/validate-city-pack.mjs` | city-pack 溯源校验（⚠️ 对 `hours`/`admission`/`closedDays`/`transfers`/`fareIC` **零校验**，待补） |

---

## 三条仍然有效的技术结论

**1. 文档与证据用不同规则。** 文档是**权威式**的——一个主题一份当前版本；证据是**累积式**的——同一内容会被反复抓下来（实测：58 组精确重复，去重释放 **24.9 MB**）。

**2. 已做内容寻址去重（2026-09）。** 删 73 个逐对 SHA-256 相同的副本 + 整个 `recon-cache/`。去重前对"被文档引用的文件名"做了 pin，确保不打断引用。

**3. `.q5cache/` 曾被删且不可恢复**（未被 git 跟踪）。教训：**任何承载结论的材料必须落到被跟踪的文件里**——`evidence/` 下的快照与 `iteration/` 整体就是按这条教训建的。

---

## 取证与核验方法（可复现）

```powershell
$BT = 'D:\All-Downloads\TourGuideAI\docs\handOff\dsh-bundle-tourguide-2.5d\tools'

# 两道门（都已在 2026-09 独立复现过）
node "$BT\world-grid.mjs"                      # 14/14 PASS
node "$BT\assert-export-boundary.mjs" --self-test   # SELF-TEST PASS

# 引文逐字核验
node "$BT\verify-quotes.mjs"
```

**取页能力实测**（本机 `web_fetch` 被沙箱拦，返回 "resolves to a non-public IP address"）：

| 方式 | 结果 |
|---|---|
| 引擎/政策/条款类站点 | **`curl` 可达** |
| `ja.wikipedia.org` 等 | **`curl` 超时；`Invoke-WebRequest`（`fetch-page.ps1`）可达** |

**顺序**：`web_fetch` → `curl` → `Invoke-WebRequest`。

---

## 已知遗留

| # | 项 |
|---|---|
| 1 | `archive/engine/r3f_intro.md` 引用 `../banner-r3f.jpg`——**抓取时图片就没落盘**，仓库内不存在。属原始快照的既有缺口，**不做伪造补齐** |
| 2 | `docs/handOff/dsh-bundle-tourguide-2.5d/` 处于 **`restart-required`** 状态（bundle 装过但未重启生效） |
| 3 | `archive/page-cache/` 占 60.4 MB。保留它的唯一理由是原始字节可用于重新转换/取证 |
