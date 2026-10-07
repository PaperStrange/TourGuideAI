// An authored studio perspective, not a real traveller's account or visit record.
// Positions reuse public reading/spawn points from kyoto.js. They are viewing
// points in the simulation, not surveyed entrances. Gaze targets and heights are
// authored composition choices; the images are rendered scene illustrations.
// Architectural facts paraphrase the reviewed sources in facade-references.json.
const l = (en, zh) => ({ en, zh });

export const PERSPECTIVE_CHAPTER = {
  id: 'kyoto-looking-closer',
  version: 1,
  title: l('Across the street, look again', '隔着一条街，再看一眼'),
  intro: l(
    'A short loop around one crossing. Look back at Mitsui, then turn to Daiya and notice how two buildings meet the same street.',
    '围绕一个路口走一小圈。回望三井，再转向钻石大厦，看看两栋楼怎样面对同一条街。',
  ),
  author: l('TourGuideAI studio · sample perspective', 'TourGuideAI 工作室 · 示例视角'),
  sample: true,
};

export const MOMENTS = [
  {
    id: 'arrive',
    title: l('One street, two sides', '一条街，两侧风景'),
    invitation: l(
      'Find the crossing between the two buildings. Keep it in mind as we make a small loop.',
      '找到两栋楼之间的横道。接下来绕一小圈，就用它来认方向。',
    ),
    remark: l(
      'One street, two buildings. The crossing gives this little walk a thread to follow.',
      '一条街，两栋楼。这道横道，给这段小小的散步串起了一条线。',
    ),
    fact: l(
      'The mapped footprints place Kyoto Mitsui north of Shijō Street and Kyoto Daiya south of it.',
      '地图中的建筑轮廓显示：京都三井大厦在四条通北侧，京都钻石大厦在南侧。',
    ),
    position: { x: 20.721, y: 2.33 },
    lookAt: { x: 20.721, y: -8.99, height: 4 },
    camera: { azimuth: 3.361593, polar: 1.05, distance: 32 },
    image: 'perspectives/arrive.jpg',
    imageAlt: l(
      'Illustrated Kyoto street scene looking across the crossing toward the opposite building.',
      '京都街景的场景示意图：沿横道望向街对面的建筑。',
    ),
    sources: [
      { label: 'OpenStreetMap · Kyoto Mitsui Building', url: 'https://www.openstreetmap.org/way/205732558' },
      { label: 'OpenStreetMap · Kyoto Daiya Building', url: 'https://www.openstreetmap.org/way/205732536' },
      { label: 'OpenStreetMap · crossing', url: 'https://www.openstreetmap.org/node/2737069286' },
    ],
  },
  {
    id: 'mitsui-rhythm',
    title: l('The spaces between the windows', '窗与窗之间'),
    invitation: l(
      'Use the crossing to reach the south pavement, then look back at Mitsui. Follow the dark windows toward its curved corner.',
      '沿横道走到南侧人行道，再回望三井大厦。顺着深色窗格，看到弧形的转角。',
    ),
    remark: l(
      'The pale wall feels calm; each dark window makes a pause. Then the curved corner loosens the pattern.',
      '浅色墙面显得安静，每一扇深色窗都像一个停顿。到了弧形转角，整齐的节奏又舒展开来。',
    ),
    fact: l(
      'Reference photographs show Mitsui’s pale stone-like cladding, individual dark rectangular windows and a curved, columned corner.',
      '参考照片中的三井大厦有浅色、石材般的饰面，独立的深色矩形窗，以及弧形列柱转角。',
    ),
    position: { x: 24.7, y: -18.5 },
    lookAt: { x: 20, y: 6.5, height: 11 },
    camera: { azimuth: -0.4, polar: 1.05, distance: 36 },
    image: 'perspectives/mitsui-rhythm.jpg',
    imageAlt: l(
      'Illustrated view across Shijō toward Mitsui’s pale walls, separate dark windows and curved corner.',
      '隔着四条通看三井大厦的场景示意图：浅色墙面、独立深色窗格与弧形转角。',
    ),
    sources: [
      {
        label: 'Kyoto Mitsui exterior · inunami · 2021 · CC BY 2.0',
        url: 'https://commons.wikimedia.org/wiki/File:Kyoto_Mitsui_Building_night_20210103183745.jpg',
      },
    ],
  },
  {
    id: 'daiya-rhythm',
    title: l('A different rhythm', '另一种节奏'),
    invitation: l(
      'Cross back north and look across at Daiya. Follow the pale ribs upward, then bring your eye back to the corner.',
      '沿横道回到北侧，望向街对面的钻石大厦。顺着浅色竖线向上看，再把视线带回转角。',
    ),
    remark: l(
      'Here the long lines draw my eye upward. The contrast with Mitsui is the detail I would carry away from this little loop.',
      '这边的长线条把视线往上带。如果只留下一个印象，我会记住它与三井窗格节奏的不同。',
    ),
    fact: l(
      'Reference photographs show Daiya’s pale vertical ribs and tall glazing. Broad arches appear on its Karasuma-facing side.',
      '参考照片中的钻石大厦有浅色竖向凸肋与高挑玻璃窗；宽拱出现在朝向乌丸通的一面。',
    ),
    position: { x: 23.8, y: 2.1 },
    lookAt: { x: 17, y: -22, height: 10 },
    camera: { azimuth: 3.541593, polar: 1.05, distance: 36 },
    image: 'perspectives/daiya-rhythm.jpg',
    imageAlt: l(
      'Illustrated view across Shijō toward Daiya’s vertical façade pattern and intersection corner.',
      '隔着四条通看钻石大厦的场景示意图：竖向立面纹理与路口转角。',
    ),
    sources: [
      {
        label: 'Kyoto Daiya exterior · inunami · 2021 · CC BY 2.0',
        url: 'https://commons.wikimedia.org/wiki/File:Kyoto_Dia_Building_at_Shijo-Karasuma_intersection_20210103183825.jpg',
      },
    ],
  },
];
