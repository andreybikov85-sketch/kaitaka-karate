// Точка входа.
//
// Порядок: собрать сцену → показать экран входа → по нажатию «начать»
// загрузить персонажа и запустить цикл.

import * as THREE from "three";
import { initRenderer, renderer, scene } from "./scene/renderer.js";
import { initCamera, updateCamera, camera } from "./scene/camera.js";
import { C } from "./scene/palette.js";
import { initInput, keys } from "./core/input.js";
import { onUpdate, onRender, startLoop } from "./core/loop.js";
import { showStart } from "./ui/start.js";
import { makeHero } from "./fight/hero.js";
import { BELTS } from "./data/belts.js";

const canvas = document.getElementById("view");
initRenderer(canvas);
initCamera();
initInput();

/* ---- Ориентиры на арене: без них не понять, что двигаешься ---- */

for(let i = -4; i <= 4; i++){
  const post = new THREE.Mesh(
    new THREE.BoxGeometry(0.3, 2.4, 0.3),
    new THREE.MeshStandardMaterial({ color: C.wood, roughness: 0.9 })
  );
  post.position.set(i * 6, 1.2, -7);
  post.castShadow = true;
  post.receiveShadow = true;
  scene.add(post);
}

/* ---- Экран входа ---- */

const loading = document.getElementById("loading");
loading.classList.add("hidden");
showStart(begin);

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

  // Персонаж смотрит вдоль своей оси +Z. Чтобы развернуть его вправо
  // (в сторону +X мира), нужен угол +90°, влево — минус 90°.
  // Ноль и 180° разворачивали бы его к камере и спиной к игроку.
  let faceTarget = Math.PI / 2;

  onUpdate(dt => {
    const dx = (keys.right ? 1 : 0) - (keys.left ? 1 : 0);
    const dz = (keys.down  ? 1 : 0) - (keys.up   ? 1 : 0);
    const moving = !!(dx || dz);

    if(moving){
      // По диагонали скорость не должна складываться — иначе наискосок
      // персонаж идёт в полтора раза быстрее, чем прямо.
      const n = (dx && dz) ? Math.SQRT1_2 : 1;
      pos.x += dx * SPEED * n * dt;
      pos.z += dz * SPEED * n * dt;
      if(dx) faceTarget = dx > 0 ? Math.PI / 2 : -Math.PI / 2;
    }

    // Плавный разворот по кратчайшей дуге. Мгновенный поворот на 180°
    // читается как подмена кадра, а не как движение.
    let d = faceTarget - hero.object.rotation.y;
    while(d >  Math.PI) d -= Math.PI * 2;
    while(d < -Math.PI) d += Math.PI * 2;
    hero.object.rotation.y += d * (1 - Math.exp(-14 * dt));

    hero.update(dt, moving);

    // Границы татами по глубине.
    pos.z = Math.max(-5.5, Math.min(5.5, pos.z));

    updateCamera(dt, pos);
  });

  onRender(() => renderer.render(scene, camera));
  startLoop();
}
