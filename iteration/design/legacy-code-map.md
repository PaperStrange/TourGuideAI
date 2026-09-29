# 遗留代码地图（Legacy code map）

> **为什么有这份文件。** `iteration/` 下同时住着**上一代产品**（一个 AI 旅游规划 Web 应用）和**这一代产品**（2.5D 旅行模拟游戏）。
> 两者混在一起，**任何人（包括未来的 agent）看到 `src/` 里 234 个文件，都会以为那是产品**。**而新产品还没开始写。**
> 本文件的作用就是让那个边界**可见**：哪些是活的、哪些是待开采的、哪些是死的。

---

## 1. 一句话

**`src/` 与 `server/` 属于上一代产品。本轮的产物是 `city-packs/` 与 `iteration/`。**
**10 道门一道都不读 `src/`** —— 它们只读 `city-packs/` 与 `iteration/`。

---

## 2. 分区

| 路径 | 归属 | 状态 | 门是否读它 |
|---|---|---|---|
| **`city-packs/`** | **这一代** | **活** —— 事实层（19 place / 6 腿 / 12 门 / ODbL 分表） | ✅ 4 道门 |
| **`iteration/`** | **这一代** | **活** —— 设计内核、契约、调研、工具、登记册 | ✅ 4 道门 |
| `.github/workflows/` | **这一代** | **活** —— 门本身 | — |
| `docs/handOff/` | **这一代** | **活** —— 条款证据快照 + bundle 工具 | ✅ 3 道门 |
| `src/` | **上一代** | **待开采** —— 见 §3 | ❌ |
| `server/` | **上一代** | **保留待判**（用户决定：不删、也不给角色） | ❌ |
| `tests/`、`scripts/`、`deployment/`、`public/`、`build/` | **上一代** | 同上 | ❌ |

---

## 3. `src/` 的处置（**依据 `recon-codebase-salvage.md`，不是我的判断**）

`recon` 的结论：

| recon 结论 | 内容 |
|---|---|
**值得抽取复用：约 4,500 行** | `server/routes/googlemaps.js`(341)、`server/routes/openai.js`(301)、`server/utils/vaultService.js`+`tokenProvider.js`、**`src/core/services/storage/`(862)**、**`src/features/travel-planning/components/`(1,171)**、**`src/components/Timeline/`(559)**、**`src/contexts/`(412)**、`.cursor/.workflows`(312) |
**必须从零重写** | 每一个 prompt 与 JSON 契约；客户端 LLM 模块；**2.5D 渲染器及其全部……** |
**第一天就删** | `src/features/beta-program/` 减去 auth、`src/tests/` 减去 12 个文件、`src/api/`、`src/services…` |
**可零损失删除** | **约 77,000 行**（其中约 12,000 是生成的覆盖率 HTML） |

**注意**：**可复用清单里大部分在 `server/`**，而用户已决定 `server/` **不删、也不给角色**。
`src/` 里的可复用项是那**四个具体子目录**（`core/services/storage/`、`features/travel-planning/components/`、`components/Timeline/`、`contexts/`）。

**所以"删掉 `src/`"是错的**——`recon` 明确列了要留的东西。**不该按目录粒度删，该按清单粒度搬。**

---

## 4. 建议的下一步（**未执行，等决定**）

把 `recon` 点名的四个 `src/` 子目录与 `server/` 整体，搬到一个**明确标注为参照**的位置，例如：

```
iteration/reference/legacy/
  src-core-services-storage/          (862 行，recon 点名)
  src-features-travel-planning/       (1,171 行，recon 点名)
  src-components-Timeline/            (559 行，recon 点名)
  src-contexts/                       (412 行，recon 点名)
  server/                             (用户决定保留，整目录照搬)
  SALVAGE.md                          (每个目录：可复用什么、为什么要重写什么)
```

**然后从活跃树里删掉 `src/` 其余部分**（按 `recon` 的"第一天就删"与"可零损失删除"清单）。

**收益**：`src/` 不再冒充产品；**约 227 条依赖告警所依附的清单**不再在活跃树上（你的"暂时不管"于是变成"没有东西可管"）。
**代价**：一次 234 文件规模的搬运；且需先确认四个子目录确实如 `recon` 所说可复用。

---

## 5. 本文件自身的维护规则

**搬迁完成后，本文件必须更新**——否则它会变成下一份"文档描述的仓库已不存在"的文档，也就是登记册里 D-06/D-07/D-08 的那一类。
**R4 已在守这条**：`iteration/design/` 下的文档必须在版本控制里且存在。
