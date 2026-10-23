# 相机几何验证

本次记录只验证实际 glTF 几何、相机投影、来源索引与 CPU 查询成本。未启动浏览器，未验证材质外观、实际帧率或完整路线体验。

输入位置取自已发生的 Nishiki 行走记录：`neighborhood-20261021/qa/arcade-blocker/arcade-result.json`，位置 `(287.127,140.015)`。资源使用 manifest `add6e399dcebca96cec9daf9e413f1374b6561ca48272b982914a1d6075f961c`，加载常驻 context 与该位置所需的九个分区。Three GLTFLoader 和 MeshoptDecoder 读取实际几何；CPU 辅助加载器保留原始材质名称及透明状态，省略图片解码。

`geometry-sweep.txt` 保存完整输出。300 个相邻探测位置间隔 0.076m，使用 1/60 秒相机时间步；这是几何连续性扫描。各位置没有执行导航寻路。结果：

- 最小实际相机距离 5.0002m，最大人物垂直画面占比 33.85%，恢复构图失败 0 次；同源回归测试逐点检查相机低于 4.65m soffit。
- 最大相邻相机位置变化 0.218m。
- 查询时间中位数 0.593ms，p95 2.011ms，最大值 5.834ms；300 次总计 228.505ms。这些是当前容器中的 CPU 观测值。
- 10 个资源根节点包含 93 棵 BVH；节点及间接索引缓冲区合计 1,286,994 bytes，构建耗时 32.832ms。这个估计不包含原始共享几何和 JavaScript 对象开销。全部资源卸载后，根节点、BVH 和上述缓冲区估计均为零。
- 最终位置已经稳定；移除全部遮挡资源后，相机用 111 个时间步恢复所请求的视点，最后位置误差为零。

输出中的 `inspectionCamera` 是对历史检查姿态的几何诊断，明确使用 `preserveActorFrame:false`。它不表示打开 Look closer 的当前行为；模式入口现在保持已有恢复构图，只有用户实际调整相机后才允许独立细节构图。历史六条射线命中普通建筑或没有命中，因此没有选择市场特征。新结构表面的实际选择与画面连续性仍由浏览器检查验证。

固定摘要：

| 文件 | SHA-256 |
| --- | --- |
| capture-driver.txt | 0bbd4761834bec38d2938d1c164fdb87b07c156e7968502ba9006b0d84f2191e |
| geometry-sweep.txt | 4703bc31253e71b3b73be6c241a69cb7c4fbd66fcc10527675ef0a5932c1b0de |
| src/runtime/camera-obstruction.js | ba6613074f4addceac0574efb5f6b14d54fedc4b314a0474e2a92d064eb04816 |
| tests/helpers/neighborhood-geometry.mjs | 246ccb8cec2d5ce4eba2eea285206c720efcfabfc24266516134b5c0d12acb65 |

重现时，在仓库根目录将 `capture-driver.txt` 原样复制为 `artifacts/neighborhood-camera-audit.mjs`，安装 `experience/package-lock.json` 对应依赖，然后执行 `node artifacts/neighborhood-camera-audit.mjs`。需要本记录对应的公共资源和历史行走报告。脚本的相对路径以仓库 `artifacts/` 为运行位置。

目标测试命令：`node --test experience/tests/camera-obstruction.test.mjs experience/tests/arcade-camera.test.mjs experience/tests/packs.test.mjs experience/tests/simulation.test.mjs`。当前 30/30 通过，包含来源索引不变、批次内排除表面后的真实遮挡、资源替换、停止后恢复、零时间重复同步、reduced motion、模式入口和原有 Ginza 构图。

行走输入还使用实际恢复相机的水平朝向。真实 arcade 几何测试产生超过 45° 的请求／实际朝向差异，分别检查前进与右移向量是否对应实际相机矩阵，确认保存的请求姿态不变；独立 Shijo 和 Ginza 继续使用其原有 OrbitControls 朝向。该输入测试没有改变上面记录的几何扫描算法或结果。
