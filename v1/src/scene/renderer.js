// Three.js: рендерер, сцена, свет, пол.
//
// Всё, что касается «как рисовать вообще», живёт здесь. Конкретные арены
// собирает scene/arena.js — этот модуль про них ничего не знает.

import * as THREE from "three";
import { C } from "./palette.js";

export let renderer, scene;

// Свет отдаётся наружу: цвет и силу задаёт арена, у каждого зала свои.
export const lights = { hemi: null, sun: null };

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

  window.addEventListener("resize", onResize);
  return { renderer, scene };
}

function addLights(){
  // Заполняющий свет: сверху цвет неба, снизу отражение от татами.
  lights.hemi = new THREE.HemisphereLight(0xbcd0e8, C.tatami, 1.1);
  scene.add(lights.hemi);

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

  lights.sun = sun;
  scene.add(sun);
  scene.add(sun.target);
}

// Тень рисуется не по всему залу, а вокруг игрока: зал длиной 64 метра,
// и одна карта теней на всю длину дала бы тени крупнее пикселя.
export function followShadow(x, z){
  const s = lights.sun;
  if(!s) return;
  s.target.position.set(x, 0, z);
  s.target.updateMatrixWorld();
  s.position.set(x - 9, 15, z + 7);
}

function onResize(){
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  window.dispatchEvent(new CustomEvent("viewresize"));
}
