import geography from './geography.json' with { type: 'json' };

const l = (en, zh) => ({ en, zh });
const osm = (kind, id, label) => ({ label, url: `https://www.openstreetmap.org/${kind}/${id}`, reviewedAt: '2026-10-21' });
const official = (label, url) => ({ label, url, reviewedAt: '2026-10-21' });
const sourceById = {
  'mitsui-frontage': [osm('way', 205732558, 'OpenStreetMap · 京都三井ビルディング'), official('Kamakura Shirts · Kyoto Mitsui access', 'https://www.shirt.co.jp/news/info/2403_kyoto/'), {
    label: 'inunami · Kyoto Mitsui Building night 20210103183745.jpg',
    url: 'https://commons.wikimedia.org/wiki/File:Kyoto_Mitsui_Building_night_20210103183745.jpg',
    reviewedAt: '2026-10-05', capturedAt: '2021-01-03', license: 'CC-BY-2.0',
    licenseUrl: 'https://creativecommons.org/licenses/by/2.0/', purpose: 'Retained reviewed exterior reference; original geometry and materials.'
  }],
  'nishiki-market': [official('Kyoto Nishiki Market · Association', 'https://www.kyoto-nishiki.or.jp/en/union/'), official('Kyoto Nishiki Market · Visitor FAQ', 'https://www.kyoto-nishiki.or.jp/en/contact/'), osm('way', 772134672, 'OpenStreetMap · 錦市場')],
  'nishiki-tenmangu': [official('Nishiki Tenmangū', 'https://nishikitenmangu.or.jp/'), osm('way', 1304786192, 'OpenStreetMap · 錦天満宮'), osm('node', 5204263033, 'OpenStreetMap · 錦天満宮 石鳥居')],
  'takase-river': [osm('way', 482270819, 'OpenStreetMap · 高瀬川'), osm('node', 5492358876, 'OpenStreetMap · Shijo north sidewalk')],
  'pontocho-entrance': [official('Kyoto City · Pontocho-dori Street', 'https://ja.kyoto.travel/komafuda/show.php?id=2203&lang=en'), osm('node', 4641550774, 'OpenStreetMap · 京名所 先斗町')],
  'shijo-bridge': [osm('way', 532008156, 'OpenStreetMap · 四条大橋'), osm('way', 1560746285, 'OpenStreetMap · north pedestrian deck')],
};

const content = [
  {
    id: 'mitsui-frontage', title: l('Kyoto Mitsui frontage', '京都三井大厦街面'),
    originalJapaneseName: '京都三井ビルディング', category: 'architecture', interests: ['architecture', 'street'],
    detail: l('Begin beside Kyoto Mitsui Building on the north side of Shijo. The reviewed photographic references show pale cladding, individual windows and a curved corner feature.', '从四条通北侧的京都三井大厦旁出发。已审核照片呈现浅色外墙、独立窗格与弧形转角。'),
    reason: l('Compare the curved corner and individual windows with the broad shopping street around the building.', '对照弧形转角、独立窗格与大厦周围宽阔商街的尺度。'),
    practical: l('Hankyu Karasuma and subway Shijo are different station names used in the building operator’s access directions. Follow current station signs.', '店家的交通说明分别使用阪急「烏丸」与地铁「四条」站名，请以现场车站指示为准。'),
    featureId: 'shijo-east:mitsui-frontage',
  },
  {
    id: 'nishiki-market', title: l('Nishiki Market arcade', '锦市场拱廊'),
    originalJapaneseName: '錦市場', category: 'food', interests: ['food', 'shopping', 'street'],
    detail: l('The market follows Nishiki-koji between Takakura and Teramachi. Its association describes an approximately 390-metre shopping street, mostly 3.3 metres wide.', '市场沿锦小路延伸于高仓通与寺町通之间。商店街协会介绍其长度约390米，街道多为3.3米宽。'),
    reason: l('Follow the covered market street and notice how its close storefronts change the pace and scale of the walk.', '沿有顶棚的市场街道行走，观察贴近街边的店面如何改变散步的节奏与尺度。'),
    practical: l('Shop hours and closing days vary. The association asks visitors to stop at the shop when eating and warns that the crowded street is not fully accessible to all mobility aids.', '各店营业时间与休息日不同。协会请游客停在购买店铺处饮食，并提醒人潮拥挤的街道未能完全满足所有助行器具的通行需求。'),
    featureId: 'shijo-east:nishiki-market',
  },
  {
    id: 'nishiki-tenmangu', title: l('Nishiki Tenmangu street approach', '锦天满宫街道前方'),
    originalJapaneseName: '錦天満宮', category: 'culture', interests: ['history', 'culture', 'architecture'],
    detail: l('Nishiki Tenmangu faces the market across Shinkyogoku. The shrine identifies Sugawara no Michizane as its principal deity.', '锦天满宫面向市场，坐落于新京极通。神社介绍其主祭神为菅原道真。'),
    reason: l('At the market’s eastern end, look east toward the stone torii and compare the shrine threshold with the shopping arcade.', '在市场东端向东望向石鸟居，对照神社门前与商业拱廊的空间。'),
    practical: l('This stop remains on the public street. The shrine currently publishes gate hours of 08:00–20:00; confirm before a real visit.', '此停留点位于公共街道。神社目前公布的开闭门时间为08:00至20:00，实地到访前请再次确认。'),
    featureId: 'shijo-east:nishiki-tenmangu',
  },
  {
    id: 'takase-river', title: l('Takase River at Shijo', '四条通的高濑川'),
    originalJapaneseName: '高瀬川', category: 'water', interests: ['water', 'outdoors', 'street'],
    detail: l('The mapped Takase River reaches Shijo beside Kiyamachi. This approach stays on Shijo’s north sidewalk, near the river’s covered passage under the street.', '地图中的高濑川在木屋町旁经过四条通。此观察点保留在四条通北侧人行道，靠近河流穿过道路下方的位置。'),
    reason: l('Look north along the narrow watercourse and compare its enclosed view with the broader Kamo River nearby.', '向北观察狭窄的河道，对照其围合视野与附近宽阔的鸭川。'),
    practical: l('Remain on the mapped street approach. This scene does not provide a route down to the water.', '请沿所展示的街道行走，本场景没有通往水边低处的路线。'),
    featureId: 'shijo-east:takase-river',
  },
  {
    id: 'pontocho-entrance', title: l('Pontocho southern entrance', '先斗町南侧入口'),
    originalJapaneseName: '先斗町', category: 'culture', interests: ['culture', 'architecture', 'street'],
    detail: l('Pontocho runs north from Shijo. Kyoto City describes a streetscape of two-storey buildings, continuous eaves and lattice details along the approximately 500-metre lane.', '先斗町从四条通向北延伸。京都市介绍这条约500米长的街巷具有两层建筑、连续屋檐与格栅细部。'),
    reason: l('Pause at the mouth of the narrow lane and compare its enclosed street view with the open bridge ahead.', '在狭窄街巷入口稍作停留，对照巷道围合的视野与前方开阔的桥面。'),
    practical: l('The route visits the southern street entrance. Restaurant access and bookings are separate from this exterior walk.', '路线停留在南侧街巷入口，餐厅入内与预约需另行确认。'),
    featureId: 'shijo-east:pontocho-entrance',
  },
  {
    id: 'shijo-bridge', title: l('Shijo Bridge over the Kamo', '鸭川上的四条大桥'),
    originalJapaneseName: '四条大橋', category: 'water', interests: ['water', 'outdoors', 'architecture'],
    detail: l('Shijo Bridge crosses the Kamo River. The viewing point is placed inside the mapped pedestrian area on the bridge’s north side.', '四条大桥横跨鸭川。观察点设置在地图记录的桥梁北侧步行区域内。'),
    reason: l('The open river corridor offers a broad view toward the banks, contrasting with the enclosed streets nearby.', '开阔的河道展现两岸景观，与附近围合的街巷形成对照。'),
    practical: l('The simulation uses a level walking surface. Actual bridge slopes, temporary access and riverside stairs have not been measured here.', '模拟采用水平步行面；实际桥面坡度、临时通行情况与河岸台阶尚未在此测量。'),
    featureId: 'shijo-east:shijo-bridge',
  },
];

export const SIGHTS = content.map(sight => {
  const anchor = geography.sights.find(item => item.id === sight.id);
  if (!anchor) throw new Error(`Missing reviewed sight approach: ${sight.id}`);
  const sources = sourceById[sight.id];
  return { ...anchor, ...sight, sources, source: sources[0].label, url: sources[0].url,
    position: { x: anchor.x, y: anchor.y, height: anchor.height },
    practicalFacts: [{ text: sight.practical, sources }], reviewStatus: 'source-reviewed-exterior-approach' };
});
