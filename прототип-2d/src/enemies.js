// Поведение противников, летящих снарядов и подбираемых предметов.

import { W, TYPES } from "./config.js";
import { S } from "./audio.js";
import { G, P } from "./state.js";
import { damagePlayer } from "./player.js";

export function updateEnemies(dt){
  for(let i=G.enemies.length-1;i>=0;i--){
    const e = G.enemies[i];
    if(e.dying){ e.dying += dt; if(e.dying > 0.9) G.enemies.splice(i,1); continue; }
    const T = TYPES[e.type];
    e.stT += dt; if(e.hurt>0) e.hurt -= dt; e.anim += dt*6;
    e.facing = P.x < e.x ? -1 : 1;

    // фазы босса
    if(e.type==="sensei"){
      const r = e.hp/e.maxhp;
      e.phase = r>0.66?1:(r>0.33?2:3);
    }
    const speedBoost = e.type==="sensei" ? (1 + (e.phase-1)*0.28) : 1;

    if(T.stat){ // манекен
      if(e.st!=="down") e.st = "idle";
      continue;
    }
    if(e.st==="hurt"){ if(e.stT>0.3) e.st="walk"; continue; }
    if(e.st==="attack"){
      if(!T.ranged){
        if(e.stT>0.18 && e.stT<0.3 && !e.didHit){
          e.didHit = 1;
          if(Math.abs(P.x-e.x) < T.reach+10*e.big && Math.abs(P.y-e.y) < 18 && !P.dead) damagePlayer(e.dmg);
        }
      } else {
        if(e.stT>0.25 && !e.didHit){
          e.didHit = 1;
          G.shots.push({ x:e.x + e.facing*10, y:e.y, z:14, vx:e.facing*115, dmg:e.dmg, t:0 });
          S.throwBall();
        }
      }
      if(e.stT>0.55){ e.st="walk"; e.cd = T.cd*(0.75+Math.random()*0.5)/speedBoost; e.didHit=0; }
      continue;
    }
    if(e.st==="guard"){
      e.guardT -= dt;
      if(e.guardT<=0){ e.st="walk"; e.cd = 0.35; }
      continue;
    }

    // движение
    const dx = P.x - e.x, dy = P.y - e.y;
    const dist = Math.abs(dx);
    let tx = 0, ty = 0;
    if(T.ranged){
      const want = 96;
      if(dist > want+16) tx = Math.sign(dx);
      else if(dist < want-16) tx = -Math.sign(dx);
      if(Math.abs(dy) > 5) ty = Math.sign(dy);
    } else {
      if(dist > T.reach - 4) tx = Math.sign(dx);
      if(Math.abs(dy) > 4) ty = Math.sign(dy);
    }
    const sp = e.sp * speedBoost;
    e.x += tx*sp*dt; e.y += ty*sp*0.55*dt;
    e.y = Math.max(182, Math.min(252, e.y));
    e.st = (tx||ty) ? "walk" : "idle";

    // вход на арену
    if(!e.entered && e.x < G.camX + W - 16) e.entered = true;
    if(e.entered) e.x = Math.max(G.camX+10, Math.min(G.camX+W-10, e.x));

    // атака
    e.cd -= dt;
    if(e.cd <= 0 && !P.dead){
      const inRange = T.ranged ? (dist < T.reach && Math.abs(dy) < 12)
                               : (dist < T.reach + 8*e.big && Math.abs(dy) < 16);
      if(inRange){
        if(T.guard && Math.random() < (e.type==="sensei"?0.2:0.4)){
          e.st="guard"; e.guardT = 0.7 + Math.random()*0.5; e.stT=0;
        } else { e.st="attack"; e.stT=0; e.didHit=0; }
      } else if(T.guard && dist < 70 && Math.random()<0.012){
        e.st="guard"; e.guardT=0.6; e.stT=0;
      }
    }
  }
}
export function updateShots(dt){
  for(let i=G.shots.length-1;i>=0;i--){
    const s = G.shots[i]; s.x += s.vx*dt; s.t += dt;
    if(!P.dead && Math.abs(s.x-P.x)<11 && Math.abs(s.y-P.y)<12 && Math.abs(P.z-6)<24){
      damagePlayer(s.dmg); G.shots.splice(i,1); continue;
    }
    if(s.x < G.camX-20 || s.x > G.camX+W+20 || s.t>4) G.shots.splice(i,1);
  }
}
export function updateItems(dt){
  for(let i=G.items.length-1;i>=0;i--){
    const it = G.items[i]; it.t += dt;
    if(Math.abs(it.x-P.x)<13 && Math.abs(it.y-P.y)<12){
      P.hp = Math.min(P.maxhp, P.hp+25); S.pick();
      G.fx.push({x:it.x,y:it.y-14,vx:0,vy:-40,t:0,life:0.5,c:"#8ee06a",big:1});
      G.items.splice(i,1); continue;
    }
    if(it.t > 16) G.items.splice(i,1);
  }
}
