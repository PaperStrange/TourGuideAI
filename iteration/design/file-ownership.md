# 文件所有权（File ownership）

> ## ⚠️ 派单前必读：一个文件只有一个 owner
>
> **为什么这张表存在。** 我在同一个会话里把 `validate-doors.mjs` 反复派给两个不同的人，然后**用"串行化"去补**——
> **串行化只把冲突变成排队，没有解决"两个人拥有同一个文件"。** 用户指出这不是疏忽，是没有系统核对就派单。
> **而根因不是记性：是这张表不存在。** 它现在存在，所以下一次是**查表**，不是**回想**。

---

## 1 · 判据（一条）

**一个文件在任一时刻只有一个 owner。跨角色需要改同一个文件时，由 owner 执行，另一方只提供判据。**

---

## 2 · 现况：四个文件被多张卡写过，其中一个是真问题

### 2026-10-05 · 新版独立结构

用户明确允许另建结构，无须适配历史目录。新的 `experience/` 是独立 Vite/Three.js
应用；参考已有内容与状态契约，但运行时不得导入 `iteration/`。旧证据与源码保留。

| 新路径 | 唯一 owner | 本次职责 |
|---|---|---|
| `experience/package.json`, `package-lock.json`, `vite.config.js`, `src/runtime/`, `src/simulation/` | engineering | 独立构建、3D 镜头/渲染/输入与模拟；先交付可验证的 encounter |
| `experience/art/`, `experience/public/models/`, `experience/docs/art-direction.md` | art-ux | 改进建筑/光影资产、语义分组、Blender 生成与 provenance |
| `experience/src/content/`, `experience/public/content-evidence/`, `experience/public/credits.html`, `experience/docs/content-contract.md`, `experience/docs/facade-references.md` | world-content | 迁移已证实内容与几何，保留事实来源；建筑照片参考、许可与署名 |
| `experience/src/ui/i18n.js`, `experience/docs/immersion.md` | product-design | 英中交互与沉浸设计，区分用户意图与提案 |
| `experience/tests/`, `experience/docs/validation.md` | qa-release | 独立测试与最终验收记录 |
| `experience/index.html`, `.gitignore`, `README.md`, `src/app/`, `src/ui/styles.css`, `src/ui/assets/`, `tools/`, `docs/architecture.md`, `docs/github-research.md`, `docs/iteration.md`, `evidence/` | lead | 新应用 UI 整合、技术研究、计划与证据打包 |

以上路径均相对 `experience/`；专业 owner 间通过 API/资产契约协作，不交叉覆盖文件。
独立应用的 `.github/workflows/experience.yml` 及其 `.github/workflows/README.md` 登记项由 lead 维护，只负责构建/测试与证据，不部署。
仓库根 `README.md` 的新版入口说明由 lead 维护，旧应用说明保留为历史索引。
仓库根 `PREVIEW.md` 及独立 `gh-pages` 分支的已验证静态构建由 lead 维护，用于跨会话评审与托管交接。

| 文件 | 历史卡 | **owner（唯一）** | 判定 |
|---|---|---|---|
**`city-packs/kyoto-shijo/doors.json`** | task-2, 15, 19, 20 | **`doors-author`** | ✅ 一直一个 owner |
**`city-packs/kyoto-shijo/validate-doors.mjs`** | task-9, 15, **18** | **`doors-author`** | ❌ **task-18 让 `geo-contract` 也写了它——那是我派错的** |
**`docs/handOff/dsh-bundle-tourguide-2.5d/tools/world-grid.mjs`** | task-1, 8, 13, 18 | **`geo-contract`** | ✅ 一直一个 owner |
**`iteration/design/contract-geo-pipeline.md`** | task-1, 8, 13, 18 | **`geo-contract`** | ✅ 同上 |
**`iteration/tools/emit-scene.mjs`** | task-13, 18 | **`geo-contract`** | ✅ 同上 |
**`iteration/tools/emit-guide.mjs`** | task-16, 18 | **`export-guard`** | ✅ |
**`iteration/tools/validate-guide.mjs`** | task-16, 18 | **`export-guard`** | ✅ |
**`city-packs/kyoto-shijo/evidence/`** | task-10, 12, 14 | **`pack-curator`** | ✅ |
**`city-packs/kyoto-shijo/places.json`** · `transit.json` · `pack.json` | task-10, 12, 14 | **`pack-curator`** | ✅ |
**`iteration/tools/run-gates.mjs`** | 多张卡 | **`lead`** | ✅（成员不得自行改门数） |
**`iteration/design/delivery-board.md`** | task-SP0 (2026-10-05 SOW delivery planning) | **`lead`** | ✅ 当前计划、澄清状态与 sprint 索引；专业 agent 只读评审，不共享写权限 |
**`iteration/design/first-playable-brief.md`** | task-SP1 (2026-10-05 first playable definition) | **`art-ux`** | ✅ 当前 `art_ux` agent 唯一写入；game design / QA 给判据、只读评审；不转移既有客户端或事实层文件的所有权 |
**`iteration/game/package.json`** · `iteration/game/package-lock.json` · `iteration/game/vite.config.js` · `iteration/game/src/game.js` · `iteration/game/src/simulation.js` · `iteration/game/src/scene-config.js` | task-SP2-runtime | **`engineering`** | 新隔离运行时；不改变旧 viewer / geo 文件所有权 |
**`iteration/game/src/render-world.js`** · `iteration/design/visual-target.md` | task-SP2-art | **`art-ux`** | 新场景绘制与目标说明；`iteration/game/public/art/` 新素材逐项由此角色交付 |
**`iteration/game/src/content.js`** | task-SP3-content | **`world-content`** | 新切片消费数据；`iteration/game/public/content-evidence/` 来源快照由此角色交付，不改旧 city-pack |
**`iteration/game/src/i18n.js`** | task-SP3-localization | **`product-design`** | 英中界面文案与插值 |
**`iteration/game/index.html`** · `iteration/game/src/app.js` · `iteration/game/src/styles.css` · `iteration/game/README.md` · `iteration/game/.gitignore` | task-SP3-integration | **`lead`** | 页面整合、可访问界面与使用说明 |
**`iteration/game/src/assets/kyoto-sans.woff`** · `iteration/game/src/assets/NOTO-LICENSE.txt` · `iteration/game/src/assets/THIRD-PARTY-NOTICES.txt` | task-SP3-fonts | **`lead`** | 离线英中字体子集与随包授权声明 |
**`iteration/tools/gate-artifact-layout.mjs`** | task-SP3-integration | **`lead`** | 明确登记 authored game entry HTML；保持来源快照与派生产物规则 |
**`iteration/design/blender-depth-research.md`** · `iteration/experiments/blender-depth/README.md` | task-V3D-research | **`lead`** | 下一迭代立体表现目标、技术评估与阶段计划 |
**`iteration/experiments/blender-depth/build_scene.py`** | task-V3D-art-spike | **`art-ux`** | Blender 可复现小场景与导出；研究产物写入 workspace scratch，不覆盖首个可玩版 |
**`iteration/experiments/blender-depth/package.json`** · `package-lock.json` · `probe.mjs` | task-V3D-runtime-spike | **`engineering`** | 独立 glTF 浏览器验证，临时页面/资产写入 scratch；现有 game 运行时保持原样 |
**`.dsh/artifacts/evidence/blender-depth/`** 本次复制的 Blender/浏览器 PNG 与 `metrics.json`、`world.json`、`build-report.json`、`qa-result.json`、`reproducibility.json`、`qa-runner.cjs` | task-V3D-research-evidence | **`lead`** | 原样保留最终研究证据与执行器专用 QA 脚本；不把静态资产实验算作可玩版本验收 |
**`iteration/design/first-playable-result.md`** | task-SP3-review | **`qa-release`** | 独立浏览器验收记录；`iteration/game/qa/` 临时验证代码由此角色独占 |
**`.dsh/artifacts/evidence/first-playable/`** 本次交付的 `browser-result.json`、`manifest.json`、15 张 PNG 与英中 `played-field-notes-*.html` | task-SP3-delivery | **`lead`** | 从 QA 最终构建记录原样复制的交付证据；不把截图/技术检查标记为用户验收 |
**`iteration/design/door-type-model.md`** | task-19 | **`doors-author`** | ✅（**门类型分类的扩展点**；§7 是"新增一个门类型"的更新路径，**所以下一张分类卡会想改它**——无主即是 §5 所说的下一个冲突种子） |
**`city-packs/kyoto-shijo/kyoto-shijo-osm.json`** | task-20 | **`doors-author`** | ✅ **`doors-author` 于 2026-10-03 报领**（它持有门的 ODbL 记录；§4：首次出现的文件由产物所属角色认领）。**它一直是事实层 ODbL 分表（GAP-6）的半边，此前无行**——又一个"没有 owner 的文件是下一个冲突的种子"的实例。 |
**`iteration/viewer/`**（含 `index.html` 与 `scene-data.js`） | task-17 | **`export-guard`** | ✅（**`index.html` 是 `baked-page`，忽略且由 `bake-viewer` 重烤**） |
**`iteration/tools/check-viewer.mjs`** · **`bake-viewer.mjs`** | task-17, 18 | **`export-guard`** | ✅ 此前无行——**`task-23` 会动它们，所以现在补上**。**"没有 owner 的文件是下一个冲突的种子"，这已经是第三次实例**（`validate-doors.mjs` → `kyoto-shijo-osm.json` → 这两个） |
**`city-packs/kyoto-shijo/evidence/tools/`** | task-10, 12, 20 | **`pack-curator`** | ✅（**事实层的构建脚本**；`block-doors.json` 在这里是 `attestations/` 的**上游**——`merge-pack-meta.mjs:35` 每次构建都从它发布，**所以只改下游会在下次构建被静默回退**，由 `pack-curator` 报出） |
**`city-packs/kyoto-shijo/attestations/`** | task-3, 10, 20 | **目录不是所有权单位，文件才是** | ⚠️ **两个角色都写这个目录、但写不同文件**：`source-attestations.json` 与 `block-doors.json` 是 **`pack-curator`**（产出者）的，`verification-verifier.json` 是 **`fact-verifier`**（核验者）的。**所以所有权按文件记，不按目录记。** |

---

## 3 · 由此得到的**跨角色规则**（不是例外，是常规做法）

**`validate-doors.mjs` 的 owner 是 `doors-author`**——因为它验的是 `doors.json`，而那是它的产物。

**所以 `geo-contract` 需要改门侧断言时，它【不写这个文件】，而是：**

1. 在 `world-grid.mjs` 里**导出**那个常量（**它是常量的 owner**）
2. **把判据写给 `doors-author`**，由后者在 `validate-doors.mjs` 里落成断言

**两个好处，第二个才是重点：**
- 所有权清楚
- **常量由"常量方"提供、断言由"被验方的相邻角色"写**——**这比一个人既给常量又给断言更接近独立核验**

**同理**：`export-guard` 需要 scene 侧改动时，**不写 `emit-scene.mjs`**（`geo-contract` 的），而是把判据写给后者。

---

## 3a · **例外：可证明往返的临时证伪**（`doors-author` 指出，我采纳）

**它指出了一个我自己规则里的真缺陷**，而我采纳它的写法：

> **本项目的卡反复要求"新增断言必须被证明会响"**——而去证明它，**通常要临时改一个【不属于执行者】的文件**（例如临时给 `world-grid.mjs` 的枚举加一个假成员，看门侧断言是否变红）。
> **按 §3 严格读，那条验收判据根本无法执行。两条规则相撞。**

**所以 §3 加一条明确例外：**

> **一个 agent 可以临时改动不属于它的文件，当且仅当四件事同时成立**：
> 1. **先快照**（**快照只用于 diff，绝不用于还原**——从快照还原会覆盖期间别人的写入）
> 2. **改动是精确字符串替换**（不是正则、不是重写）
> 3. **还原是它的精确逆操作**
> 4. **前后字节哈希相等，并把两个哈希都报出来**
>
> **那不叫"改"，那叫【带证明的往返】。**

**为什么这条例外安全**：**它不依赖"没有人并发写"，它依赖哈希证明。** **§3 的独占目的在于防静默丢失，而往返证明同样能防**——**且它对 30 秒的测试是唯一可行的形状。**

**仍然禁止**：**任何【不还原】的跨所有权改动。** 那没有例外。

**执行者仍须报告"我改了谁的文件、快照哈希、还原后哈希"**——**四个条件里第 4 条就是把这件事变成可核的。**


---

## 3b · **同一 owner 的重叠不是冲突**

`team_task_list` 会给**任何两张写入范围相交的卡**报 `writeScopeWarnings`。**而它分不出两种情况：**

| 情况 | 例 | 判定 |
|---|---|---|
**同一 owner 的两张卡** | `task-19` 与 `task-20`，都是 `doors-author`，都写 `doors.json` | ✅ **不是冲突**——同一个人按序做，不会互删对方的设计 |
**不同 owner 的同一文件** | `task-21` 原本给 `geo-contract` 写 `validate-doors.mjs`，而那是 `doors-author` 的 | ❌ **是真冲突**——`geo-contract` 改动时的基线是旧版，**不会故意删对方的断言，但会静默丢失** |

**所以：读到 `writeScopeWarnings` 时，先问"是同一个 owner 吗"，再决定要不要改卡。**
**而这条区分是必要的，因为把 `task-19/20` 的重叠也当冲突去改，是对正确设计的破坏。**

## 4 · 派单检查（按顺序做，**不要跳**）

1. **列出现有 owner**：读本表 §2
2. **新卡的 `write_scopes` 逐项对表**——**命中已有 owner 且 owner ≠ 新卡归属 → 该文件不进新卡范围**
3. **需要跨角色改动时，走 §3 的规则**（owner 执行，另一方给判据）
4. **只有 1–3 都做完，才写卡**
5. **跑 `node iteration/tools/check-task-ownership.mjs`** —— 它从本表解析 owner，打印每个文件的归属，**并给出写卡前的五步**。**它不替代 §2 的对表，它是让我不必靠记性的那一步。**

### 我为什么把这一步做成脚本（连着被你提醒三次之后）
`team_task_list` 的 `writeScopeWarnings` **不能做这件事**：它对**任何**范围相交都报，**包括早已完成并合并的历史卡**（`task-2`/`9`/`15`/`16`/`17`/`18`…）。**所以它在这个板上是永久假阳性，而我学会了读过去——那正是"一个吵闹的守卫会被关掉"从内部看的样子。**
**真正防住我那个错的规则更窄：在【未完成】的卡之间，每个文件至多一个 owner。**
**而由此推出一条更简单的话**：**碰同一个文件的卡，就是一个 owner 的卡。** 这样"派错"根本不是一个独立失效模式。


**本表不完整时（新文件首次出现）**：**由产物所属角色的 owner 认领**，并**在本表加一行**。
**没有 owner 的文件是下一个冲突的种子**——**那正是 `validate-doors.mjs` 走到今天的原因。**

---

## 4b · **重烤一个 baked artifact 的权限**（`doors-author` 报出，2026-10-03）

**问题**：`task-20` 要求"重烤后 viewer 门仍通过"，而 `iteration/viewer/index.html` 是 `export-guard` 的。**`doors-author` 重烤了它，然后报告问"谁可以重烤"**——**这与 `task-19` 的 world-grid 证伪是同一类问题。**

**规则（与 §3a 同一条纪律）**：

> **一个 baked artifact 可以由【其卡片要求它通过】的任何人重烤**，条件：
> 1. **先快照**（只供 diff）
> 2. **重烤前报告改动前哈希，重烤后报告改动后哈希**
> 3. **不得手改烘焙物**——只许用生成器重烤
> 4. **若重烤后仍红，那不是重烤者的责任**，报出来即可

**为什么不是"只有 owner 能重烤"**：**烘焙物是派生物**，重烤它**不改变任何设计**，而**拦一道会让每张卡多一个来回**。**而第 2 条条件把"谁烤的"变成可核的**——**那才是真正的保障，不是所有权。**

### 而由此得到一条卡片模板规则（`doors-author` 的原话值得照抄）
> **"重烤场景"实际是"重烤 scene AND page"**——因为 `index.html` **内联了全部四层**，只重烤场景会让 `V8/V8b` 变红（`collision identical false`），重烤页面才修好。
> **所以卡里不能只写"重烤场景"。**

## 4c · **同一 owner 的卡在同一个文件上，不是重合**（补 §3b 的推论）

**由"一个文件一个 owner"直接推出**：

> **碰同一个文件的卡，就是一个 owner 的卡。**
> **所以"派错 owner"根本不是一个独立失效模式——只要你按 owner 拆卡。**

**而我违反的正是这一条**：`task-21` 给了 `geo-contract`，**而同一批文件（`validate-doors.mjs`）已归 `doors-author`。** 我当时用"串行化"去补，**那补的是并发，不是归属。**

## 4d · **一个角色一个提交**（我在 `41cb0ae` 里违反了它）

**事实**：我那一个提交含 **16 个文件、三个角色的改动**（`doors-author` 的 `doors.json`/`validate-doors.mjs`/`kyoto-shijo-osm.json`/两个 viewer checker，`pack-curator` 的 `places.json`/`attestations`/`evidence/tools`，我自己的 `gate-scene-read`/`file-ownership`/`check-task-ownership`），**而提交信息只讲了我做的那一件事。**

**为什么这有害**：`git log` 是"谁为什么改了什么"的账。**一个信息只描述六分之一内容的提交，让下一个读者无法把改动归因到决定。** 而本项目的全部努力都在"每个值能指回它的来源"——**提交历史是同一件事的另一面。**

**规则**：
> **每个角色提交自己的文件，用自己的验证状态作信息。** Lead 的 `git add -A` **不得**用来收拾别人的工作区。
> **若 Lead 必须代为提交**（角色已停工、我要收口），**提交信息必须逐角色分段**，说清每段是谁的、依据是什么。

**而它同时解释了为什么我该让角色自己提交**：`doors-author` 报了完成却"未提交"——因为它一直等我说。**那是我造成了这次混装。**

## 4e · **§3a 的补丁：改到一半的窗口里，别人会读到你**

**事实（`pack-curator` 报出，2026-10-03）**：它跑 `run-gates` 时得到
```
3 gate(s) FAILED: scene-read, viewer, viewer-page
ReferenceError: existsSync is not defined   at gate-scene-read.mjs:126
```
**那不是数据失败——是我在给 `gate-scene-read` 加 R3b 断言时、还没补 `import { existsSync }` 的那几分钟窗口。**
**它先归因为"另一个 workstream 的并发写"，我核了时间线：是我的编辑窗口，不是别人的。**

**所以 §3a 不完整**：它规定了**改的人**必须快照/精确替换/还原/报哈希，**但没规定"改的时候别人不该读"**。**而 §3a 的例外恰恰是 Lead 会做的操作，所以这个窗口必然出现。**

**补丁（两条，缺一不可）**：
> **1 · 做 §3a 例外改动的人，改完必须立刻跑一次那个文件所属的门，并在报告里贴出结果。** 编辑窗口越短越好，而"立刻验证"是唯一能保证这点的动作。
> **2 · 一个角色在跑全套门之前，先确认没有别的角色在编辑。** 若不确认，**就会把别人的半成品当成世界出问题**——而那正是这次发生的事，**代价是它花时间排查了一个不属于它的 `ReferenceError`。**

**为什么这不是"多此一举"**：`run-gates` **读磁盘上的脚本并执行它们**，**所以它对"正在被写的文件"没有隔离**。**这与沙箱、与并发控制都无关，是编辑窗口固有的。**

## 4f · **续开旧卡，不要新建卡**（这是我派单逻辑里真正的错）

**用户连着三次提醒排程，而我每次都在改"卡的内容"。改错了地方。**

**事实**：我新建的 **5 张卡，5 张都触发重合警告**。而其中 **`task-23` 的文件（`iteration/viewer/`、`check-viewer.mjs`）已经是 `task-17` 的写入范围、也已经是 `export-guard` 的。**
**⇒ 那我就不该新建卡，该把 `task-17` 续开。** 新建一张同 owner、同文件的卡，**只会让板子多一条永远清不掉的警告**。

**规则**：
> **动手写新卡之前先问一句：这组文件 + 这个 owner，有没有已经存在的卡？**
> - **有 → 续开它**（改描述、加验收判据、必要时 `reopen`）
> - **没有 → 才新建**
> **同 owner + 同文件 + 新工作 = 续开。** 这是"一个角色一个提交"（§4d）在卡层面的同一件事。

**而另一件我必须说清，因为它决定了"修不修得掉"**：
> **`writeScopeWarnings` 挂在【已完成】的卡上时，我无论如何都清不掉。** 板子拿每张卡的历史范围去比当前卡，**而不区分"这个角色改过这些文件"与"这个角色拥有这些文件"**。
> **所以 `task-17`（S4a）与 `task-18`（S4b）上那两条警告会一直在，直到那两张卡被删除。它们的长期存在不是失败信号，是板子的口径。**
> **我先前每次都在改卡，是因为我把它当成了失败信号。** 而正确的动作是：**不新建会与之相交的卡**。

**由此得到一条可查的判据**（`check-task-ownership.mjs` 的第 6 步）：
> **新卡的文件集若与某张已完成卡的范围相交，且 owner 相同 → 你要的不是新卡。**

## 4g · 三条许可线【已关闭】——派单前先读这一段

| 成员 | 状态 | 依据 |
|---|---|---|
`review-src-intl` | **已关闭** | 结论排他（Google §14.2 + 底图 OSM 派生）；POI 候选已判完 |
`review-src-jp` | **已关闭** | **它自己判定：调研作为【背景】有效，但作为【待办】没有落点。** **⚠️ 而这里原先引的是"作为待办已死"——那句话是 Lead 编的，它已复核否认**（且即使按它原话写，只留后半句也会让读者以为"日本线什么都没找到"，**而日本线是三条线里唯一取到肯定结论的**）。**详见 `status.md` 的同一行** |
`review-src-zh` | **已关闭**（**除非用户裁定保留 A4b**） | A4b 的许可依据全在它手里，所以只有 A4b 被保留时才重开 |

**名册在设计上不可移除**（`roster.js`："maximum **immutable** roster entries"）。**所以"关闭"= 写明 + 不派单**，而这一行就是那个写明。

**机制（查过源码）**：全插件只有两处 `startContinuable`，都在 `spawnAdmitted()`（创建那一刻）。**inactive 且收件箱为空的成员没有任何代码路径会唤醒它。** 三条线收件箱为空。

**⇒ 下一个人若要重开这三条线，先回答：§8b 里那个关闭理由现在还不成立吗？**

## 5 · 为什么"串行化"不够（写给下一次的我）

我当时的推理是：「三张卡都写 `validate-doors.mjs`，所以串行化就安全了。」

**那个推理漏了一步**：**串行化只保证不并发，不保证不覆盖彼此的设计。**
- `doors-author` 在 `validate-doors.mjs` 里加"`doorType` 必须在枚举里"的断言
- `geo-contract` 随后改同文件的 `V2`，**它的写入范围里没有 `doorType` 那条断言**——**它不会故意删，但它改动时的基线是旧版**
- **结果不是冲突，是静默丢失**

**而真正的判据不是"会不会同时写"，是"这个文件归谁"。** 归谁清楚了，串行不串行都不用讨论。

---

## 6 · 检查这条规则本身是否被遵守（机械的）

**本表在仓库里，所以可以被读。** 派单前跑：

```bash
# 一个文件的写入范围是否落进多个 owner
node -e "const t=require('fs').readFileSync('iteration/design/file-ownership.md','utf8'); console.log(t.split('\n').filter(l=>l.startsWith('**')).length + ' owner rows')"
```

**而更强的做法**（未做，因为收益待评估）：把 owner 表做成数据文件，让派单工具直接校验 `write_scopes`。
**现在写成文档，是因为文档能被读；而"能被读"是它比我的记性好的唯一理由。**
