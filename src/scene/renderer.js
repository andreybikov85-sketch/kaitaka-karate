// Three.js: рендерер, сцена, свет, пол.
//
// Всё, что касается «как рисовать вообще», живёт здесь. Конкретные арены
// собирает scene/arena.js — этот модуль про них ничего не знает.

import * as THREE from "three";
import { C } from "./palette.js";

export let renderer, scene;

export function initRenderer(canvas){
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);

  // Ограничение плотности пикселей. Без него на телефоне с ретиной
  // рендерится вчетверо больше пикселей и кадры проседают на ровном месте.
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;

  scene = new THREE.Scene();
  scene.background = new THREE.Color(C.night);
  // Туман прячет дальний край арены — не видно, где кончается пол.
  scene.fog = new THREE.Fog(C.night, 24, 60);

  addLights();
  addGround();

  window.addEventListener("resize", onResize);
  return { renderer, scene };
}

function addLights(){
  // Заполняющий свет: сверху цвет неба, снизу отражение от татами.
  scene.add(new THREE.HemisphereLight(0xbcd0e8, C.tatami, 1.1));

  // Основной направленный свет — он единственный даёт тени.
  // Больше источников с тенями брать нельзя: тени дороги, а на слабом
  // железе каждый такой источник — это отдельный проход рендера.
  const sun = new THREE.DirectionalLight(0xfff2dd, 2.0);
  sun.position.set(-8, 14, 8);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);

  const d = 18;
  sun.shadow.camera.left = -d;
  sun.shadow.camera.right = d;
  sun.shadow.camera.top = d;
  sun.shadow.camera.bottom = -d;
  sun.shadow.camera.near = 1;
  sun.shadow.camera.far = 40;
  sun.shadow.bias = -0.0015;   // убирает полосы самозатенения на полу

  scene.add(sun);
  scene.add(sun.target);
}

function addGround(){
  const mat = new THREE.MeshStandardMaterial({ color: C.tatami, roughness: 0.95 });
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(200, 40), mat);
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  // Разметка татами. Без неё в 3D не читается глубина: непонятно,
  // стоишь ты вровень с противником или в двух шагах от него.
  const grid = new THREE.GridHelper(200, 100, C.tatami2, C.tatami2);
  grid.position.y = 0.01;
  grid.material.opacity = 0.35;
  grid.material.transparent = true;
  scene.add(grid);
}

function onResize(){
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  window.dispatchEvent(new CustomEvent("viewresize"));
}
