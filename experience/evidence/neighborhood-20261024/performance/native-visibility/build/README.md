# 项目目录中的原生 Xvfb

2026-10-24：Xvfb 21.1.16 编译完成，两次独立原生验证均已结束并关闭进程。首次使用 Playwright 默认上下文时未观察到隐藏；读取已安装依赖与 Chromium 源码后，第二次通过公开 `connectOverCDP({noDefaults:true})` 连接直接启动的 Chromium 默认上下文，13 项检查通过。原始失败保留。MIT-SHM 关闭，GLX 保留；此环境的结果不提供物理 GPU 或普通运行配置的性能证据。

## 来源与依赖

- 原始来源：[Debian xorg-server 21.1.16 源码记录](https://deb.debian.org/debian/pool/main/x/xorg-server/xorg-server_21.1.16-1.3+deb13u3.dsc)。`downloads/xorg-server_21.1.16.orig.tar.gz` 为 8,954,623 字节，SHA256 `59fa52b63f6f8747ee2c4716decb29ced249c4c574e2a18c96b7d3b1420f7fd9`。源码保持原样。
- `indexes.json` 保存 trixie、trixie-updates、trixie-security 的固定索引身份。下载的 InRelease 已使用系统 Debian archive keyring 和 `sqv --cleartext` 成功验证；Packages.xz 与签名 Release 的长度、SHA256 一致。
- `dependencies.json` 固定 61 个 Debian 包的版本、来源、长度、SHA256，共 12,404,232 字节。全部包已校验并用 `dpkg-deb --extract` 解包到 `deps/`，未运行维护脚本或系统安装操作。实际动态链接路径见 `runtime-libraries.txt`。
- Meson 1.7.0、Ninja 1.12.1 在 `deps/` 中运行。系统提供 GCC 14.2.0、binutils 2.44、pkgconf 1.8.1、Python 3.13、OpenSSL 3.5.7 和现有只读 XKB 数据。
- `acquire.py` 使用 python-debian 1.0.1 读取 Debian 元数据与依赖关系。固定 wheel SHA256 为 `8f137c230c1d9279c2ac892b35915068b2aca090c9fd3da5671ff87af32af12c`。下载继承代理与 CA 设置。

## 构建记录

执行 `bash artifacts/native-display-build/build.sh`，使用两个编译任务完成 328 个构建步骤。编译过程的 TMPDIR、构建目录和输出目录都位于本目录。仅构建 `hw/vfb/Xvfb`，没有执行安装。

- 编译脚本：`build.sh`，SHA256 `0e5ce4d613026a7da47afe28cf940a6de8d84a5ed000de9d7d938c014baf5732`。
- 完整构建选项：`build-options.json`，SHA256 `740bea8448eedd256d41201d6d3baae8c303722639fed04cad8471a9814172cb`。
- 日志：`build-log.txt`。
- 二进制：`build/hw/vfb/Xvfb`，SHA256 `9ffcf7961c43aea2a920a340b1d95064d7b359b9e41af6f4ddbd9aea711e6172`。
- 生成的 XKB 头文件：`build/include/xkb-config.h`，SHA256 `9e333b6d2001519bbba497a0c2c268e478b1512a97a726ff1ddd778fad809c57`。
- 生成的服务器选项：`build/include/dix-config.h`，SHA256 `d4bc6c1e151dc90ed4ca1652582c256bb9c00fc9a938a17d7764e5be34798042`。

## 写入路径检查

1. [Meson 选项](https://gitlab.freedesktop.org/xorg/xserver/-/raw/xorg-server-21.1.16/meson_options.txt) 支持 `xkb_output_dir`；[生成过程](https://gitlab.freedesktop.org/xorg/xserver/-/raw/xorg-server-21.1.16/include/meson.build) 将它写入 `XKM_OUTPUT_DIR`。实际生成值是本目录的 `runtime/xkb/`。
2. [XKB 加载器](https://gitlab.freedesktop.org/xorg/xserver/-/raw/xorg-server-21.1.16/xkb/ddxLoad.c) 在该目录可写、可进入时使用它。启动辅助函数在创建进程前执行真实权限检查。`xkbcomp` 从 `/usr/bin` 读取，输入数据来自 `/usr/share/X11/xkb`，输出文件在编译目录中创建并删除。
3. `sources/xorg-server-21.1.16/os/utils.c` 的 `-displayfd` 路径无条件设置 `nolock`；此选项通过真实文件描述符返回就绪显示编号。服务器锁定路径因此不会运行。指定固定显示编号后仍保留该行为。
4. 生成头文件启用 TCP，禁用 Unix 和 local 监听。`ProcessCommandLine` 将禁用列表传给 Xtrans，Xtrans 在创建监听器前排除这些传输。
5. MIT-SHM 被编译关闭，其临时文件创建分支不可用。`hw/vfb/InitOutput.c` 默认使用堆内存帧缓冲，启动参数不使用 `-fbdir` 或 `-shmem`。
6. Xvfb 的 `OsVendorInit` 为空，服务器默认写入 stderr；辅助函数将其重定向到任务日志。Xauthority、缓存、配置目录和运行目录在 `runtime/<name>/` 中；临时目录使用较短的 `artifacts/x<display>/`，以满足 Chromium 内部 Unix socket 路径长度限制。
7. 编译时 pkg-config sysroot 同样作用于 `DRI_DRIVER_PATH`。辅助函数使用服务器支持的 `LIBGL_DRIVERS_PATH=/usr/lib/x86_64-linux-gnu/dri`，读取已安装且版本匹配的 Mesa 驱动。`glx/glxdricommon.c` 明确优先读取此变量；Mesa shader cache 指向任务缓存。该设置仅用于 Xvfb 进程，浏览器继续保留自己的库环境。

## 原生验证入口与结果

`native-display.mjs` 导出 `startNativeDisplay({name, display, screen})`，返回 `{env, manifest, close}`。辅助函数验证二进制身份、XKB 写入权限，创建 0600 权限的 Xauthority，经 xauth 标准输入写入随机 MIT-MAGIC-COOKIE-1，使用认证 TCP 和就绪文件描述符启动服务器。启动后才写入含实际 PID、参数和路径的 `runtime/<name>/manifest.json`。调用方在 Playwright 启动前设置 `process.env.TMPDIR = env.TMPDIR`，并在 finally 中执行 `close()`。

Cookie 不进入日志或 manifest；归档时只复制 manifest 与日志，排除 Xauthority 文件。两次运行均验证授权连接成功、无 cookie 连接被拒绝、GLX 存在及 MIT-SHM 关闭。

浏览器检查必须记录实际 tab/target/window 身份、原生 `visibilitychange`、`document.hidden` 的真实变化，以及隐藏前后实际应用的绘制、更新、请求和恢复状态。不能覆写页面可见性属性或生命周期。应用包、画质、观察阈值和失败记录保持原样。

首次结果位于 `../neighborhood-20261024/performance/candidate-10-visibility/`。两个页面同属原生窗口 512324988，但没有隐藏事件。Playwright 1.62.1 的默认主框架初始化发送焦点仿真；Chromium 151.0.7922.173 为它建立 `stay_hidden=false` 的捕获句柄，使渲染器持续收到可见状态。

第二次结果位于 `../neighborhood-20261024/performance/candidate-10-native-context/`。两个页面同属原生窗口 1742560269，收到受信任的 hidden 与 visible 事件。等待隐藏稳定 1500 ms 后，实际采样 2019.4 ms，渲染、更新、街区请求增量均为 0；返回后玩家位置与保存的私有镜头值一致。Chromium 仍使用 SwiftShader，WebGL 抗锯齿保留，浏览器 1440×1000、DPR 1、正常运动、白天、80 ms 延迟与 1,250,000 B/s 传输条件保持记录。浏览器于 03:06:02.475Z 退出，Xvfb 与 HTTP 服务器已关闭。

浏览器日志完整保留系统 D-Bus、只读 OOM 设置、NSS 数据库初始化、外部 TLS 及初始 GPU 进程失败信息。验证使用真实回环 HTTP 服务，未禁用 TLS 检查；包内资源没有缺失。运行配置将配置、缓存、临时文件与用户资料指向 artifacts；浏览器对系统集成路径的失败尝试可在日志中审计。
