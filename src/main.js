// Точка входа.
//
// Порядок: собрать сцену → показать экран входа → по нажатию «начать»
// создать персонажа и запустить цикл.
//
// Фигура пока из коробок (fight/placeholder.js). На этапе 1 её заменит
// модель с Mixamo, и поменяется здесь ровно одна строка — makePlaceholder.

import * as THREE from "three";
import { initRenderer, renderer, scene } from "./scene/renderer.js";
import { initCamera, updateCamera, camera } from "./scene/camera.js";
import { C } from "./scene/palette.js";
import { initInput, keys } from "./core/input.js";
import { onUpdate, onRender, startLoop } from "./core/loop.js";
import { profile } from "./core/profile.js";
import { showStart } from "./ui/start.js";
import { makePlaceholder, animateWalk } from "./fight/placeholder.js";
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

document.getElementById("loading").classList.add("hidden");
showStart(begin);

/* ---- Игра ---- */

function begin(p){
  const belt = BELTS[p.beltIdx];
  const hero = makePlaceholder(p.hero, belt.color);
  scene.add(hero);

  document.getElementById("hero-name").textContent = p.name;
  document.getElementById("belt-name").textContent = belt.name;
  document.getElementById("belt-rank").textContent = belt.rank;
  document.getElementById("belt-swatch").style.background = belt.color;

  const SPEED = 5.2;
  let walkT = 0;

  onUpdate(dt => {
    const dx = (keys.right ? 1 : 0) - (keys.left ? 1 : 0);
    const dz = (keys.down  ? 1 : 0) - (keys.up   ? 1 : 0);
    const moving = !!(dx || dz);

    if(moving){
      // По диагонали скорость не должна складываться — иначе наискосок
      // персонаж идёт в полтора раза быстрее, чем прямо.
      const n = (dx && dz) ? Math.SQRT1_2 : 1;
      hero.position.x += dx * SPEED * n * dt;
      hero.position.z += dz * SPEED * n * dt;
      if(dx) hero.rotation.y = dx > 0 ? 0 : Math.PI;
      walkT += dt * 9;
    } else {
      walkT = 0;
    }

    animateWalk(hero, walkT, moving);

    // Границы татами по глубине.
    hero.position.z = Math.max(-5.5, Math.min(5.5, hero.position.z));

    updateCamera(dt, hero.position);
  });

  onRender(() => renderer.render(scene, camera));
  startLoop();
}
