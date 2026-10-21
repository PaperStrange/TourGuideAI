# 最终 CI 结果

运行 `39552515626` 已完成，结论为 `success`。来源提交为 `9f5725d94e5a82e18acdf116e6da8a034c82fe65`，应用包清单 SHA256 为 `3e72aa1c53596042a14d1fb2aae9556b0a2caa876be93d424ec9ebe2aebb0162`。

| 检查 | 原始报告 | 结果 |
| --- | --- | --- |
| 首页 | [homepage-result.json](homepage-result.json) | 65/65 |
| 旅行伴侣 | [travel-result.json](travel-result.json) | 73/73 |
| 共享视角 | [perspective-result.json](perspective-result.json) | 80/80 |
| 原始行走 | [browser-result.json](browser-result.json) | 133/133 |
| 单人探索 | [solo-result.json](solo-result.json) | 75/75 |
| 街区切换与行走 | [packs-result.json](packs-result.json) | 81/81 |
| 扩展页面流程 | [walkthrough-result.json](walkthrough-result.json) | 264/264 |
| 地理来源准备 | [source-preparation-job.txt](source-preparation-job.txt) | 18/18 |

[最终 GitHub 状态](completed-status.json) 保留运行、任务与 artifact 元数据。[文件验证记录](package-verification.json) 记录每个原始报告及下载 ZIP 的 SHA256，并确认 ZIP 与 GitHub digest 一致、全部 95 个构建文件的长度与 SHA256 和实际本地构建一致。七个浏览器报告均有完成时间，所有检查均通过。

地图首次加载失败后的实际重试、保存视角恢复和四个语言/视口组合的地图恢复均在完整流程中通过。原始诊断位于相邻 `initial/` 目录，保持其原始结果。

证据使用软件 GPU 自动执行；Q03 性能目标、人类视觉偏好和实地步行条件分别记录，未由这些通过数量推定。永久 API 地址和 artifact digest 保存在元数据中，临时下载地址未写入这些文件。
