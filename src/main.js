// Точка входа. Этап 0: проверяем, что 3D заводится и открывается у всех.
//
// Фигура здесь временная — коробки вместо человека. На этапе 1 её заменит
// модель с анимациями, и этот файл станет тонким: собрать сцену и запустить цикл.

import * as THREE from "three";
import { initRenderer, renderer, scene } from "./scene/renderer.js";
import { initCamera, updateCamera, camera } from "./scene/camera.js";
import { C } from "./scene/palette.js";
import { initInput, keys } from "./core/input.js";
import { onUpdate, onRender, startLoop } from "./core/loop.js";
import { BELTS } from "./data/belts.js";

const canvas = document.getElementById("view");
initRenderer(canvas);
initCamera();
initInput();

/* ---- Временная фигура: проверка движения, теней и камеры ---- */

const belt = BELTS[0];   // белый, 0 кю — с него начинается путь

const hero = new THREE.Group();

function box(w, h, d, color, y){
  const m = new THREE.Mesh(
    new THREE.BoxGeometry(w, h, d),
    new THREE.MeshStandardMaterial({ color, roughness: 0.8 })
  );
  m.position.y = y;
  m.castShadow = true;
  hero.add(m);
  return m;
}

box(0.62, 0.75, 0.34, C.gi, 1.22);                 // корпус
box(0.66, 0.10, 0.38, belt.color, 0.88);           // пояс
box(0.34, 0.34, 0.32, C.skin, 1.78);               // голова
box(0.36, 0.12, 0.34, C.hair, 1.92);               // волосы
const armL = box(0.16, 0.52, 0.16, C.gi, 1.22); armL.position.x = -0.40;
const armR = box(0.16, 0.52, 0.16, C.gi, 1.22); armR.position.x =  0.40;
const legL = box(0.22, 0.85, 0.22, C.gi, 0.43); legL.position.x = -0.16;
const legR = box(0.22, 0.85, 0.22, C.gi, 0.43); legR.position.x =  0.16;

scene.add(hero);

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

/* ---- Движение ---- */

const SPEED = 5.2;
let walkT = 0;

onUpdate(dt => {
  const dx = (keys.right ? 1 : 0) - (keys.left ? 1 : 0);
  const dz = (keys.down  ? 1 : 0) - (keys.up   ? 1 : 0);

  if(dx || dz){
    // По диагонали скорость не должна складываться — иначе наискосок
    // персонаж идёт в полтора раза быстрее, чем прямо.
    const n = (dx && dz) ? Math.SQRT1_2 : 1;
    hero.position.x += dx * SPEED * n * dt;
    hero.position.z += dz * SPEED * n * dt;

    if(dx) hero.rotation.y = dx > 0 ? 0 : Math.PI;

    // Простая походка: руки и ноги качаются в противофазе.
    walkT += dt * 9;
    const s = Math.sin(walkT) * 0.5;
    legL.rotation.x =  s; legR.rotation.x = -s;
    armL.rotation.x = -s; armR.rotation.x =  s;
  } else {
    walkT = 0;
    for(const p of [legL, legR, armL, armR]) p.rotation.x *= 0.8;
  }

  // Границы татами по глубине.
  hero.position.z = Math.max(-5.5, Math.min(5.5, hero.position.z));

  updateCamera(dt, hero.position);
});

onRender(() => renderer.render(scene, camera));

/* ---- Готово: убираем экран загрузки ---- */

document.getElementById("loading").classList.add("hidden");
document.getElementById("belt-name").textContent = belt.name;
document.getElementById("belt-rank").textContent = belt.rank;
// Цвета поясов в data/belts.js — строки CSS, three.js понимает их как есть.
document.getElementById("belt-swatch").style.background = belt.color;

startLoop();
