# 地理数据预览器浏览器验证

[最终报告](site-workbench-result.json) 完成 36 项检查，全部通过。浏览器为 Chromium 151.0.7922.34；桌面视口 1440×1000，触摸视口 390×844，使用软件 GPU 和 `prefers-reduced-motion: reduce`。

报告 SHA256：`542861e39f39b1828b1cc33b1ced4db80f36d7f468c6d62a3b11f0ba7aa1dad9`。测试脚本 SHA256：`a91716160833accea352c81f2b05e760145d5ec43f4da8a189a68095e97d8be7`。预览器 `viewer/main.js` SHA256：`75e0ed4e4751a773e5caa5dd44738efd0452b3581c63d9ee523edb107f18fab9`。

实际加载的 Delft GLB 为 `b9a63090d9ab6a2335c214b8361519abf9c97ef0dfd33ca1e0fe6b78a08b23e9`，Helsinki GLB 为 `e0a7da09e662c8b32ca577e6da5868bbfeadc904e776aefec28cb5f1bf4534d9`。报告记录两个目录的模型、清单、来源审阅和准备数据哈希，并检查执行结束时这些文件保持一致。

检查覆盖实际几何点击与来源编号、键盘和触摸相机操作、日夜渲染变化、双语布局、连续切换的资源数量、私有存储保持、静止时停止绘制、模型与 HDR 请求失败后的实际重试，以及本地资源和浏览器异常。网络故障通过取消真实请求产生，重试加载真实资源。

[before-shadow](before-shadow/site-workbench-result.json) 保留此前 36 项检查及对应图片；该报告 SHA256 为 `39e029f7d07896979f8539b5cb985dcca47aeacedcd10a363e61b7f7469f041c`。最终图片使用经过审阅的阴影计算。两次模型、相机操作和测试步骤保持一致。

这些记录验证内部地理预览工具。建筑细节、可通行性、实地辨认、实体手机流畅度和人类视觉偏好仍需各自的证据；软件 GPU 结果不能证明目标设备性能。
