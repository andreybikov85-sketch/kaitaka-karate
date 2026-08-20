// Экраны: заставка уровня, вручение пояса, поражение, пауза, титул, финал.

import { W, H, BELTS, LEVELS } from "../config.js";
import { ctx, txt, mono, panel, LOGO, logo } from "./canvas.js";
import { fighter } from "./fighter.js";
import { G } from "../state.js";

export function drawIntro(){
  panel(0.86);
  const L = LEVELS[G.lvl];
  ctx.font = 'bold 46px "Yu Mincho","MS Mincho",serif'; ctx.textAlign="center";
  ctx.fillStyle = "rgba(193,39,45,.85)"; ctx.fillText(L.jp, 240, 108);
  mono("УРОВЕНЬ "+(G.lvl+1), 240, 138, 9, "#8b95ad", "center");
  txt(L.name, 240, 160, 18, "#f2ede2", "center");
  ctx.fillStyle="#c1272d"; ctx.fillRect(180,170,120,1);
  mono(L.tip, 240, 190, 8, "#c8d0e2", "center");
  const B = BELTS[G.beltIdx];
  ctx.fillStyle=B.c; ctx.fillRect(200,204,80,7); if(B.s){ ctx.fillStyle=B.s; ctx.fillRect(200,207,80,2); }
  mono("твой пояс: "+B.n.toLowerCase(), 240, 224, 7, "#8b95ad", "center");
  if(Math.floor(G.t*2)%2) mono("ENTER — НАЧАТЬ", 240, 246, 8, "#e8b647", "center");
}
export function drawBelt(){
  panel(0.9);
  const B = BELTS[G.beltIdx+1] || BELTS[BELTS.length-1];
  if(logo.ok){ ctx.globalAlpha=.18; ctx.drawImage(LOGO, 170, 60, 140, 131); ctx.globalAlpha=1; }
  mono("УРОВЕНЬ ПРОЙДЕН", 240, 44, 8, "#8b95ad", "center");
  txt("НОВЫЙ ПОЯС", 240, 68, 18, "#f2ede2", "center");

  // церемония: Саша с поклоном
  fighter(150, 200, 0, { facing:1, pose:"block", frame:0, gi:"#f7f4ec", belt:B.c, stripe:B.s, emblem:1, band:1 });
  fighter(330, 200, 0, { facing:-1, pose:"idle", frame:G.t*2, gi:"#2b2f3d", sh:"#1c2029", belt:"#15151c", stripe:"#e8b647", skin:"#d9a97e", hair:"#0e0e12" });

  // сам пояс
  const w = 150 * Math.min(1, G.screenT/0.7);
  ctx.fillStyle = B.c; ctx.fillRect(240-w/2, 116, w, 14);
  if(B.s){ ctx.fillStyle = B.s; ctx.fillRect(240-w/2, 121, w, 4); }
  ctx.strokeStyle="rgba(0,0,0,.6)"; ctx.strokeRect(240-w/2+0.5, 116.5, w-1, 13);
  if(G.screenT > 0.7){
    txt(B.n.toUpperCase(), 240, 148, 11, "#f2ede2", "center");
    mono(B.kyu, 240, 162, 9, "#e8b647", "center");
  }
  if(G.screenT > 1.1){
    ctx.font = 'bold 30px "Yu Mincho",serif'; ctx.textAlign="center";
    ctx.fillStyle="rgba(91,85,196,"+(0.6+0.4*Math.sin(G.t*4))+")"; ctx.fillText("押忍", 240, 240);
    mono("ОСУ!", 240, 254, 8, "#8b95ad", "center");
  }
  if(G.screenT > 1.4 && Math.floor(G.t*2)%2) mono("ENTER — ДАЛЬШЕ", 400, 20, 8, "#e8b647", "center");
}
export function drawGameOver(){
  panel(0.88);
  ctx.font = 'bold 40px "Yu Mincho",serif'; ctx.textAlign="center";
  ctx.fillStyle="rgba(193,39,45,.8)"; ctx.fillText("再挑戦", 240, 100);
  txt("ПОРАЖЕНИЕ — ЧАСТЬ ПУТИ", 240, 138, 14, "#f2ede2", "center");
  mono("Поднимись и попробуй снова. Уровень "+(G.lvl+1), 240, 158, 8, "#8b95ad", "center");
  fighter(240, 210, 0, { facing:1, pose:"down", belt:BELTS[G.beltIdx].c, stripe:BELTS[G.beltIdx].s });
  if(G.screenT>0.8 && Math.floor(G.t*2)%2) mono("ENTER — ЗАНОВО", 240, 240, 9, "#e8b647", "center");
}
export function drawPause(){
  panel(0.7);
  txt("ПАУЗА", 240, 130, 20, "#f2ede2", "center");
  mono("P — продолжить", 240, 152, 8, "#8b95ad", "center");
}
export function drawTitle(){
  const g = ctx.createLinearGradient(0,0,0,H);
  g.addColorStop(0,"#232a4a"); g.addColorStop(1,"#0d1017");
  ctx.fillStyle=g; ctx.fillRect(0,0,W,H);
  ctx.save(); ctx.translate(240,104);
  ctx.globalAlpha=.14; ctx.strokeStyle="#5b55c4"; ctx.lineWidth=10;
  ctx.beginPath(); ctx.arc(0,0,78,0,7); ctx.stroke();
  ctx.globalAlpha=1; ctx.restore();

  if(logo.ok) ctx.drawImage(LOGO, 190, 26, 100, 94);
  else { ctx.font='bold 46px "Yu Mincho",serif'; ctx.textAlign="center"; ctx.fillStyle="#5b55c4"; ctx.fillText("極真", 240, 92); }

  txt("САША — ПУТЬ КИОКУШИН", 240, 142, 17, "#f2ede2", "center");
  ctx.fillStyle="#5b55c4"; ctx.fillRect(150,150,180,1);
  mono("КАЙТАКА · 8 УРОВНЕЙ · ДО ЧЁРНОГО ПОЯСА", 240, 165, 8, "#8b95ad", "center");

  fighter(72, 232, 0, { facing:1, pose:"walk", frame:G.t*5, gi:"#f7f4ec", belt:"#2f6fd0", stripe:"#f2c832", emblem:1, band:1, scale:1.2 });
  fighter(408, 232, 0, { facing:-1, pose:"block", frame:0, gi:"#2b2f3d", sh:"#1c2029", belt:"#15151c", stripe:"#e8b647", skin:"#d9a97e", hair:"#0e0e12", scale:1.2 });

  if(G.unlocked>1){
    mono("◀  УРОВЕНЬ "+(G.selLevel+1)+" — "+LEVELS[G.selLevel].name+"  ▶", 240, 198, 9, "#c8d0e2", "center");
  } else {
    mono("УРОВЕНЬ 1 — ДОДЗЁ", 240, 198, 9, "#c8d0e2", "center");
  }
  if(Math.floor(G.t*2)%2) mono("ENTER ИЛИ КАСАНИЕ ЭКРАНА — НАЧАТЬ", 240, 220, 9, "#e8b647", "center");
  mono("J цуки · K гери · L блок · ПРОБЕЛ киай", 240, 252, 8, "#5e6a7d", "center");
}
export function drawWin(){
  const g = ctx.createLinearGradient(0,0,0,H);
  g.addColorStop(0,"#141824"); g.addColorStop(1,"#000");
  ctx.fillStyle=g; ctx.fillRect(0,0,W,H);
  for(let i=0;i<40;i++){
    const x=(i*127+G.t*20*(i%5+1))%W, y=(i*61)%H;
    ctx.fillStyle="rgba(232,182,71,"+(0.2+0.5*Math.abs(Math.sin(G.t*2+i)))+")"; ctx.fillRect(x,y,2,2);
  }
  ctx.font='bold 44px "Yu Mincho",serif'; ctx.textAlign="center";
  ctx.fillStyle="#e8b647"; ctx.fillText("黒帯", 240, 74);
  if(logo.ok){ ctx.globalAlpha=.2; ctx.drawImage(LOGO, 185, 88, 110, 103); ctx.globalAlpha=1; }
  txt("ЧЁРНЫЙ ПОЯС · 1 ДАН", 240, 108, 17, "#f2ede2", "center");
  ctx.fillStyle="#15151c"; ctx.fillRect(150,120,180,14);
  ctx.fillStyle="#e8b647"; ctx.fillRect(150,125,180,4);
  mono("САША ПРОШЁЛ ВСЕ ВОСЕМЬ УРОВНЕЙ", 240, 152, 8, "#8b95ad", "center");
  fighter(240, 236, 0, { facing:1, pose:"kiai", frame:0, gi:"#f7f4ec", belt:"#15151c", stripe:"#e8b647", emblem:1, band:1, scale:1.4 });
  ctx.font='bold 18px "Yu Mincho",serif'; ctx.fillStyle="#c1272d"; ctx.fillText("押忍", 240, 176);
  if(Math.floor(G.t*2)%2) mono("ENTER — В МЕНЮ", 240, 258, 8, "#e8b647", "center");
}
