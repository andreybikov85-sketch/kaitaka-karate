// Точка входа.
//
// Порядок: собрать сцену и арену → показать экран входа → по нажатию
// «начать» загрузить персонажа и запустить цикл.

import * as THREE from "three";
import { initRenderer, renderer, scene, lights, followShadow } from "./scene/renderer.js";
import { initCamera, updateCamera, camera, screenAxes, setCameraMode, toggleCameraMode, setBounds } from "./scene/camera.js";
import { buildArena } from "./scene/arena.js";
import { initInput, keys, took } from "./core/input.js";
import { onUpdate, onRender, startLoop } from "./core/loop.js";
import { showStart } from "./ui/start.js";
import { profile, saveProfile } from "./core/profile.js";
import { makeHero } from "./fight/hero.js";
import { makeMotion } from "./fight/motion.js";
import { makeSensei } from "./fight/sensei.js";
import { renderPortrait } from "./ui/portrait.js";
import { makeTraining, STATE } from "./stages/training.js";
import { makeTaskUI } from "./ui/task.js";
import { DOJO } from "./data/levels/dojo.js";
import { MODES, AIM } from "./fight/moves.js";
import { BELTS } from "./data/belts.js";

const ZERO = { x: 0, z: 0 };
const dir = { x: 0, z: 0 };

const canvas = document.getElementById("view");
initRenderer(canvas);
initCamera();
initInput();

// Эмблема клуба — единственная растровая картинка в проекте.
// Остальное окружение рисуется кодом.
const logo = new THREE.TextureLoader().load("assets/logo.png");
logo.colorSpace = THREE.SRGBColorSpace;

const arena = buildArena(scene, DOJO, lights, logo);

// Камера должна знать стены зала, чтобы не уезжать за них.
setBounds({ x: DOJO.length / 2, z: DOJO.depth / 2, ceil: DOJO.wallHeight });

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
  // Всё оформление кнопки висит на одном признаке: и цвет кружка,
  // и то, какая фигурка показана. Подписи нет — поза говорит сама.
  modeEl.dataset.mode = m === MODES.kumite ? "kumite" : "training";
  modeEl.setAttribute("aria-label", "Режим: " + m.label);
  modeEl.title = "Сейчас " + m.label + " · сменить (T)";
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
  const sensei = await makeSensei(DOJO.task.patrol);
  loading.classList.add("hidden");

  scene.add(hero.object);
  hero.setMode(DOJO.mode);
  showMode(hero.mode);

  // Сэнсэй объясняет задание, потом обходит зал.
  let face = null;
  if(sensei){
    scene.add(sensei.object);
    face = renderPortrait(sensei.character);
    sensei.brief(hero.object.position.x, hero.object.position.z);
  }

  // Задание уровня: сэнсэй объясняет, дальше отсчёт.
  const ui = makeTaskUI(DOJO, p.name, () => {
    if(sensei) sensei.release();
    stage.begin();
  }, face);
  const stage = makeTraining(DOJO, arena.userData.targets, ui, scene);

  document.getElementById("done-go").addEventListener("click", () => location.reload());

  document.getElementById("hero-name").textContent = p.name;
  document.getElementById("belt-name").textContent = belt.name;
  document.getElementById("belt-rank").textContent = belt.rank;
  document.getElementById("belt-swatch").style.background = belt.color;

  const pos = hero.object.position;

  // Перемещение вынесено в fight/motion.js: скорость там разгоняется
  // и тормозит, а не включается выключателем.
  const motion = makeMotion(hero.object, {
    x: DOJO.length / 2 - 2,
    z: DOJO.depth / 2 - 0.6
  });
  let move = { speed: 0, backward: false, airborne: false, running: false };

  // Автодоворот к ближайшей цели при ударе. Правило проекта: без него
  // ребёнок постоянно бьёт в пустоту — особенно в виде сбоку, где взгляд
  // заперт влево-вправо, а снаряд может стоять по глубине.
  function aimAtTarget(){
    let best = null, bd = AIM.radius;
    for(const t of DOJO.targets || []){
      const d = Math.hypot(t.x - pos.x, t.z - pos.z);
      if(d < bd){ bd = d; best = t; }
    }
    if(best) motion.faceToward(best.x, best.z);
  }

  onUpdate(dt => {
    // Пока сэнсэй объясняет, боец слушает: управление не работает,
    // но сцена живёт — сэнсэй ходит, камера едет.
    if(stage.state === STATE.BRIEF){
      if(took("enter")) ui.accept();
      if(sensei) sensei.step(dt);
      move = motion.update(dt, ZERO, hero.motionCfg(false));
      hero.update(dt, move);
      followShadow(pos.x, pos.z);
      updateCamera(dt, pos);
      return;
    }
    if(sensei) sensei.step(dt);

    // Этап закончился — управление отдаём, но бой уже не идёт.
    if(stage.state !== STATE.PLAY){
      move = motion.update(dt, ZERO, hero.motionCfg(false));
      hero.update(dt, move);
      stage.update(dt, hero);            // снаряды докачиваются
      followShadow(pos.x, pos.z);
      updateCamera(dt, pos);
      return;
    }

    // Удары разбираем ДО движения. Порядок важен: если сначала обработать
    // движение, только что начатый удар собьётся в стойку в том же кадре.
    if(took("kick")  && hero.act("kick")) aimAtTarget();
    if(took("punch") && hero.attack())    aimAtTarget();
    if(took("view"))  showView(toggleCameraMode());
    if(took("mode"))  showMode(hero.toggleMode());
    if(took("jump") && !hero.busy) motion.jump();

    // Блок держится, пока нажата кнопка.
    hero.setBlock(keys.block);

    // Стрелки задают направление относительно ЭКРАНА, а не мира: вверх —
    // это всегда «от игрока вглубь», в каком бы виде мы ни были. Иначе при
    // переключении камеры управление вывернулось бы наизнанку.
    const a = screenAxes();
    const side = (keys.right ? 1 : 0) - (keys.left ? 1 : 0);
    const fwd  = (keys.up    ? 1 : 0) - (keys.down ? 1 : 0);
    dir.x = a.fx * fwd + a.rx * side;
    dir.z = a.fz * fwd + a.rz * side;

    // В виде из-за спины боец разворачивается по ходу движения целиком.
    // В виде сбоку взгляд заперт влево-вправо ВСЕГДА, в обоих режимах:
    // повернувшись спиной к экрану, боец загораживает сам себя, и не видно
    // ни его, ни того, что он делает. К цели по глубине он доворачивается
    // не поворотом корпуса, а автодоворотом в момент удара.
    const cfg = hero.motionCfg(move.backward);
    cfg.lockFacing = !a.turnToMove;
    cfg.frozen = hero.busy;            // удар и блок держат на месте

    move = motion.update(dt, dir, cfg);
    hero.update(dt, move);

    // Попадания считаем ПОСЛЕ обновления героя: поза бьющей конечности
    // должна быть уже нынешней, иначе удар засчитывается по вчерашнему
    // положению руки.
    hero.object.updateMatrixWorld(true);
    stage.update(dt, hero);

    followShadow(pos.x, pos.z);
    updateCamera(dt, pos);
  });

  onRender(() => renderer.render(scene, camera));
  startLoop();
}
