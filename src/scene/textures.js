// Текстуры рисуются кодом на canvas — файлов картинок в проекте нет.
//
// Так сделано не из экономии: текстура, собранная кодом, берёт цвета
// из палитры клуба, поэтому весь зал перекрашивается правкой одного файла.
// Растровые текстуры пришлось бы перерисовывать руками в редакторе.

import * as THREE from "three";
import { CSS } from "./palette.js";

function canvas(size, draw){
  const c = document.createElement("canvas");
  c.width = c.height = size;
  draw(c.getContext("2d"), size);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

// Пол зала целиком: пазловые маты метр на метр и красная окантовка
// соревновательной площадки посередине.
//
// Рисуется одной картинкой на весь зал, а не повторяющимся мотивом.
// Так и должно быть: площадку нельзя выложить повтором — её положение
// зависит от размеров зала, а не от размера мата.
//
// L и D — размеры зала в метрах, comp — площадка: сторона и ширина
// красной каймы. В соревнованиях по карате татами 8 на 8 метров
// с окантовкой в один мат.
export function floorTexture(L, D, comp){
  const PX = 64;                                   // пикселей на метр
  const c = document.createElement("canvas");
  c.width = L * PX; c.height = D * PX;
  const g = c.getContext("2d");

  const half = (comp?.size || 0) / 2;
  const inner = half - (comp?.border || 1);

  // Заливка мат за матом.
  for(let i = 0; i < L; i++){
    for(let j = 0; j < D; j++){
      const cx = -L / 2 + i + 0.5, cz = -D / 2 + j + 0.5;
      const inSquare = half > 0 && Math.abs(cx) < half && Math.abs(cz) < half;
      const isBorder = inSquare && (Math.abs(cx) > inner || Math.abs(cz) > inner);
      g.fillStyle = isBorder ? CSS.matRed : CSS.mat;
      g.fillRect(i * PX, j * PX, PX, PX);
    }
  }

  // Мелкое тиснение: у матов рифлёная поверхность, без неё пол
  // выглядит как залитый краской лист.
  g.globalAlpha = 0.045;
  for(let y = 0; y < c.height; y += 6)
    for(let x = 0; x < c.width; x += 6){
      g.fillStyle = (x + y) % 12 ? "#ffffff" : "#000000";
      g.fillRect(x, y, 3, 3);
    }
  g.globalAlpha = 1;

  // Шов с замками между соседними матами. Зубья и делают пол пазловым:
  // без них это просто клетка, нарисованная на линолеуме.
  const teeth = 3;
  function seam(x0, y0, vertical, dark){
    g.save();
    g.translate(x0, y0);
    if(vertical) g.rotate(Math.PI / 2);
    const step = PX / (teeth * 2 + 1), r = step * 0.44;
    g.beginPath();
    g.moveTo(0, 0);
    let x = 0;
    for(let i = 0; i < teeth; i++){
      x += step;
      g.lineTo(x, 0);
      g.arc(x + r, 0, r, Math.PI, 0, i % 2 === 0);
      x += r * 2;
    }
    g.lineTo(PX, 0);
    g.strokeStyle = dark; g.lineWidth = PX * 0.05; g.stroke();
    g.strokeStyle = CSS.matEdge; g.lineWidth = PX * 0.018; g.stroke();
    g.restore();
  }

  // Цвет шва берём у мата, на границе которого он лежит.
  const matAt = (i, j) => {
    const cx = -L / 2 + i + 0.5, cz = -D / 2 + j + 0.5;
    const inSquare = half > 0 && Math.abs(cx) < half && Math.abs(cz) < half;
    return (inSquare && (Math.abs(cx) > inner || Math.abs(cz) > inner))
      ? CSS.matRedDark : CSS.matDark;
  };
  for(let i = 0; i < L; i++)
    for(let j = 1; j < D; j++) seam(i * PX, j * PX, false, matAt(i, j));
  for(let j = 0; j < D; j++)
    for(let i = 1; i < L; i++) seam(i * PX, j * PX, true, matAt(i, j));

  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;   // одна картинка на весь пол
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

// Доски: колонны, плинтус, двери.
export function woodTexture(){
  return canvas(256, (g, S) => {
    g.fillStyle = CSS.wood;
    g.fillRect(0, 0, S, S);
    for(let i = 0; i < 6; i++){
      const y = i * S / 6;
      g.globalAlpha = 0.12 + (i % 2) * 0.08;
      g.fillStyle = i % 2 ? "#000000" : "#c79a5e";
      g.fillRect(0, y, S, S / 6);
      g.globalAlpha = 0.55;
      g.fillStyle = "rgba(0,0,0,.45)";
      g.fillRect(0, y, S, 2);
    }
    g.globalAlpha = 0.07;
    g.fillStyle = "#000000";
    for(let i = 0; i < 110; i++)
      g.fillRect(Math.random() * S, Math.random() * S, 18 + Math.random() * 70, 1);
    g.globalAlpha = 1;
  });
}

// Стена зала: светлая штукатурка с волнистой затиркой, как в КАЙТАКА.
export function wallTexture(){
  return canvas(256, (g, S) => {
    g.fillStyle = CSS.wall;
    g.fillRect(0, 0, S, S);

    // Разводы от кельмы — на фото стены не гладкие, а с мягкой волной.
    g.globalAlpha = 0.06;
    g.strokeStyle = "#000000";
    g.lineWidth = 7;
    for(let i = 0; i < 14; i++){
      const y = Math.random() * S;
      g.beginPath();
      g.moveTo(0, y);
      for(let x = 0; x <= S; x += 32)
        g.lineTo(x, y + Math.sin((x / S) * 6 + i) * 9);
      g.stroke();
    }
    g.globalAlpha = 0.04;
    for(let i = 0; i < 700; i++){
      g.fillStyle = Math.random() > 0.5 ? "#000000" : "#ffffff";
      g.fillRect(Math.random() * S, Math.random() * S, 2, 2);
    }
    g.globalAlpha = 1;
  });
}

// Соломенная подушка макивары: плотное плетение рисовой соломы.
export function strawTexture(){
  return canvas(256, (g, S) => {
    g.fillStyle = "#c9a45c";
    g.fillRect(0, 0, S, S);
    for(let x = 0; x < S; x += 3){
      g.globalAlpha = 0.22;
      g.fillStyle = Math.random() > 0.25 ? "#e6c98a" : "#8f6f34";
      g.fillRect(x, 0, 2, S);
    }
    g.globalAlpha = 0.30;
    g.fillStyle = "#6f5526";
    for(let y = 0; y < S; y += 42) g.fillRect(0, y, S, 5);

    // Потёртости от ударов: макивару бьют в одно место.
    g.globalAlpha = 0.14;
    g.fillStyle = "#4a3517";
    for(let i = 0; i < 60; i++){
      const r = 4 + Math.random() * 14;
      g.beginPath();
      g.arc(S * 0.5 + (Math.random() - 0.5) * S * 0.5,
            S * 0.5 + (Math.random() - 0.5) * S * 0.6, r, 0, 7);
      g.fill();
    }
    g.globalAlpha = 1;
  });
}

// Роспись на дальней стене: солнце, горы, бамбук, пагода, силуэт бойца.
// В зале она занимает всю стену и делает его узнаваемым сильнее,
// чем что-либо ещё, кроме эмблемы.
export function muralTexture(w = 1024, h = 512){
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  const g = c.getContext("2d");

  g.fillStyle = CSS.muralSky;
  g.fillRect(0, 0, w, h);

  // Солнце
  g.fillStyle = CSS.muralSun;
  g.beginPath(); g.arc(w * 0.20, h * 0.30, h * 0.145, 0, 7); g.fill();

  // Дальние горы
  g.fillStyle = CSS.muralHill;
  g.beginPath();
  g.moveTo(0, h * 0.72);
  g.lineTo(w * 0.16, h * 0.44); g.lineTo(w * 0.30, h * 0.66);
  g.lineTo(w * 0.44, h * 0.38); g.lineTo(w * 0.60, h * 0.70);
  g.lineTo(w * 0.76, h * 0.50); g.lineTo(w, h * 0.72);
  g.lineTo(w, h); g.lineTo(0, h); g.fill();

  // Ближние горы тушью
  g.fillStyle = CSS.muralInk;
  g.beginPath();
  g.moveTo(0, h * 0.86);
  g.lineTo(w * 0.22, h * 0.62); g.lineTo(w * 0.40, h * 0.84);
  g.lineTo(w * 0.58, h * 0.60); g.lineTo(w * 0.82, h * 0.82);
  g.lineTo(w, h * 0.70); g.lineTo(w, h); g.lineTo(0, h); g.fill();

  // Сосна слева
  g.strokeStyle = CSS.muralInk; g.lineCap = "round";
  g.lineWidth = h * 0.018;
  g.beginPath(); g.moveTo(w * 0.05, h * 0.80); g.lineTo(w * 0.07, h * 0.34); g.stroke();
  g.lineWidth = h * 0.011;
  for(const [dx, dy, len] of [[-1, -0.02, 0.11], [1, 0.03, 0.13], [-1, 0.10, 0.08]]){
    g.beginPath();
    g.moveTo(w * 0.07, h * (0.40 + dy));
    g.lineTo(w * (0.07 + dx * len), h * (0.36 + dy));
    g.stroke();
  }

  // Бамбук справа
  g.lineWidth = h * 0.016;
  for(const bx of [0.86, 0.90]){
    g.beginPath(); g.moveTo(w * bx, h * 0.88); g.lineTo(w * bx, h * 0.22); g.stroke();
    g.lineWidth = h * 0.008;
    for(let k = 0; k < 5; k++){
      const y = h * (0.30 + k * 0.13);
      g.beginPath(); g.moveTo(w * bx, y); g.lineTo(w * (bx + 0.045), y - h * 0.05); g.stroke();
    }
    g.lineWidth = h * 0.016;
  }

  // Пагода
  g.fillStyle = CSS.muralInk;
  for(let k = 0; k < 3; k++){
    const yy = h * (0.60 - k * 0.075), ww = w * (0.075 - k * 0.017);
    g.beginPath();
    g.moveTo(w * 0.66 - ww, yy); g.lineTo(w * 0.66, yy - h * 0.045);
    g.lineTo(w * 0.66 + ww, yy); g.fill();
    g.fillRect(w * 0.66 - ww * 0.35, yy, ww * 0.7, h * 0.05);
  }

  // Силуэт бойца в маваси-гери — сердце всей росписи.
  g.save();
  g.translate(w * 0.44, h * 0.80);
  const s = h * 0.0016;
  g.fillStyle = CSS.muralInk;
  g.beginPath();
  g.ellipse(0, -150 * s * 1.6, 26 * s * 1.6, 30 * s * 1.6, 0, 0, 7); g.fill();   // голова
  g.lineWidth = 26 * s * 1.6; g.strokeStyle = CSS.muralInk;
  g.beginPath(); g.moveTo(0, -120 * s * 1.6); g.lineTo(6 * s * 1.6, -30 * s * 1.6); g.stroke();
  g.lineWidth = 22 * s * 1.6;
  g.beginPath(); g.moveTo(4 * s * 1.6, -34 * s * 1.6); g.lineTo(-14 * s * 1.6, 60 * s * 1.6); g.stroke();
  g.beginPath();                                                                  // бьющая нога
  g.moveTo(4 * s * 1.6, -40 * s * 1.6);
  g.lineTo(64 * s * 1.6, -66 * s * 1.6);
  g.lineTo(128 * s * 1.6, -104 * s * 1.6); g.stroke();
  g.lineWidth = 16 * s * 1.6;                                                     // руки
  g.beginPath(); g.moveTo(0, -108 * s * 1.6); g.lineTo(-44 * s * 1.6, -74 * s * 1.6); g.stroke();
  g.beginPath(); g.moveTo(0, -104 * s * 1.6); g.lineTo(40 * s * 1.6, -128 * s * 1.6); g.stroke();
  g.restore();

  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}
