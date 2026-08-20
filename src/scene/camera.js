// Камера: фиксированный вид сбоку-сверху, едет за игроком.
//
// Игрок не управляет камерой — только персонажем. Это осознанное решение
// (ДИЗАЙН.md, раздел 4): ребёнку хватает одной задачи за раз.
//
// Оси мира:
//   X — вдоль арены, куда идёт бой
//   Y — высота, прыжки и удары в голову
//   Z — глубина, отход вперёд-назад по татами

import * as THREE from "three";

export let camera;

// Смещение камеры относительно игрока. Подобрано так, чтобы было видно
// и глубину (камера сверху), и силуэты ударов (камера сбоку).
const OFFSET = new THREE.Vector3(0, 5.5, 11);
const LOOK_UP = 1.4;      // смотрим не в ноги, а в корпус

export function initCamera(){
  camera = new THREE.PerspectiveCamera(42, window.innerWidth / window.innerHeight, 0.1, 200);
  camera.position.copy(OFFSET);
  window.addEventListener("viewresize", onResize);
  return camera;
}

// Плавное следование. Камера догоняет цель, а не приклеена к ней намертво:
// при резком движении это читается как вес, а не как рывок изображения.
const target = new THREE.Vector3();

export function updateCamera(dt, focus){
  target.set(focus.x + OFFSET.x, OFFSET.y, focus.z + OFFSET.z);

  // Экспоненциальное сглаживание, независимое от частоты кадров.
  // Наивное `pos += (target - pos) * k * dt` ведёт себя по-разному
  // на 60 и 144 Гц — на быстром мониторе камера догоняет резче.
  const k = 1 - Math.exp(-6 * dt);
  camera.position.lerp(target, k);

  camera.lookAt(focus.x, focus.y + LOOK_UP, focus.z);
}

function onResize(){
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
}
