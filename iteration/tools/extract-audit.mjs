// Extract the audit trail from the SOW into a changelog.
// Each audit line becomes: in the changelog, a numbered entry keeping WHO caught WHAT;
// in the SOW, a one-line pointer. Nothing is deleted -- R3 requires negative state to stay readable.
import { readFileSync, writeFileSync } from 'node:fs';
const R = 'D:/All-Downloads/TourGuideAI/iteration/design/';
let S = readFileSync(R + 'SOW.md', 'utf8');

// The blocks to move: identified by the line that opens them. Kept as literal, checkable strings.
const blocks = [
  ['A1', '> **⚠️ 而 `L09` 的缺口不在我原先说的位置', 'L09 的缺口位置写错（我记成"导出物没带限定"，实际那处已正确；真缺口是 `minutes` 的输入是直线而规则要道路距離）', 'pack-curator（它去看了导出物后更正了自己上一轮的诊断）'],
  ['A2', '> **⚠️ 而这一句的署名有过矛盾，已定案', '一句引语的署名有过矛盾（我把它记在 review-src-zh 名下，而 SOW 里那个"它"指 fact-verifier）', 'review-src-zh（它拒绝认领不是它的话）'],
  ['A3', '**边界 D-1…D-4**：⚠️ **我原先把这四条写成了没有检查方式的句子', 'D-1…D-4 四条全部丢了"怎么检查"那一列，成了四条不能失败的句子', 'play-systems-designer（它指出不只 D-3/D-4，是四条全丢）'],
  ['A4', '**南立面的余量**（`doors-author` 实测；**我原先把错数 1.13 m 删掉了却没有补上这三个数', '删掉了错数 1.13 m 却没有补上三个正确余量，于是"被 parked"只剩形容词', 'doors-author（它指出"改了一半"）'],
  ['A5', '> **⚠️ 原措辞"首帧名称集合 = 事实层 `inSceneWindow` 集合"是错的**（`play-systems-designer` 自己抓出，**同形状的第三次**）：**它的首帧规格里锚点只有形状、没有名字**（只有状态读数显示一个名字），**"6 个名字同时出现在首帧"就等于它明确拒绝的任务日志。**\n> **⇒ 改为状态性质**：**`visible(a)` 与 `derived` 无关——`derived` 只点亮【标记】，不改变【名称】。两个状态、一次比较，不改数据，也不需要首帧上有一张表。**', '首帧判据写成"名称集合 = inSceneWindow 集合"，而该规格里锚点只有形状没有名字 ⇒ 那条判据要么不可达、要么逼出一个任务日志', 'play-systems-designer（同形状第三次，它自己抓出）'],
  ['A6', '**⚠️ 而这两处 `review-src-intl` 又抓出两个错，已改**', '出处文件名打错一个字符（`os-` 应为 `osm-`）⇒ 指针指不到；以及我在修掉第一条没核过的线之后又署了第二条', 'review-src-intl'],
  ['A7', '> **⚠️ 而这个限定词与下一句的依据都【不是 `review-src-intl` 的】——它自己报出这是同一形状的第三次（`review-src-intl` 核对时指出）**', '两条依据被我署成了 review-src-intl，而它们是 review-src-zh 的', 'review-src-intl（它自己拒绝认领）'],
  ['A8', '**⚠️ 而这一条的引文我原先配错了编号（`review-src-intl` 对照时抓出，我复核确认）**', 'Google 条款的引文配错了编号（引文在 ToS §3.2.4(e)，不在 Service Specific Terms）', 'review-src-intl'],
  ['A9', '**⇒ 上限的值是 Lead 的裁定**。**而"每城一份 attestation"我原先写成了文件数**', '"每城一份 attestation"被我写成了文件数，而实际是同一座城的 4 个文件', 'pack-curator'],
  ['A10', '**⚠️ 而本节此前写过一句假引用，已删（`review-src-jp` 对照时抓出，Lead 复核确认）**', '本节写过一句假引用，已删', 'review-src-jp'],
  ['A11', '> **⚠️ 而这里原先那句"出生时是横断歩道 → 之后 174 m 的巴士站 → 再之后才是门洞"是错的', '§8.3 的顺序阶梯例子里"174 m 的巴士站排第二"没有任何规则产出它（它是假设不是测量）', 'play-systems-designer（它自己抓出，并说明它没跑过序列）'],
  ['A12', '> **⚠️ 而这里原先写 `S1` 指示器——`doors-author` 指出该代号与 `status.md` §7 阶段表的 `S1`', 'HUD 表的 `S1`–`S4` 与阶段表的 `S1`–`S4` 四条全部同名，"§12② 挂在 S1 之后"因此歧义', 'doors-author（它第一轮只报了 S1 一条，实际是四条）'],
  ['A13', '**⚠️ 而这一句在它自己的复核里被推翻了——请以此为准（它对照 SOW 时更正了自己）**', '§8.6 引了"本规格天然避开顺序陷阱，因为 next 是纯函数"，而作者跑完整条顺序后推翻了它', 'play-systems-designer（它对照 SOW 时更正了自己）'],
  ['A14', '**🔴 而它拿出的那张表本身是错的——它随后自己更正了（我 SOW 这里原先转写的正是那张错表）**', '§8.6 的顺序表用欧氏+参照上一点，而该规格正文用曼哈顿+参照 walker ⇒ 它用一个实现了另一条公式的探针去验证自己那条公式的结论', 'play-systems-designer（同形状第四次）'],
  ['A15', '> **⚠️ 而这一句原先写反了（它自己抓出）**', '§8.6 首句写"这张静态表区分不了两条规则"，而括弧里说的正是它能区分——与同节另一处自相矛盾', 'play-systems-designer'],
];

const entries = [];
let n = 0;
for (const [id, opener, what, who] of blocks) {
  const i = S.indexOf(opener);
  if (i < 0) { console.log(`  MISS  ${id}  ${opener.slice(0, 50)}`); continue; }
  // find the end of this block: the next line that does not continue it
  const startLine = S.lastIndexOf('\n', i) + 1;
  const rest = S.slice(startLine);
  const lines = rest.split('\n');
  let end = 0, depth = 0;
  for (let k = 0; k < lines.length; k++) {
    const l = lines[k];
    const starts = /^\s*(>|·|\||\d+\.|- )/.test(l) || l.startsWith('**') || l.startsWith('⚠️');
    if (k === 0) { depth = 1; end = 1; continue; }
    if (l.trim() === '' ) { if (depth) { end = k; break; } else continue; }
    if (starts) { end = k + 1; continue; }
    break;
  }
  const block = lines.slice(0, end).join('\n');
  n++;
  entries.push({ id, what, who, removedLines: end, removedChars: block.length });
  S = S.slice(0, startLine) + `> 〔修订史 ${id}〕${what}——抓出者：${who}。\n` + S.slice(startLine + block.length + 1);
}

console.log('');
const total = entries.reduce((a, e) => a + e.removedChars, 0);
console.log(`  moved ${entries.length} blocks, ${total} characters (${(total / 5042 * 100).toFixed(0)}% of the trail measured)`);
writeFileSync(R + 'SOW.md', S);
writeFileSync(R + 'sow-changelog.md',
  `# SOW 修订史

> **本文件从 \`SOW.md\` 搬出**（2026-10-03）——**不是删除**。
> **\`R3\`（每次汇报必须带否定状态）要求"这个错犯过"是【可读】的**，所以每一条保留【错了什么】与【谁抓的】，去掉的只是英文原话引用与排比。
> **\`SOW.md\` 里每处只留一行 \`〔修订史 #n〕\` 指针。**

| # | 我原先错在哪 | 谁抓出 |
|---|---|---|
${entries.map((e) => `| **${e.id}** | ${e.what} | ${e.who} |`).join('\n')}

---

## 这些错当中有几类反复出现

| 形状 | 实例 |
|---|---|
**把一件【被跟踪输入派生的】东西说成"被跟踪的"** | \`scene.bin\` 那句 |
**把"没有语义消费者"说成"0 个读者"** | \`openings\` 层 · \`input.sha256\` 的"全仓库" |
**把一个【算出来的值】登记成来源值** | \`D-53\` · L09 的 \`publishedMinutes\` · 22 条坐标的 \`observed\` |
**给一个术语第二个意思** | \`derived\`（已发现集合 vs 派生量）· \`S1\`（阶段 vs 边缘指示器） |
**归属错**（三次，三个方向） | review-src-zh 的话署成 fact-verifier · review-src-jp 的话差点署成 review-src-zh · 两条署成 review-src-intl |
**引用一个我没打开过的地方** | "本文件 §4.2 上方的用户裁定引文" · L23/L98–104 · 行号指向别的段 |
**表格行跨物理行** | 三次：§4.1 的 1 cm 行 · §7 的 P3 行 · 首帧那行 |
**报了"已改"而盘上没有** | 六次（四次被评审用 grep 抓、两次我自己抓）· 详见 \`incidents.md\` INC-01 |

**⇒ 而它们的共同点是**：**全都是"关于这个值/这句话怎么来的"的断言，与它实际的来处不符**——**而这类字段天生没有读者，因为核它需要一个会问"这句话为真吗"的人。**
`);
console.log(`  SOW.md now ${S.split('\n').length} lines`);
console.log(`  sow-changelog.md written, ${entries.length} entries`);
