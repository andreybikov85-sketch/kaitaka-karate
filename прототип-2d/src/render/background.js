// Фоны уровней. Дальний план движется медленнее переднего — параллакс.

import { W, H } from "../config.js";
import { ctx, LOGO, logo } from "./canvas.js";
import { G } from "../state.js";

export function drawBG(theme){
  const th = {
    dojo:   { sky:["#2a2118","#42342a"], mid:"#1d1710", floor:["#4a7a52","#3f6a46"], line:"#2e5236" },
    yard:   { sky:["#5aa0d8","#a8d3ef"], mid:"#3c6f4a", floor:["#9a9284","#8a8375"], line:"#6e6a60" },
    park:   { sky:["#7cc0e8","#cfe9f5"], mid:"#2f6b3c", floor:["#6f9a4e","#628c45"], line:"#4e7038" },
    gym:    { sky:["#3a3f52","#4c5468"], mid:"#2b3040", floor:["#8a6d4a","#7c6141"], line:"#5f4a31" },
    roofs:  { sky:["#20304f","#5b4a7a"], mid:"#141c30", floor:["#4a5060","#414653"], line:"#2e323c" },
    bridge: { sky:["#1b2a44","#2f4a6d"], mid:"#132033", floor:["#5a5f6b","#50545f"], line:"#383c45" },
    temple: { sky:["#3b2c46","#6b4a5a"], mid:"#221a29", floor:["#6a5a48","#5d4f3f"], line:"#42382c" },
    tatami: { sky:["#14161f","#23283a"], mid:"#0e1017", floor:["#3f7060","#376353"], line:"#2a4c40" }
  }[theme];

  const g = ctx.createLinearGradient(0,0,0,175);
  g.addColorStop(0, th.sky[0]); g.addColorStop(1, th.sky[1]);
  ctx.fillStyle = g; ctx.fillRect(0,0,W,175);

  const px = -(G.camX*0.35)%W;
  ctx.fillStyle = th.mid;
  for(let k=-1;k<=1;k++) drawMid(theme, px + k*W, th);

  // пол
  const fg = ctx.createLinearGradient(0,175,0,H);
  fg.addColorStop(0, th.floor[0]); fg.addColorStop(1, th.floor[1]);
  ctx.fillStyle = fg; ctx.fillRect(0,175,W,H-175);
  ctx.fillStyle = "rgba(0,0,0,.25)"; ctx.fillRect(0,175,W,2);
  ctx.strokeStyle = th.line; ctx.lineWidth = 1;
  const off = -(G.camX*0.9)%40;
  for(let x=off; x<W+40; x+=40){ ctx.beginPath(); ctx.moveTo(x,176); ctx.lineTo(x-14,H); ctx.stroke(); }
  for(let y=190;y<H;y+=22){ ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(W,y); ctx.stroke(); }
}
function drawMid(theme, ox, th){
  ctx.save(); ctx.translate(ox,0);
  const c = ctx;
  if(theme==="dojo"){
    c.fillStyle="#241c14"; c.fillRect(0,54,W,122);
    c.fillStyle="#3a2c1e"; c.fillRect(0,54,W,10);
    for(let x=8;x<W;x+=112) c.fillRect(x,54,12,122);
    c.fillStyle="#2e2519";
    for(let x=26;x<W;x+=112) c.fillRect(x,70,84,86);
    c.strokeStyle="#4a3a26"; c.lineWidth=1;
    for(let x=26;x<W;x+=112){
      for(let gy=70;gy<156;gy+=22){ c.beginPath(); c.moveTo(x,gy); c.lineTo(x+84,gy); c.stroke(); }
      for(let gx=x;gx<=x+84;gx+=28){ c.beginPath(); c.moveTo(gx,70); c.lineTo(gx,156); c.stroke(); }
    }
    // стена клуба с эмблемой КАЙТАКА
    c.fillStyle="#f2ede2"; c.fillRect(174,64,132,92);
    c.fillStyle="#3f3a8c"; c.fillRect(174,64,132,5); c.fillRect(174,151,132,5);
    if(logo.ok) c.drawImage(LOGO, 186, 70, 108, 101);
    c.font='bold 7px Consolas,monospace'; c.textAlign="center";
    c.fillStyle="#4a4470"; c.fillText("КАРАТЭ МУРОМ", 240, 166);
    [150, 330].forEach(bx => {
      c.fillStyle="#2b2670"; c.fillRect(bx,66,16,74);
      c.fillStyle="#3f3a8c"; c.fillRect(bx+2,68,12,70);
      c.fillStyle="#f2ede2"; c.fillRect(bx+6,74,4,4); c.fillRect(bx+6,84,4,14); c.fillRect(bx+6,102,4,10);
      c.fillStyle="#3a2c1e"; c.fillRect(bx-3,62,22,5);
    });
    c.fillStyle="#3a2c1e"; c.fillRect(392,120,58,6); c.fillRect(392,146,58,6);
    c.fillStyle="#6b5334"; for(let i=0;i<3;i++) c.fillRect(398+i*18,112,5,42);
  } else if(theme==="yard"){
    c.fillStyle="#d9c9a3"; c.fillRect(30,74,150,102); c.fillStyle="#b9a583"; c.fillRect(30,74,150,8);
    c.fillStyle="#6ea3c9"; for(let x=42;x<170;x+=26) for(let y=90;y<160;y+=26) c.fillRect(x,y,16,16);
    c.fillStyle="#3c6f4a"; for(let x=230;x<W;x+=70){ c.fillRect(x,120,8,56); c.beginPath(); c.arc(x+4,112,26,0,7); c.fill(); }
  } else if(theme==="park"){
    c.fillStyle="#2f6b3c";
    for(let x=10;x<W;x+=58){ c.fillRect(x,124,7,52); c.beginPath(); c.arc(x+3,112,24,0,7); c.fill(); }
    c.fillStyle="#e0b8c8"; c.beginPath(); c.arc(200,104,22,0,7); c.fill(); c.fillStyle="#5b4630"; c.fillRect(197,120,6,56);
  } else if(theme==="gym"){
    c.fillStyle="#2b3040"; c.fillRect(0,50,W,126);
    c.fillStyle="#454c60"; for(let x=16;x<W;x+=64) c.fillRect(x,60,34,40);
    c.fillStyle="#8a8f9e"; c.fillRect(120,50,6,52); c.fillStyle="#c1272d"; c.fillRect(104,100,38,10);
    c.fillStyle="#5a6070"; c.fillRect(320,50,4,60); c.beginPath(); c.arc(322,116,10,0,7); c.fill();
  } else if(theme==="roofs"){
    c.fillStyle="#141c30";
    const hs=[70,110,88,130,96,120,80];
    for(let i=0;i<hs.length;i++){ const x=i*72, h=hs[i]; c.fillRect(x,176-h,64,h); }
    c.fillStyle="#e8b647"; for(let i=0;i<hs.length;i++){ for(let y=176-hs[i]+8;y<170;y+=14) for(let x=i*72+6;x<i*72+58;x+=14) if((x+y)%3===0) c.fillRect(x,y,4,5); }
    c.fillStyle="#fff"; for(let i=0;i<26;i++) c.fillRect((i*97)%W, (i*53)%60, 1,1);
  } else if(theme==="bridge"){
    c.fillStyle="#132033"; c.fillRect(0,150,W,26);
    c.strokeStyle="#4a5a74"; c.lineWidth=3;
    for(let x=-40;x<W+80;x+=160){ c.beginPath(); c.moveTo(x,150); c.quadraticCurveTo(x+80,52,x+160,150); c.stroke(); }
    c.fillStyle="#4a5a74"; for(let x=0;x<W;x+=20) c.fillRect(x,120,3,32);
    c.fillStyle="#e8b647"; c.globalAlpha=.5; c.beginPath(); c.arc(390,60,18,0,7); c.fill(); c.globalAlpha=1;
  } else if(theme==="temple"){
    c.fillStyle="#221a29"; c.beginPath(); c.moveTo(0,176); c.lineTo(90,86); c.lineTo(180,176); c.fill();
    c.beginPath(); c.moveTo(230,176); c.lineTo(330,70); c.lineTo(430,176); c.fill();
    c.fillStyle="#c1272d"; c.fillRect(180,110,90,10); c.fillRect(190,110,10,66); c.fillRect(250,110,10,66);
    c.fillStyle="#8b1f24"; c.beginPath(); c.moveTo(172,112); c.lineTo(225,92); c.lineTo(278,112); c.fill();
  } else {
    c.fillStyle="#0e1017"; c.fillRect(0,40,W,136);
    c.fillStyle="#c1272d"; c.globalAlpha=.85; c.beginPath(); c.arc(240,100,44,0,7); c.fill(); c.globalAlpha=1;
    c.fillStyle="#0e1017"; c.beginPath(); c.arc(240,100,34,0,7); c.fill();
    c.fillStyle="#f2ede2"; c.font='bold 26px "Yu Mincho",serif'; c.textAlign="center"; c.fillText("極真",240,110);
    c.fillStyle="#2a2f42"; for(let x=0;x<W;x+=96) c.fillRect(x,60,10,116);
  }
  c.restore();
}

/* мир */
