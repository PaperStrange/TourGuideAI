// The six items I owed, plus export-guard's finding about criteria that can never go green.
import { readFileSync, writeFileSync } from 'node:fs';

const P = 'D:/All-Downloads/TourGuideAI/iteration/design/SOW.md';
let t = readFileSync(P, 'utf8');
const done = [], miss = [];
const swap = (label, from, to) => {
  if (!t.includes(from)) { miss.push(label); return; }
  t = t.replace(from, to); done.push(label);
};
const Q = '\u0060';
const cb = (s) => Q + s + Q;

// 1. play-systems-designer: the criterion appears twice and both must use the state property, not a name table
t = t.split('首帧名称集合 = 事实层 `inSceneWindow` 集合').join(
  '**`derived` 全空与全满两次渲染，名称集合必须相同**（标记集合当然不同）——' +
  ' **⚠️ 原措辞"首帧名称集合 = 事实层 `inSceneWindow` 集合"是错的**（' + cb('play-systems-designer') + ' 自己抓出，第三次同形状）：**它的首帧规格里锚点只有形状、没有名字**（只有状态读数显示一个名字），' +
  '"6 个名字同时出现在首帧"**就等于它明确拒绝的任务日志**。**改为状态性质：`visible(a)` 与 `derived` 无关——`derived` 只点亮【标记】，不改变【名称】。**');
if (t.includes('**`derived` 全空与全满两次渲染，名称集合必须相同**')) done.push('1 inSceneWindow criterion replaced (both sites)');
else miss.push('1 inSceneWindow criterion');

// 2. play-systems-designer: the field list must come from the render path, and err broad
swap('2 fixture field list anti-padding',
`**⇒ 所以不要写"这需要一次受控改动"——写成"两次烘焙 + 集合比较"，它就从"听起来很贵所以会被跳过"变成"顺手就做"。**`,
`**⇒ 所以不要写"这需要一次受控改动"——写成"两次烘焙 + 集合比较"，它就从"听起来很贵所以会被跳过"变成"顺手就做"。**

**⚠️ 而它给 (c) 的 fixture 契约加了一条防伪条件，必须写明**：
> **那份字段清单必须【从渲染路径里抽出来】，不得手写。** **方向必须写明：宁可过宽。**
> **过宽只会让差分里"变了"的集合变大（无害）；过窄才会让一条硬编码顶替掉一个事实层字段——而那正是要抓的。**
> **理由**：**手写的清单会变成一张可以凑的表——凑长它并不等于规格完整。**
> **而它把丑话说在前面**：「**若 `export-guard` 列出的字段比我 §1.4 写的多，那是我漏了——那正是我要的那种反馈，不是它的错。**」`);

// 3. geo-contract: the gate-eligibility line belongs at R2, not inside the provenance ceiling
swap('3 gating line moved to R2',
`> **⇒ 在 R2 的问句下面补一行判据**：**「它是某座城市暴露的，还是任何城市都会遇到的？前者进已有脚本，后者才准许新门。」**

**⚠️ 而"每城一个目录"这句话解掉了它那张卡该不该存在的问题**`,
`> **⚠️ 而这条判据的位置错了（${cb('pack-curator')} 复核后指出），已搬到 §11 R2**：
> **它原先在 §4.2，而一个问"我这张卡算不算越界"的人不会去翻 attestation 上限那一节**；**它该在问"这道门算不算新增"的人读到它的那一刻——那就是 ${cb('R2')}。**
> **而它原先还带着一句自相矛盾的话**（"⇒ 在 R2 的问句下面补一行判据"）——**它承诺了一个别处的位置，而自己不在那里。** **⇒ §4.2 只留指针，不复制全文**（两份全文会长出第二份要同步的副本，正是 R2 在防的事）。

**⚠️ 而"每城一个目录"这句话解掉了它那张卡该不该存在的问题**`);

// 4. pack-curator: 33 not 41, measured rather than reasoned, and it corrected my reason too
swap('4 33 not 41, measured',
`**⇒ 但你是事实层的 owner，而后果进导出物。⇒ 我请你确认，并加一件**：**改完后请贴出 \`guide.json\` 里"已验证"计数的前后差**——**那个差就是这次改动的可见代价，而它该被记下来，不是被感觉。**`,
`**⇒ 但它先做了实验再回答，而实验改了数字**（它的原话：**"我先做了实验，因为它比我判断可靠"**——备份 → 改 44 个坐标单元格 → 量 → 还原，\`git diff\` 为空）：
\`\`\`
                        改前        改后
verifiedColumnCount     115    →    82      (−33)
valueCounts.observed    132    →    91      (−41)
valueCounts.authored      4    →    45      (+41)
\`\`\`
> **⇒ 它上一轮报的"41 个单元格"是错的，正确是【33】**：**只有进入了攻略单元格的坐标才计入 \`verifiedColumnCount\`**；44 个坐标单元格里 **11 个没有进**。**它的话：「我第三次把'声明数'当成了'输出数'。」**
> **⚠️ 而它一并纠正了我给的理由**：**我说"已验证栏的值是零"——不准确。** \`observed\` 有 **132** 个，其中 **91** 个会留下。**代价不是"全部清零"，是"少 33 个坐标，而留下 91 个真的读到的值"。** **⇒ 这个数字比"零"更适合写进本文件，因为它可核。**
> **⇒ Lead 裁定：照改 (a)。** 顺序：22 条 \`valueKind\` → \`build-pack\` 幂等 → 贴 **115 → 82** → 修 \`L09\` → 贴 \`guide.json\` 前后差异。`);

// 5. pack-curator: L09's gap is not where I said it was
swap('5 L09 gap relocated',
`**⇒ 我们采纳。⇒ 而证据要求我按你的加**：**贴 \`guide.json\` 里那一段的前后差异。**`,
`**⇒ 而它随后【修正了自己上一轮的诊断】，因为它去看了导出物**：
\`\`\`
guide.json route.legs[L09].verified = [ measuredStraightM ]        <- 在已验证栏里
guide.json route.legs[L09].otherKinds.minutes = {
    value: 15, valueKind: "licenced",
    verifiedColumn: false,                                          <- 不在已验证栏
    labelJa: "规约常数（80 m/分）算出，非观测",
    derivation: "ceil(1122.6 m / 80 m per min) = 15" }
\`\`\`
> **⇒ 它上一轮说"攻略印 15 分而不带限定"是错的。导出物已经正确地**：15 分标 \`licenced\`、不在已验证栏、带 \`labelJa\` 说明是规约常数算的、还带算式。
> **真正的缺口更窄**：**\`minutes\` 的【输入】是 \`measuredStraightM\`（直线），而规则要的是道路距離** ⇒ **15 分不是"没带限定"，是"用了下限当估计值"**；\`derivation\` 写了算式，**没写"输入是直线、不是道路距離"**。
> **⇒ 两个修法，它倾向 (i)，而裁决在用户**：**(i) 取真正的道路距離**（从 OSM 取该步行路网；而那些 stop 的几何不在已烘场景里，是一次新抓取）· **(ii) 不改数字，改 \`derivation\`**（"下限：直线 1122.6 m / 80 = 15 分；道路距離未测"）。
> **它主张 (i) 的理由不是洁癖**：「**§3 的机械判据"实际耗时超出声明 ≥5 分钟 = 一次不确定事件"会因为这个偏低而【误报】——而误报会让那条判据在第一次真人走通时失去意义。**」

**⇒ 我们采纳。⇒ 而证据要求我按你的加**：**贴 \`guide.json\` 里那一段的前后差异。**`);

// 6. export-guard: a criterion that can never go green is worse than one that is always green
swap('6 never-green criterion warning',
`**R3 · 每次汇报必须带否定状态**——哪些东西不存在、哪些数是错的、哪条判据必然判不过。`,
`**R3 · 每次汇报必须带否定状态**——哪些东西不存在、哪些数是错的、哪条判据必然判不过。
> **⚠️ 而 ${cb('export-guard')} 报出一条更强的形式，必须写明**：
> **「一条注定红、而红的原因不是缺陷的判据，比一条必然绿的判据更坏：它训练人忽略红。」**
> **实例（它自己的卡）**：Lead 写的"首帧窗口内至少有 1 格有来源的内容"有**两种读法，两种都坏**——**含中心线（来自 ${cb('street.profile')}，有来源）⇒ 必然绿，无意义**；**指"窗口内有锚点格"⇒ 即使边缘指示器与偏置都做完也永远红**（最近锚点在**列 20**，出生窗口是**列 0..19**，而偏置是**垂直**的且 ${cb('dir = sign(11 − 11) = 0')}，垂直方向一动不动）。
> **⇒ 已换成**：**${cb('t = 0')} 的 HUD 里至少有 1 个来自事实层的真实名称。**（它今天就可判：状态读数已返回 ${cb('四条烏丸交差点 東側横断歩道')} / ${cb('20 m')}。）
> **⇒ 而这条与 R2′ 咬合**：**R2′ 问"这道门拦下过什么"；R3 问"这条判据**能不能**被拦下"——两条都要，因为一道拦不下任何东西的门与一条永远红的判据，形状是同一个。**`);

writeFileSync(P, t);
console.log('applied ' + done.length + ': ' + done.join(' | '));
if (miss.length) { console.log('MISSED ' + miss.length + ': ' + miss.join(' | ')); process.exit(1); }
console.log('all landed · ' + t.split('\n').length + ' lines');
