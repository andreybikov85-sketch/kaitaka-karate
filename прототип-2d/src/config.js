// Константы игры: размеры холста, пояса, уровни, типы противников.
// Правки баланса делай здесь — код логики трогать не нужно.

export const W = 480;
export const H = 270;

// Пояса киокушинкай по порядку. c — цвет пояса, s — цвет полоски.
export const BELTS = [
  { n:"Синий с жёлтой полоской", kyu:"7 кю", c:"#2f6fd0", s:"#f2c832" },
  { n:"Жёлтый",                  kyu:"6 кю", c:"#f2c832", s:null      },
  { n:"Жёлтый с зелёной полоской",kyu:"5 кю", c:"#f2c832", s:"#2b8a4a" },
  { n:"Зелёный",                 kyu:"4 кю", c:"#2b8a4a", s:null      },
  { n:"Зелёный с коричневой полоской",kyu:"3 кю", c:"#2b8a4a", s:"#7a4b20" },
  { n:"Коричневый",              kyu:"2 кю", c:"#7a4b20", s:null      },
  { n:"Коричневый с чёрной полоской",kyu:"1 кю", c:"#7a4b20", s:"#15151c" },
  { n:"Чёрный",                  kyu:"1 дан", c:"#15151c", s:"#e8b647" },
  { n:"Чёрный",                  kyu:"1 дан", c:"#15151c", s:"#e8b647" }
];

// Уровни. waves — волны противников до босса, каждая запись [тип, количество].
export const LEVELS = [
  { name:"ДОДЗЁ",           jp:"道場",  theme:"dojo",
    waves:[[["makiwara",2]],[["makiwara",2],["kohai",1]],[["kohai",2]]],
    boss:{ type:"bag", name:"ТЯЖЁЛЫЙ МЕШОК", hp:90 },
    tip:"J — цуки. K — гери. L — блок. Разбей макивары." },
  { name:"ШКОЛЬНЫЙ ДВОР",   jp:"校庭",  theme:"yard",
    waves:[[["kohai",2]],[["kohai",3]],[["kohai",2],["hayai",1]]],
    boss:{ type:"kohai", name:"СЭМПАЙ КУМА", hp:130, big:1 },
    tip:"Держись сбоку — бей и отходи." },
  { name:"ПАРК",            jp:"公園",  theme:"park",
    waves:[[["kohai",2],["thrower",1]],[["thrower",2]],[["kohai",2],["thrower",1]]],
    boss:{ type:"thrower", name:"МЯЧ-МАСТЕР ТАКА", hp:150, big:1 },
    tip:"Мяч летит по прямой — сойди вверх или вниз." },
  { name:"СТАРЫЙ СПОРТЗАЛ", jp:"体育館", theme:"gym",
    waves:[[["kohai",3]],[["kabe",1],["kohai",2]],[["kabe",2],["hayai",1]]],
    boss:{ type:"kabe", name:"СТЕНА ОКАМИ", hp:180, big:1 },
    tip:"Кто держит блок — ждёт. Бей сразу после его атаки." },
  { name:"КРЫШИ ГОРОДА",    jp:"屋根",  theme:"roofs",
    waves:[[["hayai",3]],[["hayai",2],["thrower",1]],[["hayai",3],["kohai",1]]],
    boss:{ type:"hayai", name:"ТЕНЬ КАГЭ", hp:190, big:1 },
    tip:"Быстрые бьют первыми — блокируй и отвечай." },
  { name:"МОСТ",            jp:"橋",    theme:"bridge",
    waves:[[["kohai",2],["hayai",2]],[["thrower",2],["kabe",1]],[["hayai",2],["kabe",2]]],
    boss:{ type:"kohai", name:"ОНИ С МОСТА", hp:200, big:1 },
    tip:"Копи дух и бей КИАЙ, когда окружают." },
  { name:"ГОРНЫЙ ХРАМ",     jp:"山寺",  theme:"temple",
    waves:[[["kabe",2],["thrower",1]],[["hayai",3],["kabe",1]],[["kabe",2],["kohai",2],["thrower",1]]],
    boss:{ type:"kabe", name:"ТЭНГУ ХРАМА", hp:215, big:1 },
    tip:"Не спеши. Один удар — шаг назад." },
  { name:"ФИНАЛЬНЫЙ ТАТАМИ",jp:"畳",    theme:"tatami",
    waves:[[["kohai",2],["hayai",2]],[["kabe",2],["thrower",2]]],
    boss:{ type:"sensei", name:"СЭНСЭЙ КУРО", hp:250, big:1 },
    tip:"Три фазы. Он ускоряется — держи дистанцию." }
];

// Характеристики противников.
// hp — здоровье, sp — скорость, dmg — урон, reach — дальность атаки,
// cd — пауза между атаками (сек), guard — умеет блокировать, ranged — бьёт издалека,
// stat — неподвижная цель (макивара, мешок).
export const TYPES = {
  makiwara:{ hp:26, sp:0,   dmg:0,  reach:0,  cd:99, gi:"#8a6b45", belt:"#5c452c", label:"макивара", stat:1 },
  kohai:   { hp:40, sp:26,  dmg:8,  reach:26, cd:1.5, gi:"#dfe4ee", belt:"#f2c832", label:"кохай" },
  thrower: { hp:34, sp:22,  dmg:9,  reach:150,cd:2.0, gi:"#d8dbc8", belt:"#2f6fd0", label:"метатель", ranged:1 },
  hayai:   { hp:30, sp:52,  dmg:7,  reach:24, cd:0.95,gi:"#cfd6e6", belt:"#2b8a4a", label:"быстрый" },
  kabe:    { hp:70, sp:20,  dmg:11, reach:27, cd:1.9, gi:"#c9c2b4", belt:"#7a4b20", label:"блокирующий", guard:1 },
  bag:     { hp:90, sp:0,   dmg:0,  reach:0,  cd:99, gi:"#7a4b20", belt:"#4a2c14", label:"мешок", stat:1 },
  sensei:  { hp:340,sp:34,  dmg:11, reach:30, cd:1.25,gi:"#2b2f3d", belt:"#15151c", label:"сэнсэй", guard:1 }
};
