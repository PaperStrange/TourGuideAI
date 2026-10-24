# 剩余延迟的只读调查

调查日期：2026-10-24。本次读取既有报告、应用源码和固定版本 Chromium 源码，没有执行浏览器、性能复测、测试或运行时代码修改。应用源码检查时 HEAD 为 `ef34dd3190c32642262210e5d4f773846e4e9046`；以下性能数值全部来自既有不可变候选包。

## 报告身份

候选 11 包 SHA256 为 `76c14e7ad8ea57fb81bed982376c5360765a36b0f6a158a45c021c1dc028b2ea`，应用源码提交为 `84e80a823d778b9b537fc45d311a62bc127723db`。标准驱动 SHA256 为 `1ab216a6b3d7039c42156a782ea0158edcc27f0bb5e58cb26ccf6c8f76709757`。条件为 system Chromium 151.0.7922.173、headless SwiftShader、正常运动、抗锯齿开启、1440×1000 / DPR 1、真实回环 HTTP 加 10 Mbit/s / 80 ms CDP 限制。完整身份和条件见 [candidate-11/binding.json](candidate-11/binding.json)。

| 原始报告或保留文件 | 原始字节 SHA256 |
| --- | --- |
| `artifacts/neighborhood-20261024/performance/candidate-11/result.json`；可移植副本 [candidate-11/result.json.gz](candidate-11/result.json.gz) | `02dadca1ea4c25d07ba2393f7e0f275c13e001bc3ebb436463485d7e682b0cf6` |
| `artifacts/nq03trace/result.json` | `276ec566cbb8f58040674880953a464e5900b68a80a5eba37423c7b7138b74ce` |
| `artifacts/nq03trace/analysis.json` | `63cab3707db58f970d0ac07cbeb8689a1b93cedbb6cda97d14719916e178b20d` |
| `artifacts/nq03trace/trace.json` | `33a8ad4d38169e2fa0fd3e09b834d9d07d6e42e5a4229640a6b9b482afbc33e7` |

`nq03trace` 是 2026-10-21 对包 `3e72aa1c53596042a14d1fb2aae9556b0a2caa876be93d424ec9ebe2aebb0162` 的既有诊断。上述三个文件仍位于 ignored artifacts；本记录固定其身份，没有将它们重新归档。Q03 的三个 warm locale 操作各自低于 500 ms 的原始目标保持不变。

## 当前实际测量

候选 11 的冷启动首次可用为 7798.0 ms，三次缓存重载为 2587.4 / 2667.3 / 2508.2 ms，均通过既有启动目标。全部所需细节完成时间为 17566.9 / 12661.8 / 10718.3 / 10756.3 ms；它们具有独立观察边界，不能用首次可用时间代替。

下表直接摘自 `interactions.summary.groups`，单位为 ms：

| 操作组 | 响应 / 操作数 | 事件队列 p95 | handler 收到事件至响应 p95 | 事件时间戳至响应 p95 | 绘制间隔 p95 |
| --- | --- | --- | --- | --- | --- |
| 行走 | 10 / 10 | 836.0 | 9.6 | 844.3 | 782.0，30 个观察间隔 |
| 单次 orbit 按键 | 10 / 10 | 1.0 | 18.8 | 19.0 | 未测得；每次只有一次绘制 |
| 全部 | 20 / 20 | 742.3 | 16.0 | 746.6 | 782.0 |

这里的响应要求状态变化与更新的提交绘制计数，不测量物理显示呈现。观察代码工作时间 p95 为 0.3 ms。九次首次观察的绘制计数间隔仍保留，无法重建其中遗漏的单个帧间隔。单次 orbit 的快速响应不能证明连续运动流畅。原始标准报告保持 16 通过 / 3 失败，事件时间戳响应和帧间隔目标继续失败。

既有 Q03 诊断动作耗时 1224.7 ms，其中 handler 为 6.0 ms。渲染器主线程的 15 次 `GLES2::ReadPixels` 占 731.933 ms 重叠墙钟时间、14.626 ms 线程 CPU 时间；其外层 `LayerTreeHost::DoUpdateLayers` 为 745.415 / 26.638 ms，`Commit` 为 748.231 / 28.519 ms。这些嵌套类别不能相加。该动作的 Playwright click 调用为 730.739 ms，随后语言结果观察等待为 430.965 ms。既有 trace 支持浏览器合成等待的解释；它不能直接给当前候选 11 的每一段等待重新归因。

## 当前应用源码

`src/home/world-map.js:205–209` 已保留尺寸 / DPR 相同的 resize 过滤，locale 修改保持现有地图。`src/runtime/route-world-view.js:114` 的 streaming 状态通知保持独立；实际 attach / detach 仍在第 137 / 140 行触发绘制。`src/home/main.js:167–178` 保留可见 streaming 提示变化过滤和真实镜头变化通知。

`src/solo/controller.js:38–49` 仍会在更新时重新写入按钮的 `aria-pressed`、文本及 `solo-hint.textContent`，`main.js:176–178` 在镜头或玩家变化时调用该更新。这是可定位的重复 DOM 操作，当前报告没有将剩余约 0.75 秒等待归因于这些操作。已有响应与线程时间不足以支持新的运行时性能修改或重复同样的 benchmark。

## Chromium capture 状态与读回路径

以下为实际读取的官方 **151.0.7922.173** 源码位置，行号针对该固定 tag：

| 源码与位置 | 已确认行为 |
| --- | --- |
| [emulation_handler.cc:1004](https://chromium.googlesource.com/chromium/src/+/refs/tags/151.0.7922.173/content/browser/devtools/protocol/emulation_handler.cc#1004)，`SetFocusEmulationEnabled` | 启用时调用 `IncrementCapturerCount`，`stay_hidden=false`、`stay_awake=false`、`is_activity=true`。 |
| [web_contents_impl.cc:2699、2757、5063](https://chromium.googlesource.com/chromium/src/+/refs/tags/151.0.7922.173/content/browser/web_contents/web_contents_impl.cc#2699)，`IncrementCapturerCount` / `OnCapturerCountChanged` / `CalculatePageVisibilityState` | 更新捕获计数、视图与 surface 生命周期；原生可见或存在 visible capturer 时均返回 `kVisible`。 |
| [web_contents_view_aura.cc:1107](https://chromium.googlesource.com/chromium/src/+/refs/tags/151.0.7922.173/content/browser/web_contents/web_contents_view_aura.cc#1107)，`OnCapturerCountChanged` | 创建或释放宿主的 video capture lock。 |
| [desktop_window_tree_host_platform.cc:991](https://chromium.googlesource.com/chromium/src/+/refs/tags/151.0.7922.173/ui/views/widget/desktop_aura/desktop_window_tree_host_platform.cc#991)，`OnVideoCaptureLockCreated` | 保持已最小化窗口的 compositor 可见，并调用平台捕获状态方法。 |
| [window_tree_host_platform.cc:190](https://chromium.googlesource.com/chromium/src/+/refs/tags/151.0.7922.173/ui/aura/window_tree_host_platform.cc#190) 与 [platform_window.cc:61](https://chromium.googlesource.com/chromium/src/+/refs/tags/151.0.7922.173/ui/platform_window/platform_window.cc#61) | 前者调用 `SetVideoCapture`；后者的默认实现为空。所检查的 [HeadlessWindow](https://chromium.googlesource.com/chromium/src/+/refs/tags/151.0.7922.173/ui/ozone/platform/headless/headless_window.h) 和 [X11Window](https://chromium.googlesource.com/chromium/src/+/refs/tags/151.0.7922.173/ui/ozone/platform/x11/x11_window.h) 没有覆盖该方法。 |
| [drawing_buffer.h:169](https://chromium.googlesource.com/chromium/src/+/refs/tags/151.0.7922.173/third_party/blink/renderer/platform/graphics/gpu/drawing_buffer.h#169) 与 [drawing_buffer.cc:474–533、2012](https://chromium.googlesource.com/chromium/src/+/refs/tags/151.0.7922.173/third_party/blink/renderer/platform/graphics/gpu/drawing_buffer.cc#474)，`IsUsingGpuCompositing` / `PrepareTransferableResource` / `ReadBackFramebuffer` | 分支读取 `context_info_.using_gpu_compositing`；软件合成分支调用 `ReadBackFramebuffer`，其中执行 `gl_->ReadPixels`。 |

捕获计数对隐藏渲染具有明确作用。所检查的 capture 路径没有提交像素复制请求；WebGL 提交资源的读回分支由合成配置决定。当前源码证据没有建立默认 focus emulation 与可见页面 `ReadPixels` / `SwapBuffers` 耗时之间的因果关系。仅凭该假设不足以支持新的 timing diagnostic，也不能宣称移除 focus emulation 会改善这些耗时。

## 独立的原生可见性结论

已安装 Playwright 1.62.1 的默认初始化会启用 focus emulation；公开 `connectOverCDP({noDefaults:true})` 对既有默认上下文跳过该默认设置。源码摘录与首次失败保留在 [native-visibility/README.md](native-visibility/README.md)。

[候选 11 的独立原生报告](candidate-11-native-visibility/README.md) 使用直接 Chromium、受认证的 Xvfb 和既有默认上下文，通过 13/13 检查：实际同窗口标签页切换产生可信 hidden / visible 事件，2018.8 ms 隐藏期间绘制、更新与街区请求均无增量。其原始解压报告 SHA256 为 `ccecdbe22d4b522a0210a31e08515e361a24befba44d80605846f488308227ea`。

这份原生证据确认隐藏与恢复行为；它没有执行可见页面性能因果对照，也没有证明物理 GPU 流畅度。现有软件环境的事件与帧间隔失败、Q03 原始目标以及全部历史失败报告继续保留。
