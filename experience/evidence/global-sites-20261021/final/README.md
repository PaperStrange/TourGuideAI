# 2026-10-21 本地验证记录

以下结果来自实际 Chromium 151.0.7922.34、真实本地构建和实际来源文件。浏览器运行依次占用同一测试环境；软件 GPU 的运行时间不代表实体设备表现。

| 验证范围 | 结果 | 绑定内容 |
| --- | --- | --- |
| 完整街区流程 | 81/81 | 包清单 `db924643833272d490e939a884057156bb7b7ac7b94a4341035e213f17e69b3e`；Ginza 模型 `b098e775…` |
| 校正玻璃后的七个相同视角 | 12/12 | 包清单 `63f813639c87a260855d68b52222fc0dda4134668808132f85f7b7a4a7cb706f`；Ginza 模型 `ca7098c9…` |
| 来源与几何准备 | 18/18 | 真实 Delft/Helsinki XML、来源错误拒绝、五个庭院、多边形与三角形覆盖、显示层互不重叠 |
| 内部地理预览浏览器 | 36/36 | 两个实际 GLB、来源点击、EN/ZH、日夜、键盘与触摸、错误与重新加载 |
| 最终应用地图重试 | 18/18 | 包清单 `3e72aa1c53596042a14d1fb2aae9556b0a2caa876be93d424ec9ebe2aebb0162`；真实样式与瓦片请求恢复、相机/路线/私人数据保留 |

[完整街区报告](packs-full-result.json) 保留实际行走、边界、检查表面、保存与返回、取消加载、资源释放及正常动画恢复过程。其精确驱动快照是 [packs-full-driver.mjs.txt](packs-full-driver.mjs.txt)，SHA-256 `aeaae2ebe8e53eb17d1c4d086f33f34f6c3d64ca27de2d8724957ee6e04e1d42`，与报告内记录相同。

[校正玻璃后的报告](packs-art-poses-result.json) 使用完整流程记录的七个真实 v3 视角，通过收藏返回界面恢复，并核对人物、相机与日夜模式。图片由美术审阅记录保存。驱动为 `experience/tests/browser-packs.mjs`，SHA-256 `ca70dc1d5ce47de3e99afd5b0c3dbdf57a40254c3561ed16cacae2f433d45110`。

[两次构建的文件差异](package-delta.json) 只有 Ginza 的模型、材质说明、来源记录与资源清单四个文件。JavaScript、CSS、Shijō 资源与其他构建文件字节相同。完整 81 项结果仍绑定其原始包；最终包的其他完整流程由独立 CI 报告记录。

[最终发布构建的文件差异](release-package-delta.json) 比较 `63f81363…` 与 `3e72aa1c…`：首页及其两个 JavaScript 文件和对应 source map 更新，另外 90 个文件字节相同。全部街区模型、材质、光照和街区运行文件保持原字节。因此美术图片继续保留拍摄时的原始包绑定；最终应用行为由 [地图重试](map-retry/README.md) 和 [CI](../ci/README.md) 单独验证。

[来源检查日志](../workbench/site-tests.txt) 对应准备程序 SHA-256 `5fc136bd4e50402963de83e8d80aafa0c1c5603843a1d8cdd7ca82a4872d7f04`，测试 SHA-256 `427bbe165b9db983416061e357d7057bd1b367d119a56fafc57b4a13538ffde3`。显示边界精度上限 1 mm；原始地理坐标与投影后的来源几何保持独立严格检查。

[地理预览浏览器报告](../workbench/browser/site-workbench-result.json) 和同目录七张图片绑定实际模型：Delft `b9a63090d9ab6a2335c214b8361519abf9c97ef0dfd33ca1e0fe6b78a08b23e9`，Helsinki `e0a7da09e662c8b32ca577e6da5868bbfeadc904e776aefec28cb5f1bf4534d9`。实际屋顶点击分别返回 `osm:way:209351406` 与 `osm:way:1542850662`。两个场景均显示地理环境示意与通行尚未审阅；检查期间没有外部网络请求，私人保存内容保持原字节。

这些自动检查不证明人类识别、真实感、游玩乐趣、实体设备流畅度或现场步行通行条件。内部预览保留建筑、屋顶、地面高差与通行需要审阅的说明。
