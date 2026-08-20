// Отрисовка бойца — и Саши, и противников.
//
// Удар рисуется в три фазы через параметр o.ph (0..1):
//   до 0.28  — замах: подсед, кулак уходит к поясу, плечи разворачиваются назад
//   до 0.66  — выпад: корпус подаётся вперёд, конечность выстреливает на всю длину
//   далее    — возврат в стойку
// Урон в player.js проходит ровно в фазе выпада, чтобы картинка совпадала с попаданием.
//
// Поля o: facing, pose, ph, frame, scale, gi (цвет ги), sh (тень ги),
//         skin, hair, belt, stripe, emblem, band

import { ctx, drawShadow } from "./canvas.js";

export function fighter(x, y, z, o){
  const s = o.scale||1, f = o.facing||1;
  drawShadow(x, y, 9*s);
  const b = y - z;
  const gi = o.gi||"#f2ede2", sh = o.sh||"#c9c2b4", skin = o.skin||"#e8b98f", hair = o.hair||"#241a12";
  const pose = o.pose||"idle", fr = o.frame||0;
  const ph = o.ph!==undefined ? Math.max(0, Math.min(1, o.ph)) : 0;

  // фазы удара: 0 — замах, 1 — выпад, 2 — возврат
  let ap = -1, ext = 0, lunge = 0;
  if(pose==="punch" || pose==="kick"){
    if(ph < 0.28){ const k = ph/0.28; ap = 0; ext = -0.22*k; lunge = -2*k; }
    else if(ph < 0.66){ const k = (ph-0.28)/0.38; ap = 1; ext = -0.22 + 1.22*Math.min(1, k*1.8); lunge = 4*Math.min(1, k*2); }
    else { const k = (ph-0.66)/0.34; ap = 2; ext = 1 - k; lunge = 4*(1-k); }
  }

  ctx.save(); ctx.translate(x, b); ctx.scale(s*f, s);

  if(pose === "down"){
    ctx.fillStyle = gi; ctx.fillRect(-16, -10, 30, 9);
    ctx.fillStyle = o.belt||"#000"; ctx.fillRect(-4, -10, 4, 9);
    ctx.fillStyle = skin; ctx.fillRect(14, -12, 9, 9);
    ctx.fillStyle = hair; ctx.fillRect(14, -14, 10, 4);
    ctx.restore(); return;
  }

  const lean = (pose==="hurt") ? -3 : 0;
  const bob = (pose==="idle") ? Math.sin(fr*0.6)*0.8 : 0;
  const crouch = (ap===0) ? 1.5 : 0;           // подсед на замахе
  const up = -crouch;                           // подъём тела

  /* ---- НОГИ ---- */
  ctx.fillStyle = gi;
  if(pose === "kick"){
    ctx.fillRect(-8, -13, 6, 13);               // опорная
    const L = 5 + 21*Math.max(0, ext);
    if(ap === 0){                               // колено поднято
      ctx.fillRect(0, -21, 9, 6);
      ctx.fillRect(6, -21, 5, 11);
      ctx.fillStyle = sh; ctx.fillRect(5, -11, 7, 3);
    } else {
      ctx.fillRect(0, -21, L, 6);               // нога вперёд
      ctx.fillStyle = sh; ctx.fillRect(L-3, -22, 7, 7);
    }
  } else if(pose === "walk"){
    const sw = Math.sin(fr)*4;
    ctx.fillRect(-8+sw, -13, 6, 13);
    ctx.fillRect(2-sw, -13, 6, 13);
  } else if(ap === 0){                          // подсед на замахе руки
    ctx.fillRect(-9, -12, 6, 12);
    ctx.fillRect(3, -12, 6, 12);
  } else if(pose === "punch"){
    ctx.fillRect(-10, -13, 6, 13);
    ctx.fillRect(3, -13, 6, 13);
  } else {
    ctx.fillRect(-8, -13, 6, 13);
    ctx.fillRect(2, -13, 6, 13);
  }
  ctx.fillStyle = sh;
  if(pose !== "kick"){ ctx.fillRect(-9, -2, 8, 2); ctx.fillRect(1, -2, 8, 2); }
  else ctx.fillRect(-9, -2, 8, 2);

  /* ---- КОРПУС (со сдвигом вперёд на выпаде) ---- */
  ctx.save(); ctx.translate(lunge, up);
  const twist = (ap===0) ? -2 : (ap===1 ? 2 : 0);   // разворот плеч

  ctx.fillStyle = o.belt||"#2f6fd0"; ctx.fillRect(-9, -17+bob, 18, 4);
  if(o.stripe){ ctx.fillStyle = o.stripe; ctx.fillRect(-9, -15.5+bob, 18, 1.4); }
  ctx.fillStyle = o.belt||"#2f6fd0";
  const bx = (ap===1) ? -5 : -3;
  ctx.fillRect(bx, -14+bob, 3, 6+ (ap===1?2:0)); ctx.fillRect(bx+4, -14+bob, 3, 5);

  ctx.fillStyle = gi; ctx.fillRect(-9+lean*0.4+twist*0.5, -30+bob, 18, 14);
  ctx.fillStyle = sh;
  ctx.beginPath();
  ctx.moveTo(-2+lean*0.4+twist*0.5, -30+bob); ctx.lineTo(6+lean*0.4+twist*0.5, -30+bob);
  ctx.lineTo(-2+lean*0.4+twist*0.5, -18+bob); ctx.fill();
  if(o.emblem){ ctx.fillStyle = "#c1272d"; ctx.fillRect(-7+twist*0.5, -28+bob, 4, 4); }

  const hy = -42+bob+lean;
  ctx.fillStyle = skin; ctx.fillRect(-5+twist*0.4, hy, 11, 11);
  ctx.fillStyle = hair; ctx.fillRect(-6+twist*0.4, hy-2, 13, 5); ctx.fillRect(-6+twist*0.4, hy, 3, 4);
  ctx.fillStyle = "#1a1a1a"; ctx.fillRect(2+twist*0.4, hy+4, 2, 2);
  if(o.band){ ctx.fillStyle = "#c1272d"; ctx.fillRect(-6+twist*0.4, hy+2, 13, 2.5); }

  /* ---- РУКИ ---- */
  ctx.fillStyle = gi;
  if(pose === "punch"){
    if(ap === 0){                                  // кулак у пояса, замах
      ctx.fillRect(-13, -27+bob, 10, 5);
      ctx.fillStyle = skin; ctx.fillRect(-16, -28+bob, 6, 6);
      ctx.fillStyle = gi; ctx.fillRect(2, -28+bob, 7, 5);
      ctx.fillStyle = skin; ctx.fillRect(7, -29+bob, 5, 5);
    } else {
      const L = 6 + 16*Math.max(0, ext);
      ctx.fillRect(4, -28+bob, L, 5);
      ctx.fillStyle = skin; ctx.fillRect(4+L, -29.5+bob, 7, 7);
      ctx.fillStyle = gi; ctx.fillRect(-11, -27+bob, 8, 5);  // отведённая назад
      if(ap === 1){                                 // след удара
        ctx.fillStyle = "rgba(255,255,255,.55)";
        ctx.fillRect(2, -30+bob, L, 1); ctx.fillRect(2, -24+bob, L-4, 1);
      }
    }
  } else if(pose === "kick"){
    ctx.fillRect(2, -30+bob, 7, 5); ctx.fillRect(-10, -26+bob, 7, 5);
    ctx.fillStyle = skin; ctx.fillRect(7, -31+bob, 5, 5); ctx.fillRect(-13, -27+bob, 5, 5);
    if(ap === 1){
      ctx.strokeStyle = "rgba(255,255,255,.5)"; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(0, -18-bob*0+bob, 22, -0.9, 0.25); ctx.stroke();
    }
  } else if(pose === "block"){
    ctx.fillRect(0, -36+bob, 6, 16);
    ctx.fillStyle = skin; ctx.fillRect(1, -38+bob, 5, 5);
    ctx.fillStyle = gi; ctx.fillRect(-6, -32+bob, 6, 12);
  } else if(pose === "kiai"){
    ctx.fillRect(-12, -32+bob, 8, 5); ctx.fillRect(6, -32+bob, 8, 5);
    ctx.fillStyle = skin; ctx.fillRect(-15, -33+bob, 5, 5); ctx.fillRect(13, -33+bob, 5, 5);
  } else if(pose === "hurt"){
    ctx.fillRect(-14, -30+bob, 7, 5); ctx.fillRect(7, -30+bob, 7, 5);
  } else {
    const sw = pose==="walk" ? Math.sin(fr)*2 : 0;
    ctx.fillRect(2, -28+bob+sw, 7, 5);
    ctx.fillRect(-8, -27+bob-sw, 7, 5);
    ctx.fillStyle = skin; ctx.fillRect(7, -29+bob+sw, 5, 5); ctx.fillRect(-10, -28+bob-sw, 5, 5);
  }
  ctx.restore();
  ctx.restore();
}
