// Точка входа.
//
// Порядок: собрать сцену и арену → показать экран входа → по нажатию
// «начать» загрузить персонажа и запустить цикл.

import * as THREE from "three";
import { initRenderer, renderer, scene, lights, followShadow } from "./scene/renderer.js";
import { initCamera, updateCamera, camera, screenAxes, toggleCameraMode } from "./scene/camera.js";
import { buildArena } from "./scene/arena.js";
import { initInput, keys, took } from "./core/input.js";
import { onUpdate, onRender, startLoop } from "./core/loop.js";
import { showStart } from "./ui/start.js";
import { makeHero } from "./fight/hero.js";
import { DOJO } from "./data/levels/dojo.js";
import { BELTS } from "./data/belts.js";

const canvas = document.getElementById("view");
initRenderer(canvas);
initCamera();
initInput();

// Эмблема клуба — единственная растровая картинка в проекте.
// Остальное окружение рисуется кодом.
const logo = new THREE.TextureLoader().load("assets/logo.png");
logo.colorSpace = THREE.SRGBColorSpace;

buildArena(scene, DOJO, lights, logo);

/* ---- Экран входа ---- */

const loading = document.getElementById("loading");
loading.classList.add("hidden");
showStart(begin);

const hint = document.getElementById("hint");
function showView(m){
  hint.textContent = DOJO.tip + "  ·  V — вид: " + (m === "third" ? "из-за спины" : "сбоку");
}
showView("side");

/* ---- Игра ---- */

async function begin(p){
  const belt = BELTS[p.beltIdx];

  // Модель весит мегабайты — показываем загрузку, иначе экран
  // просто чернеет на несколько секунд и кажется, что игра сломалась.
  loading.classList.remove("hidden");
  const hero = await makeHero(p.hero, belt.color);
  loading.classList.add("hidden");

  scene.add(hero.object);

  document.getElementById("hero-name").textContent = p.name;
  document.getElementById("belt-name").textContent = belt.name;
  document.getElementById("belt-rank").textContent = belt.rank;
  document.getElementById("belt-swatch").style.background = belt.color;

  const SPEED = 5.2;
  const pos = hero.object.position;
  const halfLen = DOJO.length / 2 - 2;
  const halfDep = DOJO.depth / 2 - 0.6;

  // Персонаж смотрит вдоль своей оси +Z: угол 0 — на камеру в виде сбоку.
  // Поэтому направление движения переводится в угол как atan2(x, z).
  let faceTarget = Math.PI / 2;

  onUpdate(dt => {
    // Удары разбираем ДО движения. Порядок важен: если сначала обработать
    // движение, только что начатый удар собьётся в стойку в том же кадре.
    if(took("kick"))  hero.act("kick");
    if(took("punch")) hero.act("punch");
    if(took("view"))  showView(toggleCameraMode());

    // Стрелки задают направление относительно ЭКРАНА, а не мира: вверх —
    // это всегда «от игрока вглубь», в каком бы виде мы ни были. Иначе при
    // переключении камеры управление вывернулось бы наизнанку.
    const a = screenAxes();
    const side = (keys.right ? 1 : 0) - (keys.left ? 1 : 0);
    const fwd  = (keys.up    ? 1 : 0) - (keys.down ? 1 : 0);

    let mx = a.fx * fwd + a.rx * side;
    let mz = a.fz * fwd + a.rz * side;
    const moving = !hero.busy && !!(mx || mz);

    if(moving){
      // По диагонали скорость не должна складываться — иначе наискосок
      // персонаж идёт в полтора раза быстрее, чем прямо.
      const len = Math.hypot(mx, mz);
      mx /= len; mz /= len;
      pos.x += mx * SPEED * dt;
      pos.z += mz * SPEED * dt;

      if(a.turnToMove) faceTarget = Math.atan2(mx, mz);
      else if(side)    faceTarget = side > 0 ? Math.PI / 2 : -Math.PI / 2;
    }

    // Плавный разворот по кратчайшей дуге. Мгновенный поворот на 180°
    // читается как подмена кадра, а не как движение.
    let d = faceTarget - hero.object.rotation.y;
    while(d >  Math.PI) d -= Math.PI * 2;
    while(d < -Math.PI) d += Math.PI * 2;
    hero.object.rotation.y += d * (1 - Math.exp(-14 * dt));

    hero.update(dt, moving);

    // Границы татами.
    pos.x = Math.max(-halfLen, Math.min(halfLen, pos.x));
    pos.z = Math.max(-halfDep, Math.min(halfDep, pos.z));

    followShadow(pos.x, pos.z);
    updateCamera(dt, pos);
  });

  onRender(() => renderer.render(scene, camera));
  startLoop();
}
