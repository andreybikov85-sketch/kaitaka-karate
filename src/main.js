// Точка входа.
//
// Порядок: собрать сцену и арену → показать экран входа → по нажатию
// «начать» загрузить персонажа и запустить цикл.

import * as THREE from "three";
import { initRenderer, renderer, scene, lights, followShadow } from "./scene/renderer.js";
import { initCamera, updateCamera, camera, screenAxes, setCameraMode, toggleCameraMode } from "./scene/camera.js";
import { buildArena } from "./scene/arena.js";
import { initInput, keys, took } from "./core/input.js";
import { onUpdate, onRender, startLoop } from "./core/loop.js";
import { showStart } from "./ui/start.js";
import { profile, saveProfile } from "./core/profile.js";
import { makeHero } from "./fight/hero.js";
import { makeSensei } from "./fight/sensei.js";
import { makeTraining, STATE } from "./stages/training.js";
import { makeTaskUI } from "./ui/task.js";
import { DOJO } from "./data/levels/dojo.js";
import { MODES } from "./fight/moves.js";
import { BELTS } from "./data/belts.js";

const canvas = document.getElementById("view");
initRenderer(canvas);
initCamera();
initInput();

// Эмблема клуба — единственная растровая картинка в проекте.
// Остальное окружение рисуется кодом.
const logo = new THREE.TextureLoader().load("assets/logo.png");
logo.colorSpace = THREE.SRGBColorSpace;

const arena = buildArena(scene, DOJO, lights, logo);

/* ---- Экран входа ---- */

const loading = document.getElementById("loading");
loading.classList.add("hidden");
showStart(begin);

const hint = document.getElementById("hint");
const viewIcon = document.getElementById("view-icon");
const viewText = document.getElementById("view-text");

// Вид запоминается в профиле: ребёнок выбирает один раз, а не каждый запуск.
function showView(m){
  profile.view = m;
  saveProfile();
  viewIcon.textContent = m === "third" ? "◰" : "◱";
  viewText.textContent = m === "third" ? "ИЗ-ЗА СПИНЫ" : "СБОКУ";
  hint.textContent = DOJO.tip + "  ·  V — сменить вид";
}

const modeEl = document.getElementById("mode");
function showMode(m){
  modeEl.textContent = m.jp + "  " + m.label.toUpperCase();
  modeEl.dataset.mode = m === MODES.kumite ? "kumite" : "training";
}

/* ---- Игра ---- */

async function begin(p){
  const belt = BELTS[p.beltIdx];

  // Вид восстанавливаем из профиля до первого кадра, чтобы игра
  // не начиналась одним ракурсом и не перескакивала на другой.
  setCameraMode(p.view);
  showView(p.view);

  // Модель весит мегабайты — показываем загрузку, иначе экран
  // просто чернеет на несколько секунд и кажется, что игра сломалась.
  loading.classList.remove("hidden");
  const hero = await makeHero(p.hero, belt.color);
  const sensei = await makeSensei();
  loading.classList.add("hidden");

  scene.add(hero.object);
  hero.setMode(DOJO.mode);
  showMode(hero.mode);

  // Сэнсэй ходит по кругу перед знаменем.
  if(sensei){
    scene.add(sensei.object);
    sensei.place(DOJO.task.sensei.x, DOJO.task.sensei.z, 0);
  }

  // Задание уровня: сэнсэй объясняет, дальше отсчёт.
  const ui = makeTaskUI(DOJO, p.name, () => stage.begin());
  const stage = makeTraining(DOJO, arena.userData.targets, ui);

  document.getElementById("done-go").addEventListener("click", () => location.reload());

  document.getElementById("hero-name").textContent = p.name;
  document.getElementById("belt-name").textContent = belt.name;
  document.getElementById("belt-rank").textContent = belt.rank;
  document.getElementById("belt-swatch").style.background = belt.color;

  const pos = hero.object.position;
  const halfLen = DOJO.length / 2 - 2;
  const halfDep = DOJO.depth / 2 - 0.6;

  // Персонаж смотрит вдоль своей оси +Z: угол 0 — на камеру в виде сбоку.
  // Поэтому направление движения переводится в угол как atan2(x, z).
  let faceTarget = Math.PI / 2;

  onUpdate(dt => {
    // Пока сэнсэй объясняет, боец слушает: управление не работает,
    // но сцена живёт — сэнсэй ходит, камера едет.
    if(stage.state === STATE.BRIEF){
      if(took("enter")) ui.accept();
      if(sensei){ sensei.setWalking(false); sensei.faceTo(pos.x, pos.z); sensei.step(dt); }
      hero.update(dt, false, false);
      followShadow(pos.x, pos.z);
      updateCamera(dt, pos);
      return;
    }
    if(sensei){ sensei.setWalking(true); sensei.step(dt); }

    // Этап закончился — управление отдаём, но бой уже не идёт.
    if(stage.state !== STATE.PLAY){
      hero.update(dt, false, false);
      stage.update(dt, hero);            // снаряды докачиваются
      followShadow(pos.x, pos.z);
      updateCamera(dt, pos);
      return;
    }

    // Удары разбираем ДО движения. Порядок важен: если сначала обработать
    // движение, только что начатый удар собьётся в стойку в том же кадре.
    if(took("kick"))  hero.act("kick");
    if(took("punch")) hero.attack();     // связка: цуки → хук → колено
    if(took("view"))  showView(toggleCameraMode());
    if(took("mode"))  showMode(hero.toggleMode());

    // Блок держится, пока нажата кнопка.
    hero.setBlock(keys.block);

    // Стрелки задают направление относительно ЭКРАНА, а не мира: вверх —
    // это всегда «от игрока вглубь», в каком бы виде мы ни были. Иначе при
    // переключении камеры управление вывернулось бы наизнанку.
    const a = screenAxes();
    const side = (keys.right ? 1 : 0) - (keys.left ? 1 : 0);
    const fwd  = (keys.up    ? 1 : 0) - (keys.down ? 1 : 0);

    let mx = a.fx * fwd + a.rx * side;
    let mz = a.fz * fwd + a.rz * side;
    const moving = !hero.busy && !!(mx || mz);

    // Идёт ли боец спиной вперёд.
    let backward = false;

    if(moving){
      // По диагонали скорость не должна складываться — иначе наискосок
      // персонаж идёт в полтора раза быстрее, чем прямо.
      const len = Math.hypot(mx, mz);
      mx /= len; mz /= len;

      // Куда смотреть. В кумитэ взгляд заперт: от противника не
      // отворачиваются, вперёд идут лицом, назад пятятся. В тренировке
      // и в виде из-за спины боец поворачивается по ходу движения.
      if(a.turnToMove)          faceTarget = Math.atan2(mx, mz);
      else if(!hero.mode.lock && side) faceTarget = side > 0 ? Math.PI / 2 : -Math.PI / 2;

      // Движение против взгляда — это отход, у него свой цикл и своя скорость.
      backward = (Math.sin(faceTarget) * mx + Math.cos(faceTarget) * mz) < -0.1;

      const SPEED = hero.speedFor(backward);
      pos.x += mx * SPEED * dt;
      pos.z += mz * SPEED * dt;
    }

    // Плавный разворот по кратчайшей дуге. Мгновенный поворот на 180°
    // читается как подмена кадра, а не как движение.
    let d = faceTarget - hero.object.rotation.y;
    while(d >  Math.PI) d -= Math.PI * 2;
    while(d < -Math.PI) d += Math.PI * 2;
    hero.object.rotation.y += d * (1 - Math.exp(-14 * dt));

    hero.update(dt, moving, backward);

    // Попадания считаем ПОСЛЕ обновления героя: поза бьющей конечности
    // должна быть уже нынешней, иначе удар засчитывается по вчерашнему
    // положению руки.
    hero.object.updateMatrixWorld(true);
    stage.update(dt, hero);

    // Границы татами.
    pos.x = Math.max(-halfLen, Math.min(halfLen, pos.x));
    pos.z = Math.max(-halfDep, Math.min(halfDep, pos.z));

    followShadow(pos.x, pos.z);
    updateCamera(dt, pos);
  });

  onRender(() => renderer.render(scene, camera));
  startLoop();
}
