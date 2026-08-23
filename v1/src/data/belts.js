// Пояса киокушинкай по порядку — от белого 0 кю до чёрного 3 дана.
//
// Счёт кю идёт вниз (10 → 1), потом вверх по данам. Белый не сдают, с него начинают.
// Дан обозначается золотыми полосками на конце пояса: сколько полосок — такой и дан.
//
// Поля:
//   id       короткое имя, по нему уровни ссылаются на пояс
//   name     как показывать игроку
//   rank     подпись ранга
//   color    основной цвет пояса
//   stripe   цвет поперечной полоски, null если её нет
//   dan      число золотых полосок на конце (0 для кю)
//   title    титул, если он появляется на этом ранге
//   chapter  "full" — глава из трёх этапов (тренировка, кумитэ, аттестация)
//            "short" — один этап-испытание
//            "start" — стартовое состояние, не сдаётся
//   move     техника, которая открывается вместе с поясом

export const BELTS = [
  { id:"white",        name:"Белый",                          rank:"0 кю",  color:"#f2ede2", stripe:null,      dan:0, chapter:"start", move:"tsuki" },
  { id:"orange",       name:"Оранжевый",                      rank:"10 кю", color:"#f07d18", stripe:null,      dan:0, chapter:"full",  move:"gedan_barai" },
  { id:"orange_blue",  name:"Оранжевый с синей полоской",     rank:"9 кю",  color:"#f07d18", stripe:"#1f3fa8", dan:0, chapter:"short", move:"mae_geri" },
  { id:"blue",         name:"Синий",                          rank:"8 кю",  color:"#1f3fa8", stripe:null,      dan:0, chapter:"full",  move:"jodan_uke" },
  { id:"blue_yellow",  name:"Синий с жёлтой полоской",        rank:"7 кю",  color:"#1f3fa8", stripe:"#f2c832", dan:0, chapter:"short", move:"uraken" },
  { id:"yellow",       name:"Жёлтый",                         rank:"6 кю",  color:"#f2c832", stripe:null,      dan:0, chapter:"full",  move:"hiza_geri" },
  { id:"yellow_green", name:"Жёлтый с зелёной полоской",      rank:"5 кю",  color:"#f2c832", stripe:"#1c7a3c", dan:0, chapter:"short", move:"mawashi_geri" },
  { id:"green",        name:"Зелёный",                        rank:"4 кю",  color:"#1c7a3c", stripe:null,      dan:0, chapter:"full",  move:"yoko_geri" },
  { id:"green_brown",  name:"Зелёный с коричневой полоской",  rank:"3 кю",  color:"#1c7a3c", stripe:"#6b3b18", dan:0, chapter:"short", move:"renzoku_waza" },
  { id:"brown",        name:"Коричневый",                     rank:"2 кю",  color:"#6b3b18", stripe:null,      dan:0, chapter:"full",  move:"go_no_sen" },
  { id:"brown_gold",   name:"Коричневый с золотой полоской",  rank:"1 кю",  color:"#6b3b18", stripe:"#e8b647", dan:0, chapter:"short", move:"ushiro_geri" },

  { id:"dan1", name:"Чёрный", rank:"1 дан", color:"#15151c", stripe:null, dan:1, title:"сэмпай", chapter:"full", move:"tameshiwari" },
  { id:"dan2", name:"Чёрный", rank:"2 дан", color:"#15151c", stripe:null, dan:2, title:"сэмпай", chapter:"full", move:null },
  { id:"dan3", name:"Чёрный", rank:"3 дан", color:"#15151c", stripe:null, dan:3, title:"сэнсэй", chapter:"full", move:null }
];

// Золото полосок дана — вынесено отдельно, чтобы совпадало с палитрой клуба.
export const DAN_STRIPE = "#e8b647";
