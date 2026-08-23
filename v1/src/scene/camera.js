// Камера. Два вида, переключаются на лету.
//
//   "side"  — сбоку-сверху, классический вид beat'em'up. Зал идёт поперёк
//             экрана, противники подходят справа.
//   "third" — из-за спины. Зал уходит вглубь экрана, противники впереди.
//
// Ни в одном из видов игрок камерой НЕ управляет — только персонажем.
// Это осознанное решение (ДИЗАЙН.md, раздел 4): ребёнку хватает одной
// задачи за раз. Камера за спиной с мышью — совсем другая игра.
//
// Оси мира:
//   X — вдоль зала, куда идёт бой
//   Y — высота
//   Z — глубина татами

import * as THREE from "three";

export let camera;
export let mode = "side";

// Смещение камеры относительно игрока. Подобрано под настоящий зал:
// он небольшой, почти квадратный, потолок 2.9 м.
//
// Вид сбоку: камера снаружи, смотрит в зал как в разрез. Потолок для неё
// прозрачен — он односторонний и виден только снизу.
const SIDE  = new THREE.Vector3(0, 4.3, 8.6);
// Вид из-за спины: камера ВНУТРИ зала и обязана быть ниже потолка,
// иначе упрётся в него и покажет изнанку.
const THIRD = new THREE.Vector3(-5.4, 2.35, 0);

const LOOK_UP_SIDE  = 1.4;    // смотрим в корпус, не в ноги
const LOOK_UP_THIRD = 1.2;

export function initCamera(){
  camera = new THREE.PerspectiveCamera(42, window.innerWidth / window.innerHeight, 0.1, 200);
  camera.position.copy(SIDE);
  window.addEventListener("viewresize", onResize);
  return camera;
}

export function setCameraMode(m){
  mode = m;
  camera.fov = m === "third" ? 55 : 42;   // за спиной нужен более широкий обзор
  camera.updateProjectionMatrix();
}

export function toggleCameraMode(){
  setCameraMode(mode === "side" ? "third" : "side");
  return mode;
}

// Направление «вперёд» на экране — от него зависит, куда пойдёт персонаж
// при нажатии стрелки вверх. Движение всегда считается относительно того,
// что игрок видит, иначе при смене вида управление вывернется наизнанку.
//
// turnToMove — поворачивается ли боец на всё направление движения:
//   из-за спины — да, иначе он ходил бы боком и это выглядело бы нелепо;
//   сбоку — нет, только влево-вправо. Это правило beat'em'up: при шаге
//   в глубину боец держит лицо к противнику. Если разворачивать его
//   спиной к экрану, отойти вбок, не потеряв врага из виду, станет нельзя.
export function screenAxes(){
  return mode === "third"
    ? { fx: 1, fz: 0, rx: 0, rz: 1, turnToMove: true }    // вперёд +X, вправо +Z
    : { fx: 0, fz: -1, rx: 1, rz: 0, turnToMove: false }; // вперёд вглубь -Z, вправо +X
}

// Размеры зала, чтобы камера не уходила куда попало.
//
// Вид из-за спины идёт ИЗНУТРИ помещения, и камера обязана оставаться
// в его стенах: за стеной она показала бы соседнюю комнату, которой нет.
// Вид сбоку, наоборот, смотрит снаружи — стены для него односторонние
// и не мешают, но и его придерживаем, чтобы зал не уезжал в туман.
let bounds = null;

export function setBounds(b){ bounds = b; }

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const target = new THREE.Vector3();

export function updateCamera(dt, focus){
  const off = mode === "third" ? THIRD : SIDE;
  target.set(focus.x + off.x, off.y, focus.z + off.z);

  if(bounds){
    const m = 0.5;
    // Вдоль зала придерживаем в обоих видах.
    target.x = clamp(target.x, -bounds.x + m, bounds.x - m);
    if(mode === "third"){
      target.z = clamp(target.z, -bounds.z + m, bounds.z - m);
      target.y = Math.min(target.y, bounds.ceil - 0.3);
    } else {
      // Сбоку расстояние до бойца держим постоянным, иначе он то крупный,
      // то мелкий в зависимости от того, у какой стены стоит. Камере
      // при этом можно и заходить в зал, и выходить за него: стены для
      // неё односторонние и обзор не загораживают.
      target.z = clamp(target.z, -bounds.z, bounds.z + off.z);
    }
  }

  // Экспоненциальное сглаживание, независимое от частоты кадров.
  // Наивное `pos += (target - pos) * k * dt` ведёт себя по-разному
  // на 60 и 144 Гц — на быстром мониторе камера догоняет резче.
  // При смене вида камера не прыгает, а переезжает.
  const k = 1 - Math.exp(-6 * dt);
  camera.position.lerp(target, k);

  camera.lookAt(focus.x, focus.y + (mode === "third" ? LOOK_UP_THIRD : LOOK_UP_SIDE), focus.z);
}

function onResize(){
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
}
