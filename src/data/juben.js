// 剧本研究室公开数据：只放无答案剧透的学习导航与结构归纳。
// 凶手、完整时间线、诡计解答和结局一律留在私有仓库，不进本站源码与搜索索引。
const privateCaseUrl = (path) =>
  `https://github.com/Mr-Salticidae/juben-dm-lab/blob/main/${encodeURI(path)}`;

export const jubenCases = [
  {
    id: 'virtual-game',
    archive: '954',
    title: '虚拟游戏',
    english: 'THE VIRTUAL GAME',
    status: '学习中',
    statusKey: 'learning',
    players: '6 人 + DM',
    duration: '6–8 小时',
    genre: '硬核还原',
    level: '进阶',
    tone: 'violet',
    intro: '从一栋别墅、一场游戏与一连串旧案出发，练习在多重视角中重建同一段时间。',
    note: '故事时间线已梳理；接下来训练流程记忆与分层复盘。',
    tags: ['多层叙事', '规则驱动', '长时还原'],
    modules: [
      { title: '先立流程骨架', desc: '把开场、搜证、讨论、表决与结局收束成几个大块，先记顺序，再记数字。' },
      { title: '再压上帝视角', desc: '按埋因、引爆、余波、正本串起因果，把角色记忆放回同一条时间轴。' },
      { title: '画出双轨线索', desc: '先分清线索属于哪条轨道，再讨论它证明什么，避免编号与场景串线。' },
      { title: '排练分层复盘', desc: '每次只更换一个前提，保留仍能解释全部证据的部分，不急着把答案说满。' },
    ],
    questions: [
      '不看手册，能否用五段话说清从玩家入座到结局的流程？',
      '能否把旧案与当日事件画在同一条因果线上，并说出两次收束？',
      '玩家追问“凭什么”时，能否分别用规则、物证与时间窗回答？',
    ],
    privateUrl: privateCaseUrl('cases/954-虚拟游戏/00_DM主持学习手册.md'),
    timelineUrl: privateCaseUrl('cases/954-虚拟游戏/08_上帝视角时间线_DM复盘底稿.md'),
    compare: {
      structure: '多轮搜证，逐层收束',
      mechanism: '行动点递减，每处限额',
      clues: '双轨独立编号',
      truth: '多层反转型',
      dm: '节奏控制与复盘话术',
      material: '角色本、双轨线索、音频与规则卡',
    },
  },
  {
    id: 'woman-by-window',
    archive: '247',
    title: '窗边的女人',
    english: 'THE WOMAN BY THE WINDOW',
    status: '资料就绪',
    statusKey: 'ready',
    players: '6 人',
    duration: '4–5 小时',
    genre: '硬核推理',
    level: '进阶',
    tone: 'bronze',
    intro: '从网络聊天室进入一桩旧案，把现场、人物与跨媒介证据拼成一张完整的推理网。',
    note: '六册学习资料已完成；适合按流程、故事、线索、音视频的顺序自学。',
    tags: ['跨媒介线索', '分幕还原', '仪式收束'],
    modules: [
      { title: '先过五段流程', desc: '把发本、三轮搜证与最终收束各成一个节点，记清每段可公开的资料。' },
      { title: '再读人物关系', desc: '先区分“谁知道什么”与“谁做了什么”，避免把叙事视角当成客观事实。' },
      { title: '合并纸面与画面', desc: '把文字卡、语音与纯画面信息放进同一张证据表，不让媒介决定线索权重。' },
      { title: '分开两类问题', desc: '复盘时先处理现场行为，再处理后续行为，最后才进入人物动机与情感内核。' },
    ],
    questions: [
      '能否不翻资料，说清五个环节各自要发什么、收什么？',
      '面对一条新线索，能否先判断它属于现场、人物、日记还是跨媒介材料？',
      '能否把最终复盘拆成几个独立问题，而不是一口气公布完整答案？',
    ],
    privateUrl: privateCaseUrl('cases/247-窗边的女人/00_对外学习包/第一册_开本与流程.md'),
    timelineUrl: privateCaseUrl('cases/247-窗边的女人/00_对外学习包/第二册_故事全貌.md'),
    compare: {
      structure: '三轮搜证，仪式收束',
      mechanism: '定量抽证，限制私聊',
      clues: '单轨编号，多类载体',
      truth: '角色拆分型',
      dm: '物料执行与收束顺序',
      material: '角色本、拼版线索、音视频与地图',
    },
  },
];

export const comparisonRows = [
  { group: 'structure', label: '流程结构', key: 'structure' },
  { group: 'structure', label: '资源与限制', key: 'mechanism' },
  { group: 'clues', label: '线索组织', key: 'clues' },
  { group: 'clues', label: '真相结构', key: 'truth', hint: '仅说明叙事类型，不含答案' },
  { group: 'hosting', label: '主持重心', key: 'dm' },
  { group: 'hosting', label: '物料形态', key: 'material' },
];

export const methodSteps = [
  {
    no: '01',
    title: '盘点，而不是立刻通读',
    desc: '先确认角色本、组织者手册、线索、音视频与打印版之间的关系。重复资料只留一份真源，缺页与版本差异先记清。',
    output: '产出：一份物料清单与版本说明',
  },
  {
    no: '02',
    title: '先记流程骨架，再记参数',
    desc: '把整场切成开场、搜证、讨论、表决、结局几个大块。顺序立住以后，再回填时限、搜证额度、发放编号和特殊规则。',
    output: '产出：一张可以脱稿复述的流程卡',
  },
  {
    no: '03',
    title: '用因果串起上帝视角',
    desc: '不要按角色逐本背。把旧案、当日事件和人物选择放到同一条时间线上，标出每次信息差是怎样产生的。',
    output: '产出：一条完整时间线与人物关系图',
  },
  {
    no: '04',
    title: '把线索写成推理句',
    desc: '每条关键线索都问三次：它证明什么、排除什么、必须和哪条线索合用。只有“线索 → 结论”的指向表，才能支撑现场扶车。',
    output: '产出：一张线索指向与卡关提示表',
  },
  {
    no: '05',
    title: '彩排复盘，再开本回填',
    desc: '先脱稿讲一遍，再用玩家可能提出的“凭什么”打断自己。真正带完一场后，把翻车点、实际时长和有效话术写回原档案。',
    output: '产出：复盘底稿与持续生长的现场记录',
  },
];
