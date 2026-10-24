# source201 比较基准的只读复核

复核对象为候选 11 的实际 3 m 行走后正面斜视记录。两个昼夜组合检查继续保留失败；记录支持“比较基准早于跟随相机稳定”的解释，没有显示稳定昼夜视图或保存数据被破坏。没有重跑浏览器、修改原始报告/驱动或放宽阈值。

## 固定来源

- [原始报告](candidate-11-daimaru-followup/neighborhood-result.json.gz)，解压 SHA256 `63f69a9f3cd470f9e52fbb70a0b3428c4533afcdf73ade9cf3a6810770a2781c`。
- [实际执行驱动](candidate-11-daimaru-followup/executed-driver.mjs.gz)，解压 SHA256 `558a24a2da2ae43c80d19fb3b6428f9642d8901193d4a8a3a376c27c03bafc06`。
- 候选 11 包 SHA256 `76c14e7ad8ea57fb81bed982376c5360765a36b0f6a158a45c021c1dc028b2ea`；对应源码提交 `84e80a823d778b9b537fc45d311a62bc127723db`。
- 街区 manifest SHA256 `4fb428b9d5b73274f0e64726cdf045f034e7be1823b8919f7ea6ef7d3bc09544`；geography SHA256 `0fe837655a45b8c2685e1bae24d739ef9fdf2c55dc60401588474cfa31bd9c7f`。

场景为 `scenarios['source201-bounded-followup']`，路径为 `paths[id='source201-oblique-three-metre-walk']`。该候选 11 证据与后续候选 12 的视觉比较分别绑定各自包身份。

## 可观察的时间顺序

执行驱动第 933–937 行在实际抵达后调用 `settled(page)`，随后读取 `matchingView`。该函数第 217 行起只等待街区下载、附着及质量状态。比较时第 940 行才调用 `cameraSettled`。相机的普通跟随分支仍会在玩家停止后继续平滑移动目标与相机位置；`captureView` 保存当时的目标相对玩家偏移。

| 字段 | 路径最后一个抵达样本（5400 ms） | 昼夜稳定观察（两者完全一致） |
| --- | --- | --- |
| camera.position.x | 231.37156735320985 | 231.60447161549527 |
| camera.position.z | 16.102459274936834 | 16.116528105333217 |
| camera.target.x | 226.12894895818627 | 226.3618532204717 |
| camera.target.z | -0.8455007576803616 | -0.8314319272839754 |
| azimuth / polar | 0.3 / 1.34 | 0.3 / 1.34 |
| distance | 18.223509 | 18.223509 |
| target.height | 3.546969 | 3.546969 |

玩家位置保持 `(225.153, 2.574, 0)`。相机与目标在 x 方向同移约 0.232904 m；角度、半径和高度保持原值。抵达样本中 `transitioning=false`、`obstruction.active=false` 和 `obstruction.settling=false` 均不代表普通跟随平移已经停止。

昼夜 `cameraSettling` 记录分别保留 4 个稳定样本，完整 `actual.home.currentView` 和相机矩阵两两一致。安全距离约 18.223509 m、人物占画面高度约 8.975%、地面命中均通过；6 个指定来源点（5 m 与 9 m 高度）全部在视锥内。因此组合失败对应比较基准不匹配。原始 `matchingView` 没有单独写入报告，无法独立重建其确切值和失败字段；末尾路径样本是参考附近的已记录状态，不能冒充未记录的基准。

## 保留的失败与后续比较边界

以下原始检查保持失败：

- `source201-oblique-walking-day-ground-framing-and-source-projection`
- `source201-oblique-walking-night-ground-framing-and-source-projection`

独立的 `daimaru-followup-completed` 上层观察失败也保持原样，不由本说明重新分类。视锥内的来源点不能单独证明最终图像可见性或不存在遮挡。

可用于后续候选匹配的真实稳定视图保存在 `screenshots[file='source201-oblique-walking-day-canvas.png'].observed.home.currentView`，夜间相同：

```json
{"version":3,"packId":"shijo-east","revision":1,"player":{"edgeId":"osm:way:465066447:4600891662:4600891664","edgeDistance":29.180186,"height":0,"x":225.153,"y":2.574},"camera":{"azimuth":0.3,"polar":1.34,"distance":18.223509,"targetOffset":{"x":1.208853,"y":-1.742568,"height":3.546969}}}
```

后续候选应记录恢复的目标视图及实际渲染矩阵，用原有 `cameraSettled` 条件稳定后再冻结新的比较基准，并保持 `.003` 视图容差、现有矩阵条件、人物、地面及来源点检查。使用这个记录视图的前后比较需注明恢复来源，不增加一次新行走的声称。当前复核没有执行这些后续操作。
