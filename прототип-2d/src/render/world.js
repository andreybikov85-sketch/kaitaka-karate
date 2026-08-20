// Отрисовка игрового мира: враги, игрок, предметы, снаряды, эффекты.
// Объекты сортируются по глубине Y, чтобы дальние были позади ближних.

import { W, BELTS, TYPES } from "../config.js";
import { ctx, drawShadow } from "./canvas.js";
import { fighter } from "./fighter.js";
import { G, P } from "../state.js";
import { attackPhase } from "../player.js";

export function drawWorld(){
  ctx.save(); ctx.translate(-G.camX, 0);
  const list = [];
  for(const it of G.items) list.push({ y:it.y, f:()=>drawItem(it) });
  for(const e of G.enemies) list.push({ y:e.y, f:()=>drawEnemy(e) });
  if(!P.dead || G.lives>0) list.push({ y:P.y, f:()=>drawPlayer() });
  list.sort((a,b)=>a.y-b.y);
  for(const o of list) o.f();
  for(const s of G.shots){
    ctx.fillStyle="rgba(0,0,0,.25)"; ctx.beginPath(); ctx.ellipse(s.x, s.y, 5,2,0,0,7); ctx.fill();
    ctx.fillStyle="#e8b647"; ctx.beginPath(); ctx.arc(s.x, s.y-s.z, 5,0,7); ctx.fill();
    ctx.fillStyle="#c1272d"; ctx.fillRect(s.x-4, s.y-s.z-1, 8, 2);
  }
  for(const f of G.fx){
    ctx.globalAlpha = Math.max(0, 1-f.t/f.life);
    ctx.fillStyle = f.c;
    if(f.star){
      const r = 5 + f.t*46;
      ctx.strokeStyle = f.c; ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(f.x-r,f.y); ctx.lineTo(f.x+r,f.y);
      ctx.moveTo(f.x,f.y-r*0.7); ctx.lineTo(f.x,f.y+r*0.7);
      ctx.moveTo(f.x-r*0.6,f.y-r*0.5); ctx.lineTo(f.x+r*0.6,f.y+r*0.5);
      ctx.moveTo(f.x-r*0.6,f.y+r*0.5); ctx.lineTo(f.x+r*0.6,f.y-r*0.5);
      ctx.stroke();
    }
    else if(f.big){ const r = 4+f.t*40; ctx.beginPath(); ctx.arc(f.x,f.y,r,0,7); ctx.lineWidth=2; ctx.strokeStyle=f.c; ctx.stroke(); }
    else ctx.fillRect(f.x, f.y, 2, 2);
    ctx.globalAlpha = 1;
  }
  // стрелка «вперёд»
  if(G.cleared && !G.bossFight){
    const a = 0.55+0.45*Math.sin(G.t*7);
    ctx.globalAlpha = a; ctx.fillStyle="#e8b647";
    const ax = G.camX+W-34, ay = 150;
    ctx.beginPath(); ctx.moveTo(ax,ay-9); ctx.lineTo(ax+16,ay); ctx.lineTo(ax,ay+9); ctx.fill();
    ctx.fillRect(ax-14,ay-3,14,6);
    ctx.globalAlpha = 1;
  }
  ctx.restore();
}
function drawItem(it){
  const b = Math.sin(it.t*5)*2;
  ctx.fillStyle="rgba(0,0,0,.3)"; ctx.beginPath(); ctx.ellipse(it.x,it.y,7,2.5,0,0,7); ctx.fill();
  ctx.fillStyle="#f6f2e8";
  ctx.beginPath(); ctx.moveTo(it.x, it.y-16+b); ctx.lineTo(it.x+7, it.y-4+b); ctx.lineTo(it.x-7, it.y-4+b); ctx.fill();
  ctx.fillStyle="#1c2330"; ctx.fillRect(it.x-4, it.y-8+b, 8, 4);
}

/* фигуры */

function drawPlayer(){
  if(P.dead && G.lives<=0) { fighter(P.x, P.y, 0, { facing:P.facing, pose:"down", belt:BELTS[G.beltIdx].c }); return; }
  if(P.dead){ fighter(P.x, P.y, 0, { facing:P.facing, pose:"down", belt:BELTS[G.beltIdx].c }); return; }
  if(P.inv > 0 && Math.floor(G.t*20)%2===0) return;
  const B = BELTS[G.beltIdx];
  let pose = P.st==="walk" ? "walk" : P.st;
  let ph = 0;
  ph = attackPhase();
  fighter(P.x, P.y, P.z, {
    facing:P.facing, pose, ph, frame: pose==="walk"?P.anim:G.t*2,
    gi:"#f7f4ec", sh:"#d8d2c4", belt:B.c, stripe:B.s, emblem:1, band:1, scale:1
  });
  if(P.st==="kiai" && P.stT<0.4){
    ctx.globalAlpha = 1-P.stT/0.4; ctx.strokeStyle="#c1272d"; ctx.lineWidth=2;
    ctx.beginPath(); ctx.ellipse(P.x, P.y-20, 30+P.stT*120, 14+P.stT*54, 0,0,7); ctx.stroke();
    ctx.globalAlpha=1;
  }
}
function drawEnemy(e){
  const T = TYPES[e.type];
  if(T.stat){
    // манекен / мешок
    const h = e.type==="bag" ? 46 : 40, w = e.type==="bag" ? 16 : 11;
    drawShadow(e.x, e.y, w*0.7);
    const tilt = e.hurt>0 ? Math.sin(G.t*40)*2 : 0;
    ctx.save(); ctx.translate(e.x+tilt, e.y);
    if(e.dying){ ctx.rotate(Math.min(1.4, e.dying*2)); }
    if(e.type!=="bag"){ ctx.fillStyle="#4a3a26"; ctx.fillRect(-w/2-3, -6, w+6, 6); } // основание стойки
    ctx.fillStyle = T.gi; ctx.fillRect(-w/2, -h, w, h);
    ctx.fillStyle = "rgba(0,0,0,.2)"; ctx.fillRect(-w/2, -h, 3, h);
    ctx.fillStyle = T.belt;
    for(let y=-h+6; y<-6; y+=9) ctx.fillRect(-w/2, y, w, 3);   // соломенная обмотка
    // мишень
    ctx.fillStyle = "#c1272d"; ctx.beginPath(); ctx.arc(0, -h+13, 6, 0, 7); ctx.fill();
    ctx.fillStyle = "#f7f4ec"; ctx.beginPath(); ctx.arc(0, -h+13, 3, 0, 7); ctx.fill();
    ctx.fillStyle = "#c1272d"; ctx.beginPath(); ctx.arc(0, -h+13, 1.4, 0, 7); ctx.fill();
    ctx.restore();
    if(!e.dying){
      const hp = Math.max(0, e.hp/e.maxhp);
      ctx.fillStyle="rgba(0,0,0,.5)"; ctx.fillRect(e.x-10, e.y-h-10, 20, 3);
      ctx.fillStyle= hp>0.5?"#8ee06a":(hp>0.25?"#e8b647":"#c1272d");
      ctx.fillRect(e.x-10, e.y-h-10, 20*hp, 3);
    }
  } else {
    let pose = "idle", ph = 0;
    if(e.dying) pose = "down";
    else if(e.st==="attack"){
      pose = (e.type==="kabe" || e.type==="sensei") ? "kick" : "punch";
      ph = e.stT/0.55;
    }
    else if(e.st==="guard") pose = "block";
    else if(e.st==="hurt" || e.hurt>0) pose = "hurt";
    else if(e.st==="walk") pose = "walk";
    let gi = T.gi;
    if(e.type==="sensei" && e.phase>1) gi = e.phase===2 ? "#3b2530" : "#4a1d20";
    if(e.hurt>0 && Math.floor(G.t*30)%2===0) gi = "#ffffff";
    fighter(e.x, e.y, e.z, {
      facing:e.facing, pose, ph, frame:e.anim, gi, sh:"#9aa0ad",
      belt:T.belt, stripe: e.type==="sensei"?"#e8b647":null, scale:e.big, skin:"#d9a97e",
      hair: e.boss?"#0e0e12":"#2b2018", band: e.boss?1:0
    });
    // мини-полоска здоровья у обычных
    if(!e.boss && !e.dying){
      const w = 18*e.big, hp = Math.max(0,e.hp/e.maxhp);
      ctx.fillStyle="rgba(0,0,0,.5)"; ctx.fillRect(e.x-w/2, e.y-52*e.big, w, 3);
      ctx.fillStyle= hp>0.5?"#8ee06a":(hp>0.25?"#e8b647":"#c1272d");
      ctx.fillRect(e.x-w/2, e.y-52*e.big, w*hp, 3);
    }
  }
}

/* HUD */
