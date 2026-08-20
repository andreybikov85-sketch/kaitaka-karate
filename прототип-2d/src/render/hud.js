// Верхняя панель: имя, пояс, здоровье, шкала духа, жизни, полоса босса.

import { W, BELTS, LEVELS } from "../config.js";
import { ctx, txt, mono } from "./canvas.js";
import { G, P } from "../state.js";

export function drawHUD(){
  ctx.fillStyle = "rgba(10,12,20,.72)"; ctx.fillRect(0,0,W,34);
  ctx.fillStyle = "#c1272d"; ctx.fillRect(0,34,W,1);

  // имя и пояс
  mono("САША", 8, 13, 9, "#f2ede2");
  const B = BELTS[G.beltIdx];
  ctx.fillStyle = B.c; ctx.fillRect(8, 17, 46, 6);
  if(B.s){ ctx.fillStyle = B.s; ctx.fillRect(8, 19.5, 46, 2); }
  ctx.strokeStyle = "rgba(0,0,0,.6)"; ctx.lineWidth = 1; ctx.strokeRect(8.5, 17.5, 45, 5);
  mono(B.kyu, 8, 31, 7, "#8b95ad");

  // HP
  const hx = 64;
  mono("ЖИЗНЬ", hx, 11, 7, "#8b95ad");
  ctx.fillStyle = "#2a1416"; ctx.fillRect(hx, 14, 120, 8);
  const hp = Math.max(0,P.hp/P.maxhp);
  ctx.fillStyle = hp>0.5?"#8ee06a":(hp>0.25?"#e8b647":"#c1272d");
  ctx.fillRect(hx, 14, 120*hp, 8);
  ctx.strokeStyle="#000"; ctx.strokeRect(hx+0.5, 14.5, 119, 7);

  // дух
  mono("ДУХ", hx, 31, 7, "#8b95ad");
  ctx.fillStyle = "#141c2c"; ctx.fillRect(hx+22, 25, 98, 5);
  ctx.fillStyle = P.spirit>=100 ? (Math.floor(G.t*8)%2?"#fff":"#5b55c4") : "#2f6fd0";
  ctx.fillRect(hx+22, 25, 98*(P.spirit/100), 5);

  // жизни
  for(let i=0;i<G.lives;i++){
    const x = 196+i*13;
    ctx.fillStyle="#f7f4ec"; ctx.fillRect(x, 14, 9, 9);
    ctx.fillStyle="#c1272d"; ctx.fillRect(x, 20, 9, 2);
  }

  // уровень
  mono("УРОВЕНЬ "+(G.lvl+1)+"/"+LEVELS.length, W-8, 12, 8, "#8b95ad", "right");
  txt(LEVELS[G.lvl].name, W-8, 26, 10, "#f2ede2", "right");

  // босс
  const boss = G.enemies.find(e=>e.boss && !e.dying);
  if(boss){
    ctx.fillStyle="rgba(10,12,20,.7)"; ctx.fillRect(90,40,300,16);
    mono(boss.name, 240, 47, 7, "#e8b647", "center");
    ctx.fillStyle="#2a1416"; ctx.fillRect(100,49,280,4);
    ctx.fillStyle="#c1272d"; ctx.fillRect(100,49,280*Math.max(0,boss.hp/boss.maxhp),4);
  }

  if(G.msgT>0 && G.msg){
    ctx.globalAlpha = Math.min(1, G.msgT*2);
    txt(G.msg, 240, 92, 16, "#e8b647", "center");
    ctx.globalAlpha = 1;
  }
}
