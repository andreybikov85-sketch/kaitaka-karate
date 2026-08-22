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

// Татами: два мата в ряду со смещением, как кладут в настоящем додзё.
// Тёмная кромка по краю мата — это тканевая окантовка хэри.
export function tatamiTexture(){
  return canvas(512, (g, S) => {
    const half = S / 2, edge = S * 0.022;

    g.fillStyle = CSS.tatami;
    g.fillRect(0, 0, S, S);

    // Плетение: частые светлые полосы вдоль мата.
    g.globalAlpha = 0.05;
    g.fillStyle = "#ffffff";
    for(let y = 0; y < S; y += 4) g.fillRect(0, y, S, 1.4);
    g.globalAlpha = 1;

    // Ряды матов смещены на половину — иначе стыки выстраиваются
    // в одну линию и пол выглядит как сетка, а не как настил.
    g.strokeStyle = CSS.night;
    g.lineWidth = edge;
    for(const [y, off] of [[0, 0], [half, half / 2]]){
      g.strokeRect(-half + off, y, half, half);
      g.strokeRect(off, y, half, half);
      g.strokeRect(half + off, y, half, half);
    }
    g.strokeRect(0, 0, S, S);
  });
}

// Доски: пол по краю зала и потолочные балки.
export function woodTexture(){
  return canvas(256, (g, S) => {
    g.fillStyle = CSS.wood;
    g.fillRect(0, 0, S, S);
    for(let i = 0; i < 5; i++){
      const y = i * S / 5;
      g.globalAlpha = 0.10 + (i % 2) * 0.06;
      g.fillStyle = i % 2 ? "#000000" : "#ffffff";
      g.fillRect(0, y, S, S / 5);
      g.globalAlpha = 0.5;
      g.fillStyle = "rgba(0,0,0,.35)";
      g.fillRect(0, y, S, 1.5);
    }
    // Волокно
    g.globalAlpha = 0.06;
    g.fillStyle = "#000000";
    for(let i = 0; i < 90; i++){
      const y = Math.random() * S;
      g.fillRect(Math.random() * S, y, 20 + Math.random() * 60, 1);
    }
    g.globalAlpha = 1;
  });
}

// Соломенная подушка макивары: плотное плетение рисовой соломы.
export function strawTexture(){
  return canvas(256, (g, S) => {
    g.fillStyle = "#c9a45c";
    g.fillRect(0, 0, S, S);

    // Пучки соломы — вертикальные волокна разной светлоты.
    for(let x = 0; x < S; x += 3){
      const v = 0.5 + Math.random() * 0.5;
      g.globalAlpha = 0.22;
      g.fillStyle = v > 0.75 ? "#e6c98a" : "#8f6f34";
      g.fillRect(x, 0, 2, S);
    }
    // Поперечные стяжки — то, чем солому держат в пучке.
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

// Стена зала: светлая штукатурка с лёгкой неровностью.
export function wallTexture(){
  return canvas(256, (g, S) => {
    g.fillStyle = CSS.wall;
    g.fillRect(0, 0, S, S);
    g.globalAlpha = 0.05;
    for(let i = 0; i < 900; i++){
      g.fillStyle = Math.random() > 0.5 ? "#000000" : "#ffffff";
      g.fillRect(Math.random() * S, Math.random() * S, 2, 2);
    }
    g.globalAlpha = 1;
  });
}
