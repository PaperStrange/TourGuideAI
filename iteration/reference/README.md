# reference/ — 外部材料

这些不是本项目的产出，而是**外部输入**：本机工具链现状、他人整理的 AI 落地证据、当时的检索计划。

| 文件 | 是什么 |
|---|---|
| [`DSH-PLUGINS-FOR-2.5D.md`](DSH-PLUGINS-FOR-2.5D.md) | 本机 13 个 DSH 外置插件的清单与对本项目的用法判断（来自另一会话的整理）。**注意其中一条已被本会话证伪**：它把 `@weibaohui/experts-management` 归为可"多视角战略讨论"，但实测该插件的专家是 `modelInvocable: false`——**模型不可调用**，只有 composer 的 `/expert-<名称>` 用户手势能注入 |
| [`Q5_ai_in_the_loop.md`](Q5_ai_in_the_loop.md) | AI 在游戏中落地的证据汇编（按 URL 引用，非文件路径）。是本项目 LLM 叙事层设计的外部依据 |
| [`research-plan-jobs1.txt`](research-plan-jobs1.txt) | 当时 2.5D 调研的检索计划原始配置（URL + 正则 + 字符预算）。考古用 |

上级索引：[`../README.md`](../../README.md)
