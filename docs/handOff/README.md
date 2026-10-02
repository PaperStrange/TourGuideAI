# docs/handOff/ —— 交接成果的存放位置

> **这份文件补的是缺了的那一样东西：一个声明"什么该放在这里"的清单。**
> 用户指出我的判断有个洞：我核实了「**这个文件夹能不能被改**」，**没有核实「这个文件夹是不是成果该在的地方」**。
> **"不要动它"是推论，不是规则**——推论的前提是「它是明确的成果存放位置」。**前提成立与否，要有判据可查，否则每个读者各自推一遍。**
> 本文件就是那个判据。**它同时列出已经错位的东西**（§4）——**因为一个不列出错位的清单，就是一份会被误读为"一切正常"的清单。**

---

## 1 · 判据：三问

一个文件属于交接成果、应当放在 `docs/handOff/`，当且仅当**三问皆答"是"**：

| # | 问题 | 判"否"时的去处 |
|---|---|---|
**问 1** | **它是【已完成的产出】，而不是【正在进行的工作】吗？** | 进行中的东西留 `iteration/` |
**问 2** | **接手的团队要理解这个项目，必须读到它吗？** | 只有当前开发需要的，留 `iteration/` |
**问 3** | **它稳定吗**——即它的内容不再随开发改动？ | 会随开发改动的，留 `iteration/` |

**三问之外的第四条，是硬约束（§3）**：**某些目录不能放这里，因为工具链按固定路径读它们。**

---

## 2 · 现状：这里实际有什么

| 目录 | 文件 | 体量 | 三问 | 判定 |
|---|---|---|---|---|
`archive/` | 576 | 90.1 MB | ✅✅✅ | **是**——原始抓取与旧版语料，`handoff-dedupe.mjs` 与 `reorganize-handoff.mjs` 把它整理进这里 |
`dsh-bundle-tourguide-2.5d/` | 30 | 0.5 MB | ✅✅✅ | **是**——工具包本身 |
`evidence/` | 14 | 2.4 MB | ✅✅✅ | **是**——许可原文快照，且**用户裁定为交接成果，冻结** |

**工具佐证这是设计意图**（不是我的推断）：
- `handoff-consolidate.mjs`：*"consolidate evidence dirs **by PURPOSE**"*
- `reorganize-handoff.mjs`：*"Moves named files into target subdirectories and rebases every relative link against the file's NEW location"*
- `handoff-dedupe.mjs`：*"Deletes exact byte-identical duplicates … and the unrelated recon-cache directory"*

**三个工具都在做同一件事：把成果收进 `docs/handOff/`。** 所以「这个文件夹是成果存放位置」**有工具为证，不是我的假设**——而我上一轮没查这一步就下了结论。

---

## 3 · 硬约束：有些东西不能放这里

| 东西 | 现在在哪 | 为什么不搬 |
|---|---|---|
**`.dsh/skills/tourguide-fact-integrity/`** | `.dsh/skills/` | **这是项目规范，必须随干净检出存活**（`.gitignore` 第 558 行的原文理由），而 **`.dsh/` 其余部分被忽略**。**搬进来会改变它被工具链发现的方式** |
**`.dsh/experts/tourguide-reality-loop-team/`** | `.dsh/experts/` | **专家团定义由 harness 按该路径加载**。**搬到 `docs/handOff/` 会让它在下次会话里加载不到** |
**`iteration/`（design / recon / tools / viewer）** | `iteration/` | **三问皆"否"**：它是**进行中的工作**、**随开发改动**、**接手者需要的是它的结论（已在 `docs/handOff/archive/` 与 `iteration/recon/` 的报告里），不是它的工作副本** |

---

## 4 · ⚠️ 已确认错位的一处（本清单存在的理由）

**技能文档声明 `docs/handOff/` 含 `reference/`**——

```
"Verbatim licensing evidence (Google Maps ToS, ODbL, OSM tile policy) plus the research plan
 and plugin survey: docs/handOff/ (evidence/, reference/)"
```

**而 `docs/handOff/reference/` 不存在。** 那三样实际在 **`iteration/reference/`**：

| 文件 | 技能里的称呼 | 实际位置 |
|---|---|---|
`DSH-PLUGINS-FOR-2.5D.md` | plugin survey | `iteration/reference/` |
`research-plan-jobs1.txt` | research plan | `iteration/reference/` |
`Q5_ai_in_the_loop.md` | （外部依据汇编） | `iteration/reference/` |
`README.md` | — | `iteration/reference/` |

**而它的 `README.md` 自述**：*「这些不是本项目的产出，而是**外部输入**」*——**外部输入、已整理完、接手者要读 → 三问皆"是"。**

**结论：它们【留在 `iteration/reference/`】，而技能文档那句是过时的。**

**改方向的依据（我的第一反应是错的，记下来）**：
- `iteration/README.md`（**2026-09-30 02:37**）比技能文件（**02:15**）**新 22 分钟**；
- 它开头写着「**本目录是入口。长期存活的文档与工具在这里（已进 git）**」；
- 而**它的"先读哪一份"表里明确列着** `| reference/ | 外部输入：DSH 插件清单、Q5 AI 落地证据、检索计划 |`；
- **物理事实也站在它一边**——文件就在 `iteration/reference/`。

**所以搬动会违反项目自己的入口 README。正确处置是修正技能里那句过时声明**（已改，见 `.dsh/skills/tourguide-fact-integrity/SKILL.md`），**而不是搬文件。**

**我的错在哪**：**我按自建的"三问"判出"应当搬"，却漏了查"项目自己怎么说"。** 而工作区里已经有一份**更权威、更新**的声明。
**顺序应当是：先查既有声明，再自己立判据**——否则就是用自己定的规则去覆盖别人写下的规则，而那正是这份文件本来要防的那类错误。

**这条错还有一层**：我的"三问"（已完成 / 接手者必读 / 稳定）**问的是"它是什么"**，而漏掉了**"它在哪、以及谁已经声明过它该在哪"**。


**我没有搬。** 理由：① 它带着一张 **4 个文件的相对链接网**（`README.md` 用 `../../README.md` 与三个同目录链接指向其余三个），搬动必须重写链接，而 `reorganize-handoff.mjs` 存在的理由正是这件事；② **`iteration/reference/` 在 `iteration` 分支上已被跟踪**，搬动会产生一次跨目录重命名，需要你确认；③ **本文的判据是我写的，它需要你认可才成为规则**——否则我只是用自己定的规则去移动别人的文件。

---

## 5 · 两条技能声明与现状不符（**已修正技能文件本身**）

| 技能声明 | 实测 |
|---|---|
**`evidence/` 是 "licence-clause snapshots **the gate scripts read by relative path**"** | **没有任何门在读它。** 全仓库只有两处命中该路径：我这一轮新写的 `gate-artifact-layout.mjs`，以及 `handoff-consolidate.mjs` 里一句描述意图的注释 |
**`dsh-bundle-tourguide-2.5d/` "must not move because it is **junction-linked** into the DSH profile"** | **它不是链接**（`LinkType` 为空，无 `Target`）。**"不可移动"的原理由已不成立**——但**本文件仍把它列为不可移动**，理由换成它是工具包本身，与链接无关 |

**两条都已就地修正**（`.dsh/skills/tourguide-fact-integrity/SKILL.md`），因为技能是**本项目的规范文件**（`iteration/README.md` 自己称它为「the document that states the fact-layer contract rules」）——**而一份描述着已不存在的世界的工作区规范，会把下一个会话指到错的地方去。**（`D-07` 是同一个形状：README 描述了从未存在的工作流。）
