# 街道场景技术研究 · 2026-10-27

状态：资料研究与选择建议。用户已重新提出真实感、辨识度和沉浸感要求；此前技术检查保持原有范围。本文没有授权应用修改、采集采购、引擎迁移或实验部署。产品流程见 [journey-review-20261027.md](journey-review-20261027.md)。

## 当前制作与运行方式的限制

当前 `shijo-east` 使用京都建筑轮廓、垂直范围、道路来源和作者编制的立面规则。[neighborhood_mesh.py](../art/neighborhood_mesh.py) 的 `facade_geometry`、`reviewed_facade_geometry`、`market_frontage_geometry` 生成楼层、开口、凹槽和铺面；[build_neighborhood.py](../art/build_neighborhood.py) 输出空间分区。已有个别地标和立面经过来源核查，但一般规则无法恢复未被输入资料记录的真实店面、招牌、门窗、材质和杂物。继续提高几何密度或更换渲染器，都需要补充实际外观资料。

现有可复用能力包括独立的 [路线图导航](../src/simulation/route-navigation.js)、驻留地面、[分区加载](../src/runtime/section-stream.js)、连续玩家状态、镜头碰撞、稳定来源身份及带版本的私人返回。[section-residency.js](../src/runtime/section-residency.js) 当前限制两项下载、一项场景装配、桌面九个 BASE / 三个 NEAR 分区和 64 MiB 驻留资源估算；纹理验收另含环境、阴影等项目。它们是已有实现与预算，不代表新数据可以直接满足。

候选 13 标准报告的冷启动为 **7885.6 ms**，三次缓存重载为 **2767.7 / 2766.7 / 2647.7 ms**；事件时间戳响应 p95 **892.0 ms**、观察帧间隔 p95 **972.3 ms** 仍未通过。条件是 Chromium 151.0.7922.173 / SwiftShader，报告原始 SHA256 为 `f76a6480651653daa4461a78807e7ba8ced6f484f280cc63932ce1025b5ef2c6`。规范包为 `65167ee402d6d59978b5f979de8c6987721ec891ffec1ce6127831d7c0dd354e`；实际执行包与规范包的调试映射差异保留在既有绑定中。参见 [标准性能证据](../evidence/neighborhood-20261024/performance/candidate-13/README.md) 与 [剩余延迟调查](../evidence/neighborhood-20261024/performance/remaining-latency-review.md)。

既有 trace 支持软件合成读回与呈现等待是重要限制；它没有测量下面的新表示。论文或产品示例的帧率不能证明本应用、同一街段或当前软件环境会加速。物理 GPU 的验收仍然需要实际设备。

## 有现成数据线索的优先样本

MLIT 的 [京都 LOD3 教程](https://www.mlit.go.jp/plateau/learning/tpc32-1/) 明确：先斗町、祇园新桥部分范围提供门窗级 LOD3；先斗町示例选择网格 `52354601` 并导入纹理。教程展示的原始模型具有店铺招牌、灯笼及栏杆，也加入了额外物件、细节与夜景制作。教程效果不能作为原始数据验收结果。

建议优先核查其中 **150–250 m 连通街段的原始纹理模型**。目前只确认官方资料与获取路径，尚未验证所选街段的文件、纹理完整性、实际表面质量和连续可步行高度。先斗町的证据不能证明 Nishiki→西侧天满宫具有同等数据覆盖。

PLATEAU 的标准来源是 CityGML；[GIS Converter 官方教程](https://www.mlit.go.jp/plateau/learning/tpc30/) 提供 glTF / 3D Tiles 转换及纹理选项，[官方配信说明](https://docs.plateauview.mlit.go.jp/datasets/3d-tiles/) 另提供可视化 3D Tiles 与来源获取入口。实验应保留建筑身份、原始纹理及转换变换，不再经过现有通用立面生成器。电影教程删除道路等对象的做法不适用于连续行走；地面、门槛、台阶、檐下和障碍需要独立核查。

转换需要明确水平与垂直基准：保留来源 CRS / 高程语义，在样本附近建立米制局部坐标与到地理坐标的可逆变换。不得把当前路线作者设定的 `height=0` 自动套用到新模型。碰撞网格与视觉网格可以采用不同密度，但坐标、洞口和可通行范围必须对应。

## 表示方式与体验条件

| 方式 | 对真实感的贡献 | 连续行走、交互与日夜限制 | 浏览器及运营代价 |
| --- | --- | --- | --- |
| 原始纹理 LOD3 / 地面摄影测量三角网格 | 保留被采集的形状、开口和表面图像；原始 PLATEAU 是具体可调查的数据来源 | 支持自由相机与实体碰撞；原始孔洞、接缝、薄面、不可达背面需要审查。颜色贴图常含拍摄光照，动态灯光不能自动分离它 | 按区域交付 glTF / 3D Tiles；几何、纹理解码、材质数量和 GPU 上传需要预算；自托管产生存储与流量成本 |
| 3D Gaussian Splatting + 经审查的碰撞网格 | 多视图采集保留细小外观和视角变化；适合比较街面真实感 | 相机可连续移动，但可接受视点范围由采集覆盖决定；splats 不自动构成可靠地面或实体。与角色的深度遮挡、点击细节及日夜效果均需验证 | 需要分页 / LOD、排序、透明混合与资源回收；高填充率不能等同于低成本。采集、训练、清理和更新具有独立成本 |
| CesiumJS + Google Photorealistic 3D Tiles | 提供实际有覆盖地区的大范围纹理城市形态 | 允许连续三维相机；当前资料未证明所选街道的行人视高、骑楼内部或店面可用。相机防穿透不等于经审查的行走导航 | 成熟地理瓦片选择 / 缓存 / 归属显示；需要服务密钥、计费与在线请求，供应商数据更新与存储条款影响永久返回 |
| 街景全景序列 | 在实际拍摄点呈现照片中的街景细节；可作外观对照 | 旋转自由，位移沿全景节点跳转；侧移、绕柱视差与任意高度受到限制。照片光照固定，其他时段需要对应影像 | 分辨率瓦片与相邻节点预取易于控制；供应商 API 或自有照片的托管成本不同。替代自由三维行走需要明确产品决策 |
| 连续三维走廊 + 局部采集外观 / 可选全景 | 允许按实际数据质量组织地面、建筑、细节与背景 | 共同坐标与连续位置可以保留；色调、深度、遮挡和表示切换必须连贯。全景进入/退出需要明确过渡 | 同时维护不同数据与缓存；只有实测收益能够支持采用这种组合 |

全景接口的实际行为见 [Google Street View Service](https://developers.google.com/maps/documentation/javascript/streetview)：邻接链接连接全景，朝向与位置分开变化；该接口文档只保证 pano ID 在当前浏览器会话内稳定。保存需要保留地点、视向及重新定位结果，不能承诺供应商永久提供同一画面。拥有许可的自有全景也可由 [Marzipano](https://www.marzipano.net/) 等网页查看器交付；这仍保留拍摄点式交互。

## glTF、3DGS 与候选渲染器

**glTF 是交付格式，三角网格与 Gaussian Splatting 是不同表示。** 当前 Khronos 官方 [KHR_gaussian_splatting](https://raw.githubusercontent.com/KhronosGroup/glTF/main/extensions/2.0/Khronos/KHR_gaussian_splatting/README.md) 已标为 Ratified，定义位置、旋转、尺度、不透明度和球谐外观。容器标准化不会附带行走地面、物理实体或材质反演结果。

仓库固定 Three `0.186.1` 的 `GLTFLoader` 文档将该扩展列为需单独注册的插件；当前 [section-assets.js](../src/runtime/section-assets.js) 仅设置 MeshoptDecoder，没有注册 splat 插件。因此现有加载链不能据文件扩展名直接承诺兼容。新样本需记录具体扩展、压缩版本及实际解码器。

| 技术选项 | 已核实能力 | 对此次实验的意义 |
| --- | --- | --- |
| Three + 原始纹理网格 | 当前应用已有 glTF、分区、碰撞和资源观测 | 可用于测量保留真实来源外观后的效果；不预设保留现有界面或渲染实现就是最终选择 |
| Three + Spark 2 | [SparkRenderer](https://sparkjs.dev/docs/spark-renderer/) 使用 Three WebGLRenderer；[预生成 RAD 与分页 LOD](https://sparkjs.dev/docs/lod-getting-started/) 能避免浏览器每次生成完整 LOD 树 | 可将表示差异限定在同一交互样本内；需测量排序、页面缓存、角色合成与实际显存。局部坐标能减轻其紧凑坐标编码的精度问题 |
| PlayCanvas GS | [性能文档](https://developer.playcanvas.com/user-manual/gaussian-splatting/building/performance/) 提供 Streamed SOG、全局 splat 预算及逐级加载；[按需绘制](https://developer.playcanvas.com/user-manual/gaussian-splatting/building/render-on-demand/) 提供完成排序 / 加载后的绘制通知 | 适合验证完整 GS 工作流，需另接导航、保存和 UI。停止绘制后后台流式处理仍可能继续，必须另外验证真正隐藏时暂停与取消 |
| CesiumJS / 3D Tiles | [Cesium3DTileset](https://cesium.com/learn/cesiumjs/ref-doc/Cesium3DTileset.html) 提供屏幕误差、移动时请求裁剪、估算缓存、相机碰撞与完成事件 | 原始资料已经是地理瓦片时可用。缓存允许配置的溢出，不能把默认值当应用资源上限；瓦片细化完成也不证明地面经过审核 |

目前没有测得上述工具对同一街段的速度差异。GS 官方性能文档指出排序和透明 overdraw 的成本；建议关闭 MSAA / 降低像素数的优化不能直接算作本项目等质量比较的收益。实验需要锁定视口、DPR 和认可的边缘质量，记录各表示实际抗锯齿方式及所有额外 pass。

## 拍摄光照、夜景和伙伴角色

摄影测量颜色贴图与常规 3DGS 外观通常保存拍摄时的阴影和亮度。[Agisoft 官方去光照说明](https://agisoft.freshdesk.com/support/solutions/articles/31000158885-remove-lighting-from-texture-in-agisoft-metashape-professional) 明确其方法依赖假设，无法普遍恢复光照中性的颜色，强投影阴影不在该工具支持范围。把贴图接到 PBR 材质之后仍需检查重复阴影、反射和店铺灯光。

[PlayCanvas relighting](https://developer.playcanvas.com/user-manual/gaussian-splatting/building/relighting/) 目前使用与场景接近的代理网格，受普通灯光照明后渲染到离屏纹理，再按屏幕像素调制 splats。该方法引入代理网格制作、纹理与额外渲染 pass；网格轮廓误差会移动光照边界。它不提供原始光照已被可靠去除的保证。夜景需用同地点实际影像审查，不能仅调暗曝光视为完成。

[PlayCanvas 阴影文档](https://developer.playcanvas.com/user-manual/gaussian-splatting/building/shadows/) 支持 splats 投射阴影，接收其他物体阴影则使用近似表面的 shadow catcher。未来伙伴角色与 splats 的相互遮挡、脚底接触和受光效果因此属于实际样本检查。此次不实现多人行走。

原始 [3DGS 研究](https://repo-sam.inria.fr/fungraph/3d-gaussian-splatting/) 的高帧率来自其指定数据、实现与硬件，不能迁移为网页性能承诺。它从多视图照片重建新视角；缺少实际街面观测时，没有依据承诺招牌或遮挡后区域的真实性。

## 在线服务与费用边界

[Google Photorealistic 3D Tiles](https://developers.google.com/maps/documentation/tile/3d-tiles) 需要启用计费、API key 和显示归属信息的兼容查看器。它的数据覆盖应在实际街段核查，尤其是廊下、窄街和建筑入口。供应商提供城市纹理模型这一事实不足以证明它可以替换地面采集。

[Map Tiles 政策](https://developers.google.com/maps/documentation/tile/policies) 要求遵守缓存头与归属，限制预取、离线存储和非可视化提取；叠加的自有模型不得从 Google tiles 人工或机器描摹派生。Google 内容不能未经许可用作自有 mesh / GS 训练素材。供应商可视化方案无法沿用当前自有资产永久镜像与 SHA 固定的全部语义。

2026-10-27 查询的 [Google 全球公开价格](https://developers.google.com/maps/billing-and-pricing/pricing)，美元 / 千次计费事件：

| SKU | 月免费额度 | 首个收费区间单价 |
| --- | --- | --- |
| Dynamic Street View | 5,000 | $14，至月100,000事件 |
| Street View Tiles | 100,000 | $2，至月1,000,000事件 |
| Photorealistic 3D Tiles | 1,000 | $6，至月100,000事件 |

[SKU 定义](https://developers.google.com/maps/billing-and-pricing/sku-details) 将 Dynamic Street View 与全景对象实例化关联；Street View Tiles 还包含 tile、thumbnail 和 PanoID 请求。不同 SKU 的事件不能按访问人数直接互换。举例：月10,000次计费全景实例化、没有其他计费项目时，该 SKU 约为 $70；这是价格算例，未测量本应用实际请求数。3D Tiles 的根请求、会话时效与 renderer quota 另见 [使用限制](https://developers.google.com/maps/documentation/tile/usage-and-billing)。不启用账户或付费服务。

自托管原始纹理模型或有许可的采集数据，费用由采集 / 授权、处理 / 清理、存储、实际 CDN 出站字节、请求和更新组成。客户端渲染不要求每个访客使用服务端渲染 GPU；离线重建 / GS 训练另需计算资源。尚无本走廊的样本字节与采集报价，不给出伪精确月账单。Cesium ion 托管和直接使用 Google API 也须分别核算。

## 有边界的选择实验建议

以下为待决策的实验设计，尚未实施。

1. **确定实际数据覆盖。** 优先检查先斗町150–250 m原始纹理LOD3，包含两处可辨识建筑/街面特征、狭窄路段与转向。记录文件哈希、采集日期、来源许可、纹理尺度、坐标/高程、缺口和可行走区域。保留原始资料；官方电影成片不进入原始数据质量计分。
2. **固定同一走廊与交互。** 原始纹理 mesh 为具体数据样本；只有取得同一范围许可地面照片 / 扫描时，才加入 mesh 与 GS 的同资料对比。不得用另一城市的精美 GS 示例对照京都现有模型。用公开纹理模型渲染训练 GS，只能比较该模型的另一种表示，不能宣称获得真实街面新证据。
3. **共同的空间依据。** 两种表示采用相同米制局部坐标、经审查的 ground/collision 网格、速度、玩家尺寸、路段与相机自由度。碰撞与导航在视觉 LOD 之外驻留。前方必须有可接受的视觉内容才允许继续进入；等待或失败保留当前位置、目的地和返回状态。分区边界不重置玩家与镜头。
4. **固定观察过程。** 同一进入点、连续前进、侧移观察门框、转角回望、檐下停留、检查细节、保存并返回；加入朝向相反的实际行走。标签隐藏时检查地点/建筑辨识与照片对应。保留建筑缺口、浮动物、文字失真、贴图接缝、LOD变化和角色遮挡的问题。
5. **分别记录首次画面与完整质量。** 原始冷启动一次、保留HTTP缓存的完整重载三次；记录首次可操作画面、认可细节完成、请求 / 压缩 / 解码字节、上传、排序、shader编译、主线程与GPU时间。保留原始标准门限：冷启动≤8 s、每次warm≤3 s、事件时间戳到状态与提交绘制p95≤100 ms、观察帧间隔p95≤33.3 ms；Q03每次warm locale<500 ms继续独立存在。首个低细节画面不能代替完整质量结果。
6. **质量和环境条件。** 同视口1440×1000、DPR1、10 Mbit/s / 80 ms及同硬件浏览器，保留认可的纹理与边缘质量。物理GPU需记录真实型号、驱动和WebGL/WebGPU后端；软件环境作为独立条件，保留历史失败。运行真实可信输入、隐藏 / 恢复、加载取消 / 重试、往返卸载与资源统计。GS另计排序缓存、splat缓冲区、代理与离屏纹理，不能只沿用三角数量预算。
7. **光照单独作出结论。** 固定拍摄光照为真实性基准；动态日夜需要对应实景参考与实际同场景测试。若无法达到可信日夜，应明确记录能力缺口，由产品决定表现语义，不能暗中用固定照片替换当前控制。

未来多人兼容性可在数据选择时保留：`sceneId/revision`、`navigationRevision`、局部坐标变换、玩家位置/朝向与稳定 `featureId` 独立于渲染器。视觉 LOD 不作为服务器移动验证依据。GS外观使用审查后的几何作空间依据；全景方案需要自己的节点 / 视向状态，不能把 pano ID 当三维坐标。当前 Together 继续只有已实现的共同规划能力。

## 已有资料与尚待取得的证据

| 状态 | 内容 |
| --- | --- |
| 已核实 | 当前生成器 / 运行时限制；现有软件环境性能失败；官方先斗町 / 祇园新桥部分纹理LOD3线索与格式转换；Spark分页、PlayCanvas GS/代理重照明、Cesium瓦片能力；Google公开计费与使用政策 |
| 尚待来源核查 | 所选150–250 m的实际原始模型 / 纹理、逐资源许可、街面连通性与地面高度、可接受观察范围、实际GS采集数据；Nishiki→天满宫等量覆盖仍未建立 |
| 需要获准采集或样本处理 | 缺失的地面观测；同一来源的mesh与GS；碰撞网格、曝光/光照处理、合法发布资料与刷新方案 |
| 需要获准原型与真实GPU | 同场景辨识 / 连续行走 / 遮挡 / 日夜比较、完整质量加载、输入与帧率、资源和实际服务成本；没有引擎迁移或自动性能提升结论 |
