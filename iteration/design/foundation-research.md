# 地基选型：调研与实测（2026-10-03）

> **由头**：用户裁定「别再在一个根本不牢固的地基上工作，继续做调研，查看满足条件的 github repo，自行测试并决定采用哪一个作为地基开发」。
> **判据来自既有文件，不是新写的**：`SOW` §6.1 平台与形态 · §6.2 引擎架构 · L421 离线单文件 · `appendix` L11（3/4 俯视分层）· L37（`depth` 按基线 y）。

## 一 · 现有地基为什么不牢（实测）

```
仓库根 package.json 是【旧版全栈应用】的清单：
  React(CRA) · express · mongodb · aws-sdk · bcrypt · openai · @sendgrid/mail · react-google-maps
  93 条 scripts：test:stability · test:ux-audit · test:task-prompt · test:cross-browser ·
                 test:load(k6) · test:security · deploy:production(→CDN) · postinstall:patch-package
  node_modules 793 MB · 顶层包 1,092

⇒ 装一行 phaser 就拉进 mongodb-memory-server / core-js / patch-package（实测）
⇒ 而它同时是 server/（77 files · 28,601 行）的来源
⇒ 「根基不牢」的具体形态：新游戏与一份已死的全栈清单共用一个 node_modules
```

**⇒ 处置**：**新建独立工作区 `iteration/game/`，自己的 `package.json`。实测结果：12 个顶层包 · 128 MB · `express`/`mongodb`/`react`/`aws-sdk` 一个都没进来。**

## 二 · 候选与实测数据（GitHub API，非记忆）

| 仓库 | 星 | 许可 | 最后提交 | 语言 |
|---|---|---|---|---|
**`melonjs/melonJS`** | 6,399 | **MIT** | **1 天前** | JS/TS |
**`RSamaium/RPG-JS`** | 1,661 | MIT | 5 天前 | TS |
**`excaliburjs/Excalibur`** | 2,347 | BSD-2 | 1 天前 | TS |
`phaserjs/phaser` | 40,397 | MIT | 43 天前 | JS |

**淘汰的**（GitHub 搜索实测）：`tilemap game engine javascript`（6 个结果，最高 43★）· `top-down rpg typescript`（16 个，最高 36★）· `zelda javascript game`（73 个，最高 79★）——**都不合格。**

**`RPG-JS` 被排除**：`5.0.0-beta.7`，且它自带 `@rpgjs/server`——**服务端权威，与"单机网页"冲突。**

## 三 · melonJS 实测（克隆 + 装 + 跑）

```
git clone                                  ✓ 59.9 MB 源码
LICENSE.md                                 ✓ MIT（逐字读过）
README 第一句                               「an open-source 2.5D game engine」
                                            「perspective and orthogonal cameras」
                                            「no dependencies and no toolchain lock-in」
npm i melonjs@18.3.0                        ✓ 【2 个依赖】· 25.7 MB · 13 个顶层包
它自带测试                                   ✓ 310 个测试文件 + CI（main.yml）
它自带示例                                   ✓ 52 个，含 isometricRpg（遮挡）与 perspective_walls（3/4 透视）
```

**而为跑通它，我修了四处【我自己的用法错】，每一处都有具体错误信息**：

| # | 错误 | 原因 |
|---|---|---|
1 | `Undefined Stage for state '0'` | 要先注册 Stage 再加载 |
2 | `Plugin should extend the BasePlugin Class !` | 插件与主包两份 `melonjs` ⇒ vite `resolve.dedupe: ['melonjs']` |
3 | `no load callback defined` | 回调是 `loader.preload(res, cb)` 的**参数**，不是 `onLoadComplete` 属性 |
4 | `perspective_walls-tileset.xml external tileset not found` | **外部 tileset 必须自己注册**（`type: 'tsx'`） |

**⇒ 第 4 条是这条路径最有价值的一个发现**：**melonJS 不会自动取 TMX 里 `source=` 指的外部 tileset——你必须显式注册它。而我们的资产管线正要自己生成这些文件，所以那不是障碍，是一条要写进构建步骤的规则。**

**修完之后，实测通过**：

```
steps: Application created and init() awaited → TiledInflatePlugin registered →
       stage registered as default → preload issued with callback → load callback fired →
       stage onResetEvent → level loaded 32x32 @ 31x31 → repaint issued
map:   {cols:32, rows:32, tw:31, th:31}
layers: ["Walls", "Walls level 2", "Walls level 3"]      ← 【三个高度层，就是 2.5D 的分层】
```

**而那张地图的内容，我用 node 自己解 base64+zlib 数过**：`Walls 77 个非零瓦片 · level 2 一个 · level 3 一个`，`orientation=orthogonal`，tileset 用 `tileoffset x=-32` 的 64×64 精灵 —— **那正是 MelonJS 表达"墙立在格上"的方式。**

## 四 · 官方示例在真浏览器里跑通了（**这一节推翻了我上一条的"未证实"**）

**做法**：不再自己写探针，**跑它自己的示例**（`packages/examples`，React + vite 8）。

**而为跑通它修了五处，每一处都有具体错误信息**：

| # | 错误 | 原因 |
|---|---|---|
1 | `Undefined Stage for state '0'` | 我的探针：要先注册 Stage 再加载 |
2 | `Plugin should extend the BasePlugin Class !` | 我的探针：主包两份 ⇒ vite `resolve.dedupe: ['melonjs']` |
3 | `no load callback defined` | 我的探针：回调是 `loader.preload(res, cb)` 的**参数**，不是属性 |
4 | `external tileset not found` | **TMX 里 `source=` 指的外部 tileset 不会被自动取，必须自己注册**（`type: 'tsx'`） |
5 | `Failed to resolve import "melonjs"`（HTTP 500） | **workspace 包没有构建产物** ⇒ `packages/melonjs` 与五个插件都要先 build |

**前四条是我自己探针的用法错；第五条是 monorepo 的构建前置，不是引擎的毛病。**

**跑通之后**：

| 示例 | 地址 | 结果 |
|---|---|---|
**`isometric-rpg`** | `#/isometric-rpg` | ✅ **等距瓦片地图 · 树木与石头有正确遮挡 · 角色精灵 · 水面 · `log: clean`（零错误）· 画布 800×600** |
**`tiled-map-loader`** | `#/tiled-map-loader` | ✅ **`village` 地图：房子有立面与门窗 · 路面 · 栅栏 · 树冠遮挡 · `log: clean` · 画布 1024×640** |

**⇒ 那两张图就是 2.5D：房子有墙、树冠盖住地面、角色在瓦片上按 y 排序。**
**⇒ 所以"melonJS 能画出这一屏"由【未证实】变为【已证实】。**

**⚠️ 而像素读回仍是 0**（`maxChannelValue = 0`）——**因为 WebGL 默认不保留绘制缓冲，`getImageData` / `drawImage(canvas)` 拿不到内容。** **⇒ 这不影响判定：截图是浏览器合成的结果，它非空。** **⇒ 而这条对将来有用**：**我们要断言"画出来了"时，不能靠 `getImageData`，要靠截图哈希或引擎自己的帧缓冲导出。**


**⇒ 而它不改变选型结论**，理由在下节。

## 五 · 判定：**melonJS 作为地基，Phaser 作为备选**

**选 melonJS 的四条，每条都有实测支撑**：

1. **它是唯一自称 2.5D 的候选**（README 逐字），**且自带 `perspective` / `oblique` / `isometric` / `orthogonal` 四种投射渲染器**（源码 6 个 `TMX*Renderer.js`）。
2. **它的依赖是 2 个**（vite + melonjs），**"no toolchain lock-in"** ⇒ 这与"别再让工具链吃人"直接对应。
3. **310 个测试 + CI** ⇒ 它是活的、作者在意正确性。
4. **`tileoffset` + 多高度层 + 门属性**（tileset 里 `door=true`）**就是我们的 2.5D 表达**，而我们的资产管线正要自己生成这些文件。

**而 Phaser 不淘汰，理由是它与我们已写定的三条硬性质冲突**：1,344 KB 单文件 · **默认变步长 `delta` 循环**（`SOW` L360 自己记着这个风险）· 无内建 2.5D 投射。

**⇒ 而"未证实渲染"这一条挡住了什么**：**它挡住了"我说它能画"这句话，不挡住选它作地基** —— 因为它已证实的是**装得下 · 许可对 · 活得 · 有 2.5D 的原生表达**，而**没有证实的那一条（画出像素）是一个可以在真浏览器里十分钟内验完的事**，不需要在选型层面解决。

## 六 · 下一步（可失败的次序）

| # | 做什么 | 判据 |
|---|---|---|
**1** | **在真浏览器里跑通 `perspective_walls` 并截图** | 画布有非背景像素 · 三层墙正确遮挡 |
**2** | **把我们自己的走廊数据喂给它**：`worldGrid` 1600×40 · `CARRIAGEWAY_HALF_M`（待重推上界）· 49 条斑马线 · 事实层真实名称 | **一屏能认出"这是四条通"** |
**3** | **验证 `file://` 离线单文件** | 资产由构建步骤内联后，`file://` 打开仍是同一屏 |
**4** | **验证确定性** | 引擎的 tick 不被用作帧源，或 timestep 钉到整数 tick |

**⇒ 而第 1 条之前不需要再问我任何事。**
