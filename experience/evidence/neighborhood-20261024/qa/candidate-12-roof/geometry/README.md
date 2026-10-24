# 候选 12 彩色屋顶的实际视图几何分类

`day.json` 和 `night.json` 是对 QA 已保存视图执行的原始输出。每份输出记录 9 个可见角色 mesh、26 个几何无遮挡样本、0 个几何遮挡样本，`bothClassesObserved=false`。这两个视图没有提供外部建筑遮挡后的实际透射响应证据；没有新增视角搜索或浏览器执行。

原始浏览器报告记录 20/20 检查通过，包括真实白天/夜晚绘制、零 console/page error、导出角色、两次卸载/返回和资源预算。浏览器采用 Chromium `151.0.7922.34`。这些检查与本目录的 CPU 射线分类分别保留各自范围。

## 身份与原始文件

| 文件或输入 | SHA256 |
| --- | --- |
| `day.json` | `7daa2d9a0ed07aa93a6eb713c96e3fe0bcc0ab8119886bb6d69a33e8b8705ab2` |
| `night.json` | `4cd2e0161f0f69a298a194551785da97400221781d29ae5c878cca38e478e26a` |
| `capture-helper.txt`，实际执行的 helper 原文 | `0397f57fd5a37a397c665801860edc15935dd93bbac62c20a06b27ec28f8c35e` |
| `geometry-loader.txt`，实际 CPU loader 原文 | `246ccb8cec2d5ce4eba2eea285206c720efcfabfc24266516134b5c0d12acb65` |
| `material-consumer.txt`，实际角色验证实现原文 | `800e468d164f04b327323c28bffa8182e4c694f3710e9adf4cf00a276417a413` |
| 浏览器原始报告 | `dde090dbbff0bf35aa41d3beb25884f153a3050443714f0d6ae61d9936660134` |
| 浏览器 driver | `71032b2ea1e55444c8736ba043476cf4086d7ef75d1665e225b26811e969eeb3` |
| 完整应用包 | `e86aa1c715fb76cd111feae41a0383ee34005aefd64fe5c48eba7615676e5733` |
| 场景 manifest | `86e4f424a36cb858c16f6e282ad8ceb8f146d6b285d482de3c0ce2fe2f726b61` |
| lighting.json | `6f385116cf4a63fa8baf787f8128bb2cccc1b3887e57588d7a754860e8095399` |
| 白天 canvas | `80f40dd3b7ce8990e6cbf6d32c1f3cf1b1aacb0f156a5d5156ea1d16e587bf64` |
| 夜晚 canvas | `a3ccc1bd14dd9597328c1067c27709898b48ad1f2deae44192997e732236b7f9` |

QA 原始报告路径为 `artifacts/neighborhood-20261024/qa/candidate-12-roof/neighborhood-result.json`；图像名称为 `arcade-below-roof-day-canvas.png` 和 `arcade-below-roof-night-canvas.png`。本目录不复制完整浏览器报告，浏览器证据由 QA 保存在上级目录。

## 指定可见样本

两个模式的视点、几何和方向光方向一致。接近画布归一化坐标 `(0.54, 0.15)` 的实际样本如下：

- mesh：`cell-e002-n001_near_Canopy_nishiki-ridge-red`；材质：`nishiki-ridge-red`；source index：139；source ID：`osm:way:772134672`；face：55。
- 画布尺寸 `990 × 716.828125` CSS px；样本坐标 `(530.515326, 104.333694)`，归一化坐标 `(0.535874066, 0.145549107)`。
- 世界坐标 `[298.819966634, 4.938333352, -140.000473022]`；世界法线 `[0, -0.722999818, 0.690848220]`；`frontFacing=true`。这是实际向下的板材底面。
- 使用 45 mm 垂直配对和实际方向光 `normalBias=0.045` 后，入射点为 `[298.819966634, 5.015868344, -140.031561192]`，入射余弦 `0.496837202`，射线没有命中 blocker。
- 真实方向光强度分别为白天 `2.8`、夜晚 `0.18`；夜晚并非白天太阳强度的截图替换。

CPU 分类核对实际 resident section、manifest、rig 和导出 metadata，读取真实相机矩阵，并使用间接 BVH 保留索引身份。输出同时保留全部实际导出角色和每个样本的面、法线、入射点、画布位置与 blocker 字段。

## 证据边界

几何射线没有复现 PCF 光栅化、纹理颜色、tone mapping 或最终像素亮度。全局 HDR/hemisphere 没有局部天空遮挡数据。仅实际驻留、可见的几何参与此次方向光分类，未加载的建筑没有加入计算。`fadedGroups` 记录完成淡出后的组意图，当前 observer 没有逐材质 opacity；因此必须使用 QA 已等待完成的视图。

浏览器资源记录中，缓存阴影之后的主场景绘制为 83 calls / 85,731 triangles；实际驻留几何为 128,625 triangles，9 个 cell / 3 个 NEAR。完整估算纹理分别为白天 46,159,188 B、夜晚 54,023,508 B。两次返回的已分配计数相同（95 geometries / 40 textures）；这项比较不把初始视图与返回后的缓存视图称为完全相同。估算仍排除驱动填充、主画布/compositor 和瞬时解码峰值，原始报告保留全部排除项。

没有已知且已分类的外部建筑遮挡样本可支持额外的视点选择。实际 shader 编译、昼夜响应、角色/配对验证与卸载返回可以支持其各自的验收；外部遮挡后的像素响应仍未观察到。

## 复现条件

原始 helper 位于 `artifacts/neighborhood-20261024/engineering/thin-sheet-verification.mjs`，相对 imports 依赖该位置。`capture-helper.txt` 是逐字节源文件副本；重放时应将副本放回该原始位置，并保留这里绑定的 geometry loader、material consumer、应用包和浏览器报告。依赖版本为 Three `0.186.1`、three-mesh-bvh `0.9.16`。helper 不启动浏览器，也不解码外观纹理。

实际执行命令（仓库根目录）：

```bash
node artifacts/neighborhood-20261024/engineering/thin-sheet-verification.mjs artifacts/neighborhood-20261024/candidate-12 artifacts/neighborhood-20261024/qa/candidate-12-roof/neighborhood-result.json arcade-below-roof-day-canvas.png artifacts/neighborhood-20261024/engineering/roof-day-classification.json
node artifacts/neighborhood-20261024/engineering/thin-sheet-verification.mjs artifacts/neighborhood-20261024/candidate-12 artifacts/neighborhood-20261024/qa/candidate-12-roof/neighborhood-result.json arcade-below-roof-night-canvas.png artifacts/neighborhood-20261024/engineering/roof-night-classification.json
```

这两次执行分别约 0.20 s / 0.18 s，只产生保留的 JSON。再次执行会生成新的 `createdAt`；原始输出及其 SHA256 保持不变。
