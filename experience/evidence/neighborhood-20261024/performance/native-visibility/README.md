# 候选 10 的原生标签页可见性验证

2026-10-24，第二次独立原生验证通过 13/13 检查：两个真实标签页共享同一个 X11 浏览器窗口，应用收到受信任的 hidden 与 visible 事件；隐藏稳定后 2019.4 ms 内的绘制、更新及街区请求增量均为 0，返回后玩家位置与保存的私有镜头值一致。首次未观察到隐藏的失败结果完整保留。两次浏览器、HTTP 服务器及 Xvfb 均已关闭。

本记录验证实际候选包的原生隐藏与恢复行为。物理 GPU 验证及普通运行配置下的性能结论仍需各自的证据。没有修改应用代码、可见性属性、页面生命周期或焦点仿真状态，也没有更改原有性能门槛。

## 固定身份与结果

| 项目 | 身份或结果 |
| --- | --- |
| 候选包 | `afc7934f1b0706ea59caae5e4b1a97a6a3f6366ac65b24cbe79bfc2c2d94e574` |
| 原生环境 | 未修改的 Xorg server 21.1.16 源码构建 Xvfb；MIT-SHM 关闭，GLX 保留，认证 TCP |
| Xvfb 二进制 SHA256 | `9ffcf7961c43aea2a920a340b1d95064d7b359b9e41af6f4ddbd9aea711e6172` |
| Chromium / Playwright | `151.0.7922.173` / `1.62.1` |
| 实际 WebGL | ANGLE，Vulkan 1.3.0 SwiftShader；抗锯齿 true |
| 浏览器尺寸与模式 | 1440×1000，DPR 1，正常运动，白天，英文；实际画布 975×706 |
| 网络条件 | 真实回环 HTTP，80 ms 延迟，上下行均为 1,250,000 B/s，无请求拦截 |
| 应用 target | `606BDC4FA58146F97E05DBF55379C2A4` |
| 第二标签页 target | `FD16B2E6024EFEBCD0297C897096D6D7` |
| 共同原生窗口 | `1742560269`，正常窗口 1448×1085 |
| 共同上下文 | `734B2AF388E8810C4C38129DDC61D6F5` |
| 原生事件（页面时钟） | hidden：17456.5 ms；visible：21063.3 ms；均 `isTrusted=true` |
| 隐藏采样 | 等待 1500 ms 稳定，实际采样 2019.4 ms；绘制 0，更新 0，客户端与服务器街区请求均为 0 |
| 隐藏 CPU | `TaskDuration` 增量 0.267 ms，`ScriptDuration` 增量 0 ms；包含被动观察开销 |
| 关闭时间 | 03:06:02.475Z；Chromium 退出码 0；实际记录 PID 9284、9289 均已结束 |

第二次原始结果为 [native-context/result.json.gz](native-context/result.json.gz)，解压 SHA256 `901bceb36a79465e74d1abca7b2556f9906a52c379afdfb7e10007e6e0807d6d`。实际执行驱动 SHA256 `79648c1618ea0e03bcab479d398481673c7150442c5c22b1807d690cf210f71b`，共享启动辅助脚本 SHA256 `6e84c4f3b9d990024ebdca22b97b5a939c43affcbb1c9935ad792ce94ef06691`。完整目标、窗口、命令行、实际 WebGL 属性、应用与街区快照及所有检查见原始 JSON。

## 首次失败及独立诊断的依据

[default-automation/result.json.gz](default-automation/result.json.gz) 保留第一次结果，解压 SHA256 `2fa9d95e4c948f3e87644c74a15098d5f08209b6a766c5946caa17c263d2fbf5`。已通过认证、GLX、应用就绪和抗锯齿检查，随后等待 `document.hidden` 10 秒超时。两个页面实际共享窗口 `512324988`，因此记录排除了“各自是独立窗口”的假设。驱动 SHA256 `d1aedc910f63bf256caea08a4e89a7a0bedb1e2e3286f4415a25e99dfac71155`。

读取已安装 Playwright 的 `coreBundle.js` 第 37395–37399 行，默认主框架初始化会发送 `Emulation.setFocusEmulationEnabled({enabled:true})`。同一版本的公开类型说明 `connectOverCDP({noDefaults:true})` 会为既有默认上下文跳过焦点及媒体等默认覆盖。完整文件 SHA 与逐行摘录保存在 [sources/playwright-installed.json](sources/playwright-installed.json)。来源入口：[Playwright BrowserType.connectOverCDP](https://playwright.dev/docs/api/class-browsertype#browser-type-connect-over-cdp)。实际判断基于归档的已安装 1.62.1 代码与类型。

Chromium 对应版本源码 `EmulationHandler::SetFocusEmulationEnabled` 创建 `stay_hidden=false` 的捕获句柄。`WebContents::IncrementCapturerCount` 的说明明确指出，该参数使渲染器在捕获期间持续收到可见状态。已读取并归档的原始来源：

- [Chromium 151.0.7922.173 EmulationHandler](https://chromium.googlesource.com/chromium/src/+/refs/tags/151.0.7922.173/content/browser/devtools/protocol/emulation_handler.cc)，实现第 1004 行起；归档 `sources/emulation_handler.cc.gz`。
- [Chromium 151.0.7922.173 WebContents](https://chromium.googlesource.com/chromium/src/+/refs/tags/151.0.7922.173/content/public/browser/web_contents.h)，`stay_hidden` 说明第 880 行起；归档 `sources/web_contents.h.gz`。

第二次由受支持的 Chromium 命令行直接启动，再通过公开 `connectOverCDP({noDefaults:true})` 连接既有默认上下文。实际第二标签页由 `context.newPage()` 创建并激活，驱动在观察隐藏前核实两个页面具有同一原生窗口 ID。没有发送焦点、可见性或生命周期覆盖命令。新增明确配置与两次完整命令行均保存在原始报告；第二次的 `--enable-unsafe-swiftshader` 同样出现在该版本 Playwright 的默认启动参数中。浏览器视口通过公开 API 指定，实际 DPR、运动模式和尺寸另行校验。

## 构建与写入路径

[build/README.md](build/README.md) 记录源码 URL、固定 SHA、支持的 Meson 配置、源码路径审计与构建过程。`build/dependencies.json` 固定 61 个 Debian 包的版本、URL、长度和 SHA，下载后只解包到 ignored artifacts，共 12,404,232 字节；`build/indexes.json` 与三个 `InRelease.gz` 保留已验证的仓库元数据。构建脚本、实际选项、动态库解析、日志及源码获取脚本均保留。生成头文件以 [build/dix-config.h.gz](build/dix-config.h.gz) 与 [build/xkb-config.h.gz](build/xkb-config.h.gz) 无损归档，保留原始空白和末尾换行；解压后与 artifacts 构建目录的原始字节完全一致。

可复现时先恢复这些文件到 `artifacts/native-display-build/`，按固定清单下载并验证依赖、解包到 `deps/`，按记录的 SHA 下载原始 Xorg 源码并解包到 `sources/`，创建本地 `tmp/`、`runtime/xkb/`、`runtime/logs/`，再执行归档的 `build.sh`。使用同一路径可对照生成的绝对 XKB 路径和二进制身份。重新运行需要新的证据目录与受控 CPU/浏览器窗口；既有结果不得覆盖。

XKB 输出由支持的 `xkb_output_dir` 编译选项定位到 artifacts；`-displayfd` 使用源码支持的无锁路径；Unix/local 监听与 MIT-SHM 均关闭，避免其系统临时文件路径。Xauthority、配置、用户资料、缓存、临时文件与运行目录均显式设置在 artifacts。认证成功与无 cookie 连接被拒绝都经过真实 `xdpyinfo` 验证。归档排除认证 cookie 与浏览器用户资料。

浏览器原始日志 [native-context/chromium.log.gz](native-context/chromium.log.gz) 保留 D-Bus、只读 OOM 设置、NSS、外部 TLS 及初始 GPU 进程失败信息；两个空服务器日志分别为 [default-automation/xvfb.log.gz](default-automation/xvfb.log.gz) 和 [native-context/xvfb.log.gz](native-context/xvfb.log.gz)。三个日志使用时间戳为 0 的确定性 gzip 无损归档，解压字节与 ignored artifacts 中的原始日志完全一致。TLS 检查保持开启，当前证据使用候选包的真实回环 HTTP 服务，包内资源未缺失；这些系统集成与外部 TLS 信息没有被计作通过。最终实际应用 WebGL 渲染器与上下文属性单独记录。该环境只提供本次原生隐藏/恢复证据。

`binding.json` 逐项记录可移植文件的压缩、解压 SHA256 和原始路径。原始报告中含完整候选文件清单，因此可独立核对应用包身份。此目录没有应用实现变更。
