// Холст и общие помощники отрисовки.
import { W, H } from "../config.js";

export const cv = document.getElementById("game");
cv.width = W;
cv.height = H;

export const ctx = cv.getContext("2d");
ctx.imageSmoothingEnabled = false;

// Логотип клуба КАЙТАКА. Пока не загрузился — рисуем запасной вариант.
export const LOGO = new Image();
export const logo = { ok: false };
LOGO.onload = () => { logo.ok = true; };
LOGO.src = "assets/logo.png";

export function txt(s, x, y, size, color, align, weight){
  ctx.font = (weight || "bold") + " " + size + 'px "Arial Black",Arial,sans-serif';
  ctx.textAlign = align || "left";
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = color;
  ctx.fillText(s, x, y);
}

export function mono(s, x, y, size, color, align){
  ctx.font = "bold " + size + 'px Consolas,"Courier New",monospace';
  ctx.textAlign = align || "left";
  ctx.fillStyle = color;
  ctx.fillText(s, x, y);
}

export function drawShadow(x, y, r){
  ctx.fillStyle = "rgba(0,0,0,.32)";
  ctx.beginPath();
  ctx.ellipse(x, y, r, r * 0.34, 0, 0, 7);
  ctx.fill();
}

export function panel(a){
  ctx.fillStyle = "rgba(8,10,16," + (a || 0.82) + ")";
  ctx.fillRect(0, 0, W, H);
}
