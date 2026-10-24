# 候选11已观察上部镜头复现

11/11检查通过，47.618秒；原始报告解压SHA256 `ad2754e74364d1fdccd0da20938b7425e17a5327560797e0c53d144eec2e777e`。执行驱动 `83c0f52c7a3255f75bccbac7e71fbbe14b1dd9ed87a3be7a1648b42e9b5e38d9`，候选11包 `76c14e7a…`。所有原始字节及图像引用见 `binding.json`。

镜头来自已完成source201 follow-up报告 `63f69a9f…` 的第17个向上平移观察（零基索引16）。该时刻desiredPosition/position、target/viewTarget相同，镜头已稳定，inspectionPanned为true。用记录的player和target差计算公开v3偏移，经生产normalizer及原生Keep/reopen-inspecting复现；实际matrixWorld/projectionMatrix在既有1e−5容差内匹配。

实际白天/夜晚图像只覆盖已记录的25–27m材料过渡；26m源点约NDCy.762。原报告要求.65的构图检查仍然失败，完整上部及全72m立面没有通过结论。检查中有意向上观察会裁切actor；后续Escape单独验证完整actor、原地位置及ground。没有追加镜头搜索或新的行走声明。

同一冻结驱动在候选12的记录见 `../candidate-12-retained-upper/`。基线inspection原图由艺术证据目录 `../../art/candidate-12/baseline/`保存。
