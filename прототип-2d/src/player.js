// Логика Саши: движение, удары, блок, киай, получение урона.

import { W, TYPES } from "./config.js";
import { keys, took } from "./input.js";
import { S } from "./audio.js";
import { G, P, resetPlayer } from "./state.js";

// Длительность ударов. Урон проходит в средней фазе — в момент выпада.
const PUNCH_DUR = 0.30, PUNCH_FROM = 0.08, PUNCH_TO = 0.19;
const KICK_DUR  = 0.40, KICK_FROM  = 0.14, KICK_TO  = 0.28;

function isBusy(){
  return P.st === "punch" || P.st === "kick" || P.st === "hurt" || P.st === "kiai";
}

export function updatePlayer(dt){
  if(P.dead){ P.st = "down"; return; }
  if(P.inv > 0) P.inv -= dt;
  P.stT += dt;

  const wasBusy = isBusy();

  if(!wasBusy){
    if(took("punch")){
      P.st = "punch"; P.stT = 0; P.hits = new Set(); faceNearest(); S.punch();
    } else if(took("kick")){
      P.st = "kick"; P.stT = 0; P.hits = new Set(); faceNearest(); S.kick();
    } else if(took("kiai") && P.spirit >= 100){
      P.st = "kiai"; P.stT = 0; P.spirit = 0;
      S.kiai(); G.shake = 1; G.flash = 0.7;
      doKiai();
    } else if(keys.block){
      if(P.st !== "block"){ P.st = "block"; P.stT = 0; }
    } else if(P.st === "block"){
      P.st = "idle";
    }
  }

  // Внимание: busy пересчитывается ПОСЛЕ обработки ввода.
  // Если взять старое значение, блок движения ниже сбросит только что начатый
  // удар обратно в стойку в том же кадре — и удар не нанесёт урона вообще.
  const busy = isBusy();
  const blocking = P.st === "block";

  if(!busy && !blocking){
    const dx = (keys.right ? 1 : 0) - (keys.left ? 1 : 0);
    const dy = (keys.down ? 1 : 0) - (keys.up ? 1 : 0);
    const sp = 78;
    if(dx || dy){
      const n = (dx && dy) ? 0.72 : 1;   // по диагонали не быстрее
      P.x += dx * sp * n * dt;
      P.y += dy * sp * 0.62 * n * dt;    // по глубине медленнее — так выглядит объёмнее
      if(dx) P.facing = dx;
      P.st = "walk";
      P.anim += dt * 9;
    } else if(P.st !== "idle"){
      P.st = "idle";
    }
  }

  // Границы арены.
  P.x = Math.max(G.camX + 12, Math.min(G.camX + W - 14, P.x));
  P.y = Math.max(182, Math.min(252, P.y));

  // Возврат в стойку.
  if(P.st === "punch" && P.stT > PUNCH_DUR) P.st = "idle";
  if(P.st === "kick"  && P.stT > KICK_DUR)  P.st = "idle";
  if(P.st === "hurt"  && P.stT > 0.32) P.st = "idle";
  if(P.st === "kiai"  && P.stT > 0.5)  P.st = "idle";

  // Активные кадры удара.
  if(P.st === "punch" && P.stT > PUNCH_FROM && P.stT < PUNCH_TO) attack(14, 30, 22, 10, 5);
  if(P.st === "kick"  && P.stT > KICK_FROM  && P.stT < KICK_TO)  attack(18, 36, 24, 18, 9);
}

// Фаза удара 0..1 — нужна отрисовке, чтобы показать замах, выпад и возврат.
export function attackPhase(){
  if(P.st === "punch") return P.stT / PUNCH_DUR;
  if(P.st === "kick")  return P.stT / KICK_DUR;
  return 0;
}

// Доворот к ближайшему противнику. Без него ребёнок часто бьёт в пустоту.
function faceNearest(){
  let best = null, bd = 70;
  for(const e of G.enemies){
    if(e.dying) continue;
    const d = Math.abs(e.x - P.x) + Math.abs(e.y - P.y) * 1.4;
    if(d < bd){ bd = d; best = e; }
  }
  if(best && Math.abs(best.x - P.x) > 3) P.facing = best.x > P.x ? 1 : -1;
}

function attack(off, len, ry, dmg, kb){
  const hx = P.x + P.facing * (off + len / 2);
  for(const e of G.enemies){
    if(e.dying) continue;
    if(P.hits.has(e)) continue;      // один удар — одно попадание по цели
    if(Math.abs(e.x - hx) < len / 2 + 12 * e.big &&
       Math.abs(e.y - P.y) < ry &&
       Math.abs(e.z - P.z) < 30){
      P.hits.add(e);
      hitEnemy(e, dmg, kb);
    }
  }
}

export function hitEnemy(e, dmg, kb){
  const T = TYPES[e.type];
  let d = dmg;

  if(e.st === "guard"){
    d = Math.max(1, Math.round(dmg * 0.2));   // блок почти всё гасит
    S.block();
  } else {
    S.hit();
    G.shake = Math.max(G.shake, 0.4);
  }

  e.hp -= d;
  e.hurt = 0.18;
  e.x += P.facing * kb * (e.boss ? 0.35 : 1);

  // Дух копится от попаданий. По манекенам — медленнее.
  P.spirit = Math.min(100, P.spirit + (T.stat ? 4 : 8));

  for(let i = 0; i < 4; i++){
    G.fx.push({ x: e.x, y: e.y - 22 * e.big, vx: (Math.random() - 0.5) * 90,
                vy: -30 - Math.random() * 60, t: 0, life: 0.35, c: "#e8b647" });
  }
  G.fx.push({ x: e.x, y: e.y - 24 * e.big, vx: 0, vy: 0, t: 0, life: 0.2, c: "#fff", big: 1 });
  G.fx.push({ x: e.x - P.facing * 6, y: e.y - 26 * e.big, vx: 0, vy: 0, t: 0, life: 0.14, c: "#fff", star: 1 });

  if(e.hp <= 0) killEnemy(e);
}

function killEnemy(e){
  e.dying = 0.001;
  e.st = "down";
  S.down();
  if(!e.boss && Math.random() < 0.3) G.items.push({ x: e.x, y: e.y, t: 0 });
  if(e.boss){ G.flash = 1; G.shake = 1.2; }
}

// Киай — удар духом по всем вокруг. Копится по шкале от попаданий.
function doKiai(){
  for(const e of G.enemies){
    if(e.dying) continue;
    if(Math.abs(e.x - P.x) < 92 && Math.abs(e.y - P.y) < 46){
      const back = e.x > P.x ? 1 : -1;
      e.hp -= 34;
      e.hurt = 0.3;
      e.x += back * 14;
      e.st = "hurt"; e.stT = 0; e.didHit = 0;
      if(e.hp <= 0) killEnemy(e);
    }
  }
  for(let i = 0; i < 20; i++){
    G.fx.push({ x: P.x, y: P.y - 20,
                vx: Math.cos(i / 20 * 6.28) * 150, vy: Math.sin(i / 20 * 6.28) * 70,
                t: 0, life: 0.45, c: "#c1272d" });
  }
}

export function damagePlayer(d){
  if(P.inv > 0 || P.dead) return;

  if(P.st === "block"){
    d = Math.max(1, Math.round(d * 0.25));
    S.block();
    P.spirit = Math.min(100, P.spirit + 4);   // блок тоже копит дух
  } else {
    S.hurt();
    P.st = "hurt"; P.stT = 0;
    G.shake = Math.max(G.shake, 0.6);
  }

  P.hp -= d;
  P.inv = 0.75;

  if(P.hp <= 0){
    P.hp = 0;
    P.dead = true;
    G.lives--;
    if(G.lives <= 0){
      G.state = "gameover";
      G.screenT = 0;
      S.lose();
    } else {
      setTimeout(() => { if(G.state === "play") resetPlayer(false); }, 900);
    }
  }
}
