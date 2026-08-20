// Общее состояние игры. Все модули читают и меняют объект G.
//
// G.state — какой экран сейчас активен:
//   title | intro | play | pause | belt | gameover | win

import { W, LEVELS, TYPES } from "./config.js";
import { S } from "./audio.js";

export const G = {
  state: "title",
  unlocked: 1,      // сколько уровней открыто
  selLevel: 0,      // выбранный в меню уровень
  lvl: 0,
  beltIdx: 0,
  lives: 3,
  seg: 0,           // номер текущей волны
  bossFight: false,
  cleared: false,   // волна зачищена, идёт переход к следующей
  camX: 0,
  t: 0,             // общее время, для анимаций
  shake: 0,
  flash: 0,
  msg: null,
  msgT: 0,
  screenT: 0,       // время на текущем экране
  enemies: [],
  shots: [],
  items: [],
  fx: []
};

export const P = {
  x: 60, y: 220, z: 0, vz: 0,
  facing: 1,
  hp: 100, maxhp: 100,
  spirit: 0,
  st: "idle", stT: 0,
  inv: 0,            // неуязвимость после получения урона
  anim: 0,
  hits: null,        // кого уже задел текущий удар
  dead: false
};

const SAVE_KEY = "sasha-kyokushin-progress";

export function loadProgress(){
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if(raw){
      const d = JSON.parse(raw);
      if(d && d.unlocked >= 1 && d.unlocked <= LEVELS.length) G.unlocked = d.unlocked;
    }
  } catch(e){ /* приватный режим — играем без сохранения */ }
}

export function saveProgress(){
  try { localStorage.setItem(SAVE_KEY, JSON.stringify({ unlocked: G.unlocked })); }
  catch(e){ /* не критично */ }
}

// Рост сложности по уровням. Урон растёт медленнее здоровья — так честнее для ребёнка.
export function mul(){
  return { hp: 1 + G.lvl * 0.10, sp: 1 + G.lvl * 0.05, dmg: 1 + G.lvl * 0.06 };
}

export function resetPlayer(full){
  P.x = G.camX + 60;
  P.y = 225; P.z = 0; P.vz = 0;
  P.facing = 1;
  P.st = "idle"; P.stT = 0;
  P.inv = 1.2;
  P.dead = false;
  P.anim = 0;
  P.hp = P.maxhp;
  if(full) P.spirit = 0;
}

export function startLevel(i){
  G.lvl = i;
  G.beltIdx = i;
  G.lives = 3;
  G.seg = 0;
  G.bossFight = false;
  G.cleared = false;
  G.camX = 0;
  G.enemies = []; G.shots = []; G.items = []; G.fx = [];
  resetPlayer(true);
  G.state = "intro";
  G.screenT = 0;
}

export function makeEnemy(type, x, y, o){
  const T = TYPES[type];
  return {
    type, x, y, z: 0, vz: 0, facing: -1,
    hp: o.hp, maxhp: o.hp,
    dmg: o.dmg !== undefined ? o.dmg : T.dmg,
    sp: o.sp !== undefined ? o.sp : T.sp,
    big: o.big || 1,
    boss: o.boss || 0,
    name: o.name || "",
    st: "walk", stT: 0,
    cd: 0.6 + Math.random() * 0.8,
    guardT: 0, hurt: 0, dying: 0,
    anim: Math.random() * 6,
    didHit: 0,
    phase: 1,
    entered: false
  };
}

export function spawnWave(){
  const L = LEVELS[G.lvl], m = mul();
  G.enemies = [];

  if(G.seg >= L.waves.length){
    // Босс уровня.
    G.bossFight = true;
    const b = L.boss, T = TYPES[b.type];
    G.enemies.push(makeEnemy(b.type, G.camX + W - 70, 220, {
      hp: Math.round(b.hp * (1 + G.lvl * 0.05)),
      big: 1.35, boss: 1, name: b.name,
      dmg: Math.round(T.dmg * m.dmg),
      sp: T.sp * m.sp * 1.05
    }));
    G.msg = b.name; G.msgT = 2.2;
    S.down();
  } else {
    let n = 0;
    L.waves[G.seg].forEach(([type, count]) => {
      for(let i = 0; i < count; i++){
        const T = TYPES[type];
        // Неподвижные цели ставим внутри арены, живые входят сбоку.
        const sx = T.stat ? (G.camX + 170 + n * 66) : (G.camX + W + 24 + n * 34);
        G.enemies.push(makeEnemy(type, sx, 186 + ((n * 37) % 62), {
          hp: Math.round(T.hp * m.hp),
          dmg: Math.round(T.dmg * m.dmg),
          sp: T.sp * m.sp
        }));
        n++;
      }
    });
  }
  G.cleared = false;
}

// Переход к следующей волне.
//
// Раньше волна появлялась только когда игрок сам отходил вправо. После киай,
// который выносит всю группу разом, Саша часто оставался у левого края — камера
// доезжала, новых врагов не было, и игра выглядела зависшей. Теперь появление
// волны зависит только от камеры, а игрока она подтягивает за собой.
export function advanceWave(dt){
  if(!G.cleared || G.bossFight) return;

  const target = (G.seg + 1) * W;

  if(G.camX < target - 0.5){
    G.camX = Math.min(target, G.camX + Math.max(60, (target - G.camX) * 3) * dt);
    if(P.x < G.camX + 40) P.x = G.camX + 40;
    return;
  }

  G.camX = target;
  G.seg++;
  spawnWave();
}
