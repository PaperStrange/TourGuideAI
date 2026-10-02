# 证据与产物存放规范（storage norm）

> **本规范不是文档，是一个门。** `node iteration/tools/gate-artifact-layout.mjs`
> **违规 → exit 1 → `run-gates` 红 → CI 红。** 规范本身是那个文件顶部的 `CLASSES` 表——**二者是同一个对象，所以不会漂移。**

## 为什么是门而不是文档

本仓库已经写下过教训然后重犯：`D-07` 的 README 描述从未存在的工作流 · `D-12` 的镜像枚举 · `D-44` 的四个常量副本 ·
**`.gitignore` 自己的注释写着 "the bare-directory trap has now hit three times"**。
**本仓库已有的结论是：把教训写下来不是阻止它发生的东西，把产物接线才是。**

## 逐类规则

| 类 | 放哪 | git | 为什么 |
|---|---|---|---|
`fact-evidence` | `city-packs/*/evidence/` | **跟踪** | 事实溯源的字节。**`validate-doors` V10 读并哈希**，不进仓库则干净检出无法核验 |
`pack-tooling` | `city-packs/*/evidence/tools/` | 由该目录自己的 `.gitignore` 决定 | **建事实层的脚本**，与它们消费的证据同处 |
**`licence-evidence`** | **`docs/handOff/evidence/`** | **跟踪，且冻结** | **法律与许可原文。用户裁定为交接成果，不得移动 / 改名 / 覆盖 / 删除** |
`new-capture` | `.dsh/artifacts/evidence/` · `.dsh/artifacts/licences/` | **跟踪** | **今后新抓、且不属于某个 pack 的证据落这里** |
`curated-recon` | `iteration/recon/_fetch-intl│japan│_raw-review-zh/` | 跟踪 | 三条条款横评线的抓取页，被 `review-source-*.md` 逐条引用 |
`process-material` | `.dsh/artifacts/raw/` · `iteration/recon/_raw*` · `docs/handOff/archive/…/src/` | **忽略** | **调研过程，不是被引用的来源**；数十 MB 进仓库不会让任何主张变得可核验 |
`raw-slice-reincluded` | `docs/handOff/archive/corpora/geo-japan/` | 跟踪（**按名逐个 re-include**） | 三个原始切片，靠**文件名**否定才进来 |
`baked-page` | `iteration/viewer/index.html` | **忽略** | **由门重烤**；提交一份副本就是关于世界的第二个真相 |
`vendored-page` | `docs/pics/flowchart/mermaid_renderer.html` | 跟踪 | 重绘流程图所需的输入，不是本仓库代码的输出 |
`build-output` | `build/` | 忽略 | 派生物（`scene.bin` / `guide.json` / 页面） |

## 铁律四条

1. **未声明的存放位置一律失败。** 新位置必须在 `CLASSES` 表里**刻意加一行**——**"随手新建一个证据目录"就是这个门存在的理由。**
2. **表的顺序是承重的。** `find()` 取第一个匹配，**宽规则排在窄规则前面会静默吞掉它**——与 `.gitignore` 里裸目录否定击败具体否定是同一个形状。**窄的在前，宽的在后。**
   **这条我建门当天就犯了两次**（`curated-recon` 被 `process-material` 吞掉、`pack-tooling` 被 `fact-evidence` 吞掉），**两次都是那两档报 0 个文件、而它们的成员被错分**——所以它不只是提醒，是实测记录。
3. **同一份字节不得同时存在于两个声明过的库里**（`rule: duplicate`）。**`D-23`：重复证据会把引用拆到两个真相上。**
4. **`docs/handOff/evidence/` 冻结。** 任何增删改 → `rule: handoff-frozen`。**包括那个坏抓取**——就地重抓会毁掉"这次抓取失败过"这个证据。

## 给新成员与新 subagent 的第一条指令

```bash
node iteration/tools/gate-artifact-layout.mjs               # 我是否合规
node iteration/tools/gate-artifact-layout.mjs --self-test    # 它是否真的会失败
```

**第二条命令是重点。** 一个只见过它通过的检查还没有被测试过——**本仓库为此付过代价**：`gate-scene-read` 的 `R3` 把容器版本写成字面量，于是在容器换代到 v2 之后**仍然通过**，而同文件的 `R7`（做真实算术）当场抓住了它。

## 例外只走一条路

- **要新增存放位置或改变某一类的跟踪状态**：改 `CLASSES` 表里对应的那一行，**并在提交信息里说明为什么**。
- **要重新生成交接基线**：`--accept-handoff-baseline`——**那是一次刻意动作，不是把红门弄绿的手段。**

## 相关的两份文件

- `iteration/design/licence-register.md` —— 许可条款登记，以及 6 个曾被孤立文件的处置
- `iteration/recon/evidence-inventory.md` —— 逐处现状盘点（只列举，未搬运）
