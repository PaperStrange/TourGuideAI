# 候选11立面基线尝试

下列原始报告均属于不可变候选11 `76c14e7ad8ea57fb81bed982376c5360765a36b0f6a158a45c021c1dc028b2ea`，Chromium151.0.7922.34。各目录保留完整报告、执行驱动/helper、日志、截图及压缩前后身份；失败检查没有改写。

| 目录 | 原始结果 | 实际范围 |
| --- | --- | --- |
| candidate-11-daimaru-baseline | 11通过/3失败 | 实际约47m行走至source201；正面下部材料视图可用。两项广范围投影失败；随后3m目标调用使用了单步投影参数，斜向段未执行。 |
| candidate-11-daimaru-followup | 10通过/3失败 | 实际3m斜向行走与六个5m/9m源点进入视野；两项合并比较失败，参考值在跟随镜头收敛前取得且没有单独记录。上部26m构图未达到原定.65位置。 |
| candidate-11-neighbor274-baseline | 10通过/1失败 | 既有e001白天/夜晚视图保留；40次实际L输入在碰撞恢复区没有达到指定朝向。 |
| candidate-11-neighbor274-followup | 7通过/1失败 | Reset给出安全22m视角；后续指定朝向仍受碰撞恢复限制。 |
| candidate-11-neighbor274-upper | 7通过/1失败 | 真实缩放/向上平移；15m源点进入视野上缘，但未达到原定构图余量。 |
| candidate-11-neighbor274-tilt | 6通过/1失败 | 普通视图恢复没有恢复刻意平移后的实际inspection构图，后续向上倾斜未达目标。 |
| candidate-11-neighbor274-inspection | 7通过/1失败 | Keep/reopen-inspecting正确恢复实际矩阵；随后的倾斜触发现有紧急碰撞恢复，下一输入采用实际actor pivot，上部目标仍不可见。 |

source274的五次尝试已经停止。没有上部完整处理通过结论。`browser-neighbor274-visible.mjs`只是未执行的准备文件，不属于执行证据。

source201参考时序的只读审阅见 [source201-reference-review.md](source201-reference-review.md)。失败报告没有单独保存早期matchingView，因此无法重建该比较的所有失败字段；实际停止后的截图视图/矩阵用于后续候选12对照。原始广范围投影和.65上部构图条件仍保持失败。

复现来源依赖的原始路径为仓库 `artifacts/neighborhood-20261024/qa/<目录>/neighborhood-result.json`。新环境可以把对应 `neighborhood-result.json.gz`原样解压回该路径，并验证 `binding.json`的decodedSha256；执行驱动也按其原始路径恢复。源报告恢复不改变浏览器状态；驱动通过公开私有记录和真实控件取得或恢复实际观察视图。
