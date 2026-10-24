# 候选 12 的原生隐藏与恢复

2026-10-24，当前候选包通过 13/13 项原生验证。同一真实浏览器窗口中的第二标签页激活后，应用收到受信任的 hidden 事件；等待稳定 1500 ms 后，实际采样 2018.3 ms，绘制、更新以及客户端和服务器街区请求增量均为 0。返回应用后收到受信任的 visible 事件，玩家位置与保存的私有镜头值一致。没有页面异常或包内资源缺失。

| 证据 | 身份或结果 |
| --- | --- |
| 源码提交 | `06a2c496da689b5c18797b2f77ef1f03cb2857ab` |
| 不可变候选包 | `e86aa1c715fb76cd111feae41a0383ee34005aefd64fe5c48eba7615676e5733`，446 个文件 |
| 街区 manifest | `86e4f424a36cb858c16f6e282ad8ceb8f146d6b285d482de3c0ce2fe2f726b61` |
| 实际执行驱动 | `bea409358fc8ec615e88794ed92226636bb9078019f21636a293043a396aa873` |
| 未修改的启动辅助脚本 | `6e84c4f3b9d990024ebdca22b97b5a939c43affcbb1c9935ad792ce94ef06691` |
| 原始结果解压 SHA256 | `0d4af8a27564837162d0d8e81a81d3b3e1cfd3954ac19f2ab9ca80a23f7c0d61` |
| Chromium / Playwright | `151.0.7922.173` / `1.62.1` |
| 原生窗口 | `783703980`，正常窗口 1448×1085 |
| 应用 target | `4A94C1F98CEAA86DB543F4B0B151E900` |
| 第二标签页 target | `3DB0443EB121C8DA24C9280CD2A5DC62` |
| 共同上下文 | `E425CF8D244156A12B5623232C996BD6` |
| 原生事件（页面时钟） | hidden 17543.9 ms，visible 21141.9 ms；均 `isTrusted=true` |
| 隐藏工作 | 2018.3 ms：绘制 0，更新 0，街区请求 0；脚本 CPU 0 ms，总任务 CPU 0.296 ms |
| 结束 | 04:41:12.916Z；Chromium 退出码 0；浏览器、HTTP 服务器及 Xvfb 均关闭 |

本次沿用[候选 11 已通过的方法](../candidate-11-native-visibility/README.md)，仅更换候选包路径、固定 SHA、证据目录与身份错误提示。直接启动 Chromium，通过公开 `connectOverCDP({noDefaults:true})` 连接既有默认上下文；确认两个页面共享原生窗口后才观察实际切换。没有发送可见性、生命周期或焦点仿真覆盖命令。全部旧成功与失败记录继续保留。

显示编号 92、Xvfb 二进制及参数、检查阈值保持不变。页面为 1440×1000、DPR 1、英文、正常运动、白天，实际画布 975×706；真实回环 HTTP 的网络条件为 80 ms 延迟、上下行 1,250,000 B/s，无请求拦截。实际 WebGL 为 ANGLE Vulkan 1.3.0 SwiftShader，抗锯齿 true。

[result.json.gz](result.json.gz) 保存完整命令行、实际 WebGL 属性、目标与窗口身份、应用快照、请求记录、全部检查和 446 个候选文件身份。[binding.json](binding.json) 记录六个原始证据文件的压缩/解压 SHA，并固定引用[共享构建及源码证据](../native-visibility/README.md)。驱动、辅助脚本、服务器 manifest 与日志均在本目录，日志使用确定性 gzip 无损归档。认证 cookie 和浏览器用户资料不归档。

原有 `artifacts/x92` 已保留到 `artifacts/x92-candidate-11-closed`，随后由未修改的辅助脚本创建新的空临时目录；配置、用户资料、缓存、XKB 输出和运行文件仍定位在 artifacts。浏览器日志中的系统集成、NSS、外部 TLS 和初始 GPU 错误原样保留，TLS 检查保持开启；固定包资源由真实回环 HTTP 服务提供。

本记录仅验证当前候选的原生隐藏与恢复。物理 GPU、普通运行配置下的性能以及新材质和相机提示的视觉验收继续由各自证据说明。本次没有应用代码变更。
