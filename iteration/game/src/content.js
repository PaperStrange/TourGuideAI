// Local slice content. Venue facts and authored interaction positions are separate.
// Source record extracts and geometry provenance ship in public/content-evidence/.
const l = (en, zh) => ({ en, zh });
const checked = '2026-10-05';

export const WORLD = {
  bounds: { minX: 0, maxX: 64, minY: -25, maxY: 15 },
  roadCenterY: -8.99,
  northFacadeY: 4.66,
  southFacadeY: -19.8,
  roadSurface: {
    northY: 1.68, southY: -16.879, valueKind: 'authored',
    basis: 'Presentation bounds inset 0.65 m from mapped crossing endpoints on sidewalk centrelines; these are not observed kerbs.',
  },
  spawn: { x: 23.8, y: 2.1, valueKind: 'authored' },
  crossing: { x: 20.721, northY: 2.33, southY: -17.529, width: 2.6, widthKind: 'authored' },
  buildings: {
    north: { nameJa: '京都三井ビルディング', name: l('Kyoto Mitsui Building', '京都三井大厦'), osmId: 205732558, minX: 16.522069, maxX: 58.329294, yFrom: 4.659507, yTo: 4.770448 },
    south: { nameJa: '京都ダイヤビル', name: l('Kyoto Daiya Building', '京都钻石大厦'), osmId: 205732536, minX: 17.526173, maxX: 35.691321, yFrom: -19.969317, yTo: -19.747436 },
  },
};

export const SOURCES = {
  crossing: { id: 'osm-crossing', title: 'OpenStreetMap · crossing 2737069286', url: 'https://www.openstreetmap.org/node/2737069286', verifiedAt: '2026-09-29', licence: 'ODbL 1.0', attribution: '© OpenStreetMap contributors' },
  mitsui: { id: 'osm-mitsui', title: 'OpenStreetMap · 京都三井ビルディング', url: 'https://www.openstreetmap.org/way/205732558', verifiedAt: '2026-09-29', licence: 'ODbL 1.0', attribution: '© OpenStreetMap contributors' },
  daiya: { id: 'osm-daiya', title: 'OpenStreetMap · 京都ダイヤビル', url: 'https://www.openstreetmap.org/way/205732536', verifiedAt: '2026-09-29', licence: 'ODbL 1.0', attribution: '© OpenStreetMap contributors' },
  access: { id: 'kamakura-access', title: 'Kamakura Shirts · Kyoto Mitsui store announcement', url: 'https://www.shirt.co.jp/news/info/2403_kyoto/', verifiedAt: checked, publishedAt: '2024-03-01', licence: 'Operator facts paraphrased; source text and images not redistributed' },
  bank: { id: 'mufg-kyoto', title: 'MUFG Bank · Kyoto Branch', url: 'https://map.bk.mufg.jp/b/bk_mufg/info/BA590331/', verifiedAt: checked, licence: 'Operator facts paraphrased; source text and images not redistributed' },
  cards: { id: 'mufg-overseas-cards', title: 'MUFG Bank · overseas-issued cards', url: 'https://www.bk.mufg.jp/tsukau/atm_con/atm/kaigai_card.html', verifiedAt: checked, publishedAt: '2025-07-01', licence: 'Operator facts paraphrased; source text and images not redistributed' },
  exchange: { id: 'wcs-kyoto', title: 'World Currency Shop · Kyoto', url: 'https://www.tokyo-card.co.jp/wcs/shopdtl.php?no=44', verifiedAt: checked, licence: 'Operator facts paraphrased; source text and images not redistributed' },
};

const fact = (enLabel, zhLabel, en, zh, sourceIds) => ({ label: l(enLabel, zhLabel), value: l(en, zh), sourceIds });
const choice = (id, en, zh, enDescription, zhDescription, enOutcome, zhOutcome, addsToRoute, extra = {}) => ({
  id, label: l(en, zh), description: l(enDescription, zhDescription), outcome: l(enOutcome, zhOutcome), addsToRoute, ...extra,
});
const frontage = l('An authored reading point beside the building; the exact entrance and interior have not been reconstructed.', '这是楼前的游戏互动点；尚未还原实际入口与室内。');

const crossing = {
  id: 'crossing', x: 20.721, y: 2.33, approachY: 2.33, kind: 'crossing', modelled: true,
  title: l('Shijō–Karasuma crossing', '四条乌丸路口'),
  originalJapaneseName: '四条烏丸交差点 東側横断歩道',
  nameValueKind: 'authored', interactionMode: 'public-space',
  provenance: { position: 'derived', note: l('Reading point at the north end of mapped crossing way 465069430. The descriptive name, zebra width and game signals are authored.', '互动点位于地图中横道 465069430 的北端。位置描述名称、斑马线宽度和游戏信号为设计表达。') },
  interaction: {
    eyebrow: l('01 · GET YOUR BEARINGS', '01 · 认清方向'),
    title: l('Two sides of the same street', '一条街，两种选择'),
    body: l('Mitsui is on the north side; the bank is in Daiya on the south. Keep exploring the north pavement, or follow this crossing toward the bank. Your choice becomes a note in your walk.', '北侧是三井大厦，南侧钻石大厦里有银行。可以先逛北侧，也可以沿横道去银行看看。你的选择会留在散步记录里。'),
    facts: [
      fact('Crossing', '横道', 'Mapped as signal controlled, with tactile paving and audible signals.', '地图记录为信号控制横道，设有盲道与声音提示。', ['osm-crossing']),
      fact('South landmark', '南侧地标', 'MUFG identifies its Kyoto branch at the southeast corner, inside Kyoto Daiya Building.', '三菱 UFJ 官方将京都支店标在路口东南角的京都钻石大厦内。', ['mufg-kyoto']),
    ],
  },
  choices: [
    choice('north-first', 'Explore the north side', '先逛北侧', 'Go toward Kyoto Mitsui Building.', '去京都三井大厦前看看。', 'North side first; keep the crossing as a landmark.', '先逛北侧，将路口记作地标。', true, { nextTargetId: 'mitsui', routeKind: 'waypoint' }),
    choice('bank-first', 'Head toward the bank', '先去银行方向', 'Use the crossing to reach the south pavement.', '沿横道走到南侧人行道。', 'Cross to the south side for the cash-services stop.', '走到南侧，查看现金服务。', true, { nextTargetId: 'mufg', routeKind: 'waypoint' }),
  ],
  sources: [SOURCES.crossing, SOURCES.bank],
};

const mitsui = {
  id: 'mitsui', x: 32, y: 3.2, approachY: 3.2, kind: 'place', modelled: true,
  title: l('Kyoto Mitsui Building', '京都三井大厦'), originalJapaneseName: '京都三井ビルディング',
  nameValueKind: 'observed', translatedNameValueKind: 'authored', interactionMode: 'frontage',
  provenance: { position: 'authored', note: frontage },
  interaction: {
    eyebrow: l('02 · READ THE CITY', '02 · 读懂城市'),
    title: l('One building, two station names', '一栋楼，两个站名'),
    body: l('The shirt shop in this building gives two station names in its directions: Karasuma for Hankyu and Shijō for the city subway. Its access note points to Exit 20. Save the distinction for a future arrival, or keep today’s walk above ground.', '楼里的衬衫店在指路时写了两个站名：阪急的「烏丸」和市营地铁的「四条」。店家的交通说明指向 20 号出口。可以把这条线索留给下次抵达，也可以继续在地面散步。'),
    facts: [
      fact('Building', '楼名', '京都三井ビルディング is the mapped building name.', '地图中的日文楼名是「京都三井ビルディング」。', ['osm-mitsui']),
      fact('Access clue', '交通线索', 'The store’s official 2024 announcement names Hankyu Karasuma, subway Shijō and Exit 20.', '店家 2024 年官方开店说明列出阪急烏丸站、地铁四条站与 20 号出口。', ['kamakura-access']),
      fact('Before travelling', '出发前', 'Follow current station signs. This scene does not reconstruct the underground route or establish current shop hours.', '请以现场站内指示为准。本场景未还原地下通道，也未据此确认店铺现行营业时间。', []),
    ],
  },
  choices: [
    choice('save-station-clue', 'Save the station clue', '记下车站线索', 'Keep both Japanese station names and the source link.', '保留两个日文站名与原始链接。', 'Arrival note: 阪急 烏丸 / 地下鉄 四条; check current signs for Exit 20.', '抵达备忘：阪急「烏丸」／地铁「四条」；按现场指示确认 20 号出口。', true, { routeKind: 'access-note', nextTargetId: 'mufg' }),
    choice('street-only', 'Keep walking outside', '继续在地面散步', 'No station-access note added to your route.', '不往路线里添加车站交通备忘。', 'Stay above ground; Mitsui remains a memory, not a planned station stop.', '继续走地面；三井大厦留在回忆里，不加入车站计划。', false, { routeKind: 'memory', nextTargetId: 'mufg' }),
  ],
  sources: [SOURCES.mitsui, SOURCES.access],
};

const mufg = {
  id: 'mufg', x: 24.7, y: -18.5, approachY: -18.5, kind: 'place', modelled: true,
  title: l('MUFG · Kyoto Branch', '三菱 UFJ · 京都支店'), originalJapaneseName: '三菱ＵＦＪ銀行 京都支店',
  nameValueKind: 'observed', translatedNameValueKind: 'authored', interactionMode: 'frontage',
  provenance: { position: 'authored', note: frontage },
  interaction: {
    eyebrow: l('03 · MAKE A TRAVEL CHOICE', '03 · 做一个旅行选择'),
    title: l('Getting yen: card or cash?', '取日元：用卡还是换现金？'),
    body: l('The Kyoto branch has ATMs for supported overseas cards. World Currency Shop also lists a staffed exchange counter on this building’s first floor, with different hours. Choose which service belongs in your real trip—or leave both out.', '京都支店设有支持部分境外银行卡的 ATM。同楼一层还设有 World Currency Shop 人工换汇柜台，但营业时间不同。选一个适合真实旅行的服务，也可以都不加入。'),
    facts: [
      fact('ATM location hours', 'ATM 场所时间', '06:00–24:00 daily; unavailable from the second Saturday at 21:00 until Sunday 07:00.', '每日 06:00–24:00；每月第二个周六 21:00 至次日 07:00 停用。', ['mufg-kyoto']),
      fact('Overseas card', '境外银行卡', 'Supported cards can withdraw yen. UnionPay/JCB/DISCOVER service stops at 23:50. Check card eligibility and fees with MUFG and your issuer.', '支持的卡可提取日元。银联／JCB／DISCOVER 服务于 23:50 停止。请向 MUFG 与发卡行确认卡片可用性及费用。', ['mufg-kyoto', 'mufg-overseas-cards']),
      fact('Cash exchange', '现金换汇', 'World Currency Shop: first floor, weekdays 10:00–17:00. Arrive at least 30 minutes before closing; closed weekends and public holidays.', 'World Currency Shop：一层，工作日 10:00–17:00。请至少提前 30 分钟到达；周末及公众假日休息。', ['wcs-kyoto']),
      fact('Trip check', '行前确认', 'These are published schedules, not a live open-now status. Exchange rates and your total charges are not supplied here.', '这些是公示时间，并非实时营业状态。本页不提供汇率或你的最终费用。', []),
    ],
  },
  choices: [
    choice('plan-atm', 'Plan an ATM stop', '安排 ATM 取款', 'For a supported overseas card; check your card and fees.', '适用于受支持的境外卡；先确认卡片与费用。', 'Cash plan: use MUFG’s overseas-card ATM; check card eligibility, fees and maintenance before departure.', '现金计划：使用 MUFG 境外卡 ATM；出发前确认卡片可用性、费用与维护时间。', true, { routeKind: 'atm' }),
    choice('plan-exchange', 'Plan cash exchange', '安排现金换汇', 'Weekday counter; arrive before the stated cutoff.', '人工柜台仅工作日营业，并需提前到达。', 'Cash plan: World Currency Shop Kyoto, weekdays 10:00–17:00; arrive at least 30 minutes before closing and check accepted currency and rates.', '现金计划：World Currency Shop 京都店，工作日 10:00–17:00；至少提前 30 分钟到达，并确认币种与汇率。', true, { routeKind: 'exchange' }),
    choice('no-cash-stop', 'I have enough yen', '日元已经够用', 'Leave cash services out of your planned route.', '不把现金服务加入计划路线。', 'No cash-service stop planned; keep this place only in the walk’s memories.', '不安排现金服务停留，仅将此处保留在散步回忆里。', false, { routeKind: 'memory' }),
  ],
  sources: [SOURCES.bank, SOURCES.cards, SOURCES.exchange],
};

// These three interactions preserve the existing user decision. They never count
// toward a completed encounter, never imply an identified tenant, and cannot add
// an alleged real entrance to the exported route.
const placeholder = (id, x, y) => ({
  id, x, y, approachY: y + 1, kind: 'placeholder', modelled: false,
  title: l('Unfinished doorway', '尚未完成的门口'), originalJapaneseName: '京都ダイヤビル',
  nameValueKind: 'authored', interactionMode: 'placeholder',
  provenance: { position: 'authored', note: l('Existing authored doorway; no source binds it to a tenant or actual entrance.', '沿用已有设计门位；没有来源将它对应到具体租户或实际入口。') },
  interaction: { eyebrow: l('WORK IN PROGRESS', '仍在开发'), title: l('Content in development', '内容开发中'), body: l('This doorway remains interactive, but its interior and tenant have not been established. Return to the street to continue your walk.', '这个门口保留互动，但尚未确认其租户与室内。回到街上继续散步。'), facts: [] },
  choices: [choice('return-to-street', 'Back to the street', '回到街上', 'Continue exploring.', '继续探索。', 'Doorway content unfinished; no real venue added.', '门口内容未完成；未加入真实地点。', false, { routeKind: 'none' })],
  sources: [SOURCES.daiya],
});

export const TARGETS = [crossing, mitsui, mufg, placeholder('D-S1', 19.3125, -19.9375), placeholder('D-S3', 26.625, -19.875), placeholder('D-S5', 33.875, -19.75)];
export const PRIMARY_TARGET_IDS = ['crossing', 'mitsui', 'mufg'];
export const DOORS = [
  ['D-N1', 18.1875, 4.6875], ['D-N2', 21.5625, 4.6875], ['D-N3', 24.9375, 4.6875],
  ['D-N4', 28.25, 4.6875], ['D-N5', 31.625, 4.6875], ['D-N6', 35, 4.6875], ['D-N7', 38.3125, 4.6875],
  ['D-S1', 19.3125, -19.9375], ['D-S3', 26.625, -19.875], ['D-S5', 33.875, -19.75],
].map(([id, x, y]) => ({ id, x, y, side: id.startsWith('D-N') ? 'north' : 'south', valueKind: 'authored', tenant: null }));
export const CONTENT_PROVENANCE = {
  version: 'kyoto-first-walk-1', checkedAt: checked,
  attribution: '© OpenStreetMap contributors · ODbL 1.0',
  geometryEvidence: './content-evidence/geometry.json',
  sourceEvidence: './content-evidence/operator-facts.json',
  translatedNames: 'Authored English and Chinese translations; Japanese names retained alongside.',
  interactionPositions: 'Authored reading points on public frontage; no claim of measured entrance locations or reconstructed interiors.',
  originalWriting: 'Original bilingual game copy. Operator facts are paraphrased; no operator photographs, logos or marketing passages are bundled.',
};
