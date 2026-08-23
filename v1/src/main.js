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
import { makeChain, PHASE } from "./stages/chain.js";
import { makeTaskUI } from "./ui/task.js";
import { DOJO } from "./data/levels/dojo.js";
import { BELT_TASKS, BELT_REWARD } from "./data/tasks.js";
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
}

// Пояс в панели наверху. Меняется, когда сэнсэй его вручает.
function showBelt(b){
  document.getElementById("belt-name").textContent = b.name;
  document.getElementById("belt-rank").textContent = b.rank;
  document.getElementById("belt-swatch").style.background = b.color;
}

const modeEl = document.getElementById("mode");
const actBtns = [...document.querySelectorAll(".act")];

function showMode(m){
  // Всё оформление кнопки висит на одном признаке: и цвет кружка,
  // и то, какая фигурка показана. Подписи нет — поза говорит сама.
  modeEl.dataset.mode = m === MODES.kumite ? "kumite" : "training";
  modeEl.setAttribute("aria-label", "Режим: " + m.label);
  modeEl.title = "Сейчас " + m.label + " · сменить (T)";

  // Кнопки действий перерисовываются под режим: в зале физподготовка,
  // в поединке удары. Клавиши при этом не меняются.
  const acts = m.actions || [];
  for(const btn of actBtns){
    const a = acts[+btn.dataset.slot];
    btn.textContent = a ? a.label : "";
    btn.style.display = a ? "" : "none";
  }
  hint.textContent = DOJO.tip.replace("{приёмы}",
    acts.map((a, i) => ["J", "K", "L", "пробел"][i] + " — " + a.label.toLowerCase()).join(" · "));
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

  // Цепочка заданий: сэнсэй объясняет, ученик выполняет, сэнсэй отвечает.
  const ui = makeTaskUI(p.name, face, {
    begin(){ if(sensei) sensei.release(); chain.begin(); },
    next(){
      if(chain.phase === PHASE.BELT){ location.reload(); return; }
      chain.next();
      if(chain.phase === PHASE.BRIEF && sensei)
        sensei.brief(hero.object.position.x, hero.object.position.z);
    }
  });

  const chain = makeChain(BELT_TASKS, {
    level: DOJO, targets: arena.userData.targets, scene
  }, {
    brief: (t, no, всего) => ui.brief(t, no, всего),
    play:  (hud, left) => ui.play(hud, left),
    result: (won, words, t, no, всего) => ui.result(won, words, t, no, всего),
    belt: () => {
      // Пояс вручается за всю цепочку и сохраняется: путь должен
      // оставаться пройденным, а не начинаться заново каждый запуск.
      profile.beltIdx = BELT_REWARD;
      saveProfile();
      const b = BELTS[BELT_REWARD];
      showBelt(b);
      ui.belt(b);
    }
  });
  chain.start();

  document.getElementById("hero-name").textContent = p.name;
  showBelt(belt);

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

  // Направление взгляда словом — этапу «повтори за мной» важно, куда
  // боец реально повернулся, а не какая клавиша нажата.
  function сторона(){
    const y = ((motion.facing % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
    if(y < Math.PI * 0.25 || y > Math.PI * 1.75) return "down";   // лицом к камере
    if(y < Math.PI * 0.75) return "right";
    if(y < Math.PI * 1.25) return "up";
    return "left";
  }

  let начатоеДействие = null;    // какой приём начался в этом кадре

  onUpdate(dt => {
    const работа = chain.phase === PHASE.PLAY;

    // Пока сэнсэй говорит или показывает итог, управление молчит,
    // но сцена живёт: сэнсэй ходит, камера едет.
    if(!работа){
      if(took("enter")){ ui.accept(); ui.nextFromKey(); }
      if(sensei) sensei.step(dt);
      move = motion.update(dt, ZERO, hero.motionCfg(false));
      hero.update(dt, move);
      followShadow(pos.x, pos.z);
      updateCamera(dt, pos);
      return;
    }
    if(sensei) sensei.step(dt);

    // Действия разбираем ДО движения. Порядок важен: если сначала обработать
    // движение, только что начатый удар собьётся в стойку в том же кадре.
    //
    // Что на какой кнопке — решает режим. Кнопки четыре, клавиши те же
    // (J, K, L, пробел), а набор приёмов свой у зала и у поединка.
    начатоеДействие = null;
    const acts = hero.mode.actions || [];
    for(let i = 0; i < acts.length; i++){
      const a = acts[i], key = "a" + (i + 1);
      if(a.hold){ hero.setBlock(keys[key]); continue; }
      if(!took(key)) continue;
      if(a.jump){
        if(!hero.busy && motion.jump() && hero.act(a.move)) начатоеДействие = a.move;
        continue;
      }
      if(a.chain ? hero.attack() : hero.act(a.move)){
        начатоеДействие = a.move;
        aimAtTarget();
      }
    }

    if(took("view")) showView(toggleCameraMode());
    if(took("mode")) showMode(hero.toggleMode());

    // Стрелки задают направление относительно ЭКРАНА, а не мира: вверх —
    // это всегда «от игрока вглубь», в каком бы виде мы ни были.
    const a = screenAxes();
    const side = (keys.right ? 1 : 0) - (keys.left ? 1 : 0);
    const fwd  = (keys.up    ? 1 : 0) - (keys.down ? 1 : 0);
    dir.x = a.fx * fwd + a.rx * side;
    dir.z = a.fz * fwd + a.rz * side;

    const cfg = hero.motionCfg(move.backward);
    cfg.lockFacing = a.turnToMove ? false : cfg.lockFacing;

    // Удар и блок держат на месте, а прыжок — нет: в воздухе стрелками
    // можно править, куда приземлиться.
    cfg.frozen = hero.busy && !move.airborne;

    move = motion.update(dt, dir, cfg);
    hero.update(dt, move);

    // Этап считаем ПОСЛЕ обновления героя: поза бьющей конечности должна
    // быть уже нынешней, иначе удар засчитывается по вчерашнему положению.
    hero.object.updateMatrixWorld(true);
    chain.update(dt, { hero, motion, facing: сторона(), started: начатоеДействие });

    followShadow(pos.x, pos.z);
    updateCamera(dt, pos);
  });

  onRender(() => renderer.render(scene, camera));
  startLoop();
}
