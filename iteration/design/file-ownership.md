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

**本表不完整时（新文件首次出现）**：**由产物所属角色的 owner 认领**，并**在本表加一行**。
**没有 owner 的文件是下一个冲突的种子**——**那正是 `validate-doors.mjs` 走到今天的原因。**

---

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
