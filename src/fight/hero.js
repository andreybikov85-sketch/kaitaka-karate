// Герой: настоящая модель, если она есть, иначе коробки.
//
// Модуль прячет разницу между ними за одним интерфейсом, поэтому остальной
// игре всё равно, что именно сейчас на арене:
//   hero.object          — объект для сцены
//   hero.update(dt, mv)  — кадр анимации
//   hero.attack()        — связка руками: цуки → хук → колено
//   hero.act(name)       — отдельный приём или реакция
//   hero.busy            — занят, движение запрещено
//   hero.setBelt(color)  — перекрасить пояс
//
// Правила «что за чем идёт» лежат данными в moves.js — здесь только их
// исполнение.

import * as THREE from "three";
import { loadCharacter, loadClips, strikeWindow } from "./character.js";
import { makeRig, poseIdle, poseWalk } from "./procedural.js";
import { makePlaceholder, animateWalk, setBeltColor } from "./placeholder.js";
import { MOVES, LOOPS, MODES, DEFAULT_MODE, CHAIN_WINDOW, CANCEL_FROM, BACK_FACTOR } from "./moves.js";

// Файлы клипов собираются из таблицы приёмов: имя приёма — имя файла.
const CLIPS = {};
for(const name of [...Object.keys(LOOPS), ...Object.keys(MOVES)]){
  CLIPS[name] = { url: `assets/anims/${name}.json`, secs: MOVES[name]?.secs };
}

// Файлы моделей пробуются по порядку. Как только в assets/models/ появятся
// boy.fbx и girl.fbx, они подхватятся сами — правок в коде не нужно.
const MODELS = {
  boy:  ["assets/models/boy.fbx",  "assets/models/passive_marker_man.fbx"],
  girl: ["assets/models/girl.fbx", "assets/models/passive_marker_man.fbx"]
};

export async function makeHero(who, beltColor){
  for(const url of MODELS[who] || []){
    try {
      const ch = await loadCharacter(url);

      // Модель без скелета не умеет двигаться. Пустить её в игру хуже, чем
      // не пустить: боец замрёт в позе, в которой приехал, и поедет по
      // татами целиком. Генераторы отдают такие модели, когда шаг с ригом
      // не выполнен, — берём следующую из списка.
      if(!ch.rigged){
        console.warn("Модель без скелета, пропускаю:", url);
        continue;
      }

      const clips = await loadClips(ch, CLIPS);
      return realHero(ch, url, clips);
    } catch(e){
      // Файла нет или он битый — молча пробуем следующий.
      // Игра не должна вставать из-за отсутствующей модели.
    }
  }
  return boxHero(who, beltColor);
}

function realHero(ch, url, clips){
  const rig = makeRig(ch.root);
  let t = 0;                    // время для анимации кодом
  let chain = null;             // следующий приём связки
  let sinceStrike = 99;         // сколько прошло с последнего удара
  let active = null;            // какой приём идёт сейчас
  let mode = MODES[DEFAULT_MODE];

  // Высота посадки, выставленная при загрузке: ноги ровно на полу.
  const inner = ch.root.children[0];
  const baseY = inner.position.y;

  // Клипы записаны из разных стоек и с разной высотой таза: в ходьбе
  // лодыжка опускается ниже, чем в боевом подшаге. Каждый цикл замеряется
  // и подтягивается к ПОЛУ.
  //
  // Эталон — поза покоя, где подошва лежит на нуле. Раньше эталоном был
  // самый низкий из клипов, и это работало, пока клипы не двигали таз
  // по высоте. Как только высота таза вернулась в анимацию, все клипы
  // выровнялись друг по другу — и дружно повисли в полуметре над полом.
  // Поправку считаем не только циклам, но и приёмам: у приседания
  // и падения таз записан на своей высоте, и без поправки боец
  // проседает под маты.
  //
  // Прыжок исключён намеренно: его высоту считает игра, и клип трогать
  // нельзя — поправка сложилась бы с настоящим подъёмом.
  const refGround = ch.bindGround();
  const groundFix = {};
  for(const name of [...Object.keys(LOOPS), ...Object.keys(MOVES)]){
    if(!ch.actions[name] || name === "jump") continue;
    groundFix[name] = refGround - ch.measureGround(name);
  }
  // Поправка начинается с нуля и нарастает вместе с клипом. Если выставить
  // её сразу, первые кадры получат полную поправку на ещё не начавшуюся
  // анимацию — и боец провалится под пол на те самые полметра.
  let groundY = 0;

  function applyMode(m){ mode = MODES[m] || mode; }
  applyMode(DEFAULT_MODE);

  // Какой цикл играть при такой скорости — и с какой частотой.
  //
  // Клип выбирается по СКОРОСТИ, а не по тому, нажата ли кнопка. Это
  // важнее, чем кажется: на разгоне и торможении скорость промежуточная,
  // и клип с постоянным темпом разъезжался бы с телом ровно в эти моменты.
  // А так частота считается из текущей скорости и совпадает всегда.
  function pickLoop(m){
    if(m.speed < 0.12) return { name: mode.idle, rate: 1 };

    const runName = mode.run && ch.actions.run ? "run" : mode.move;
    const useRun = mode.run && m.speed > mode.speed * 1.15;
    const name = m.backward ? mode.back : (useRun ? runName : mode.move);

    const gs = LOOPS[name]?.groundSpeed;
    // Клипа бега может не быть — тогда играем ходьбу быстрее. Выглядит
    // как спешный шаг, а не как поломка.
    return { name, rate: gs ? m.speed / gs : 1 };
  }

  // Стойка и движение клипами — если их нет, считаем кодом.
  const cycleFromClips = !!(ch.actions[mode.move] && ch.actions[mode.idle]);

  // Окно урона у каждого удара считается из самого клипа: отрезок, где
  // бьющая конечность вынесена вперёд. Правило из 2D-прототипа — урон
  // проходит в фазе выпада, иначе цель получает его до того, как удар
  // визуально дошёл, и бой ощущается нечестным.
  const windows = {};
  const limbs = {};
  for(const [name, m] of Object.entries(MOVES)){
    if(m.kind !== "strike" || !ch.actions[name]) continue;
    const w = strikeWindow(ch, ch.actions[name].getClip(), m.limb);
    if(w) windows[name] = w;
    ch.root.traverse(o => {
      if(o.isBone && o.name.replace(/^mixamorig:?/, "") === m.limb && !limbs[m.limb]) limbs[m.limb] = o;
    });
  }

  let strikeId = 0;
  const strikePoint = new THREE.Vector3();

  function start(name){
    const m = MOVES[name];
    if(!m || !ch.actions[name]) return false;

    if(active){
      const cur = MOVES[active];
      // Реакция прерывает всё, что слабее её.
      if(m.priority){
        if((cur.priority || 1) >= m.priority) return false;
        ch.cutOnce();
      }
      // Удар можно оборвать следующим в связке, но только во второй
      // половине — иначе связка выглядит как дёрганье.
      else if(m.kind === "strike" && cur.kind === "strike"){
        if(ch.onceProgress < CANCEL_FROM) return false;
        ch.cutOnce();
      }
      else return false;
    }

    if(!ch.playOnce(name)) return false;
    active = name;
    if(m.kind === "strike"){ chain = m.chain; sinceStrike = 0; strikeId++; }
    return true;
  }

  // Удар сейчас в фазе выпада? Возвращает точку бьющей конечности и номер
  // удара — по номеру цель понимает, что этот удар она уже засчитала,
  // и один удар не считается дважды за несколько кадров.
  function strikeNow(){
    if(!active) return null;
    const w = windows[active];
    const limb = limbs[MOVES[active]?.limb];
    if(!w || !limb) return null;
    const p = ch.onceProgress;
    if(p < w.from || p > w.to) return null;
    limb.getWorldPosition(strikePoint);
    return { id: strikeId, move: active, point: strikePoint };
  }

  return {
    object: ch.root,
    real: true,
    source: url,
    rigged: rig.ok,
    clips,
    anim: cycleFromClips ? "клипы" : (rig.ok ? "код" : "статуя"),

    // Настройки перемещения для текущего режима. Отход медленнее
    // наступления: пятиться от противника не должно быть так же выгодно,
    // как идти на него.
    motionCfg(backward){
      return {
        walk: mode.speed * (backward ? BACK_FACTOR : 1),
        run:  mode.run ? mode.run * (backward ? BACK_FACTOR : 1) : null,
        lockFacing: mode.lock
      };
    },
    get speed(){ return mode.speed; },
    get blocking(){ return !!ch.held; },
    get mode(){ return mode; },
    get busy(){ return ch.busy; },
    get move(){ return active; },

    // Смена режима: тренировка ⇄ кумитэ.
    setMode(m){ applyMode(m); return mode; },
    toggleMode(){ return this.setMode(mode === MODES.kumite ? "training" : "kumite"); },

    // Связка руками. Нажатие в окне продолжает комбинацию,
    // вне окна — начинает заново.
    attack(){
      const next = (chain && sinceStrike < CHAIN_WINDOW) ? chain : "punch";
      return start(next);
    },

    act(name){ return start(name); },
    strikeNow,

    // Блок держится, пока нажата кнопка. Вызывается каждый кадр.
    setBlock(on){
      const m = MOVES.block;
      if(on && !ch.held && !ch.busy && ch.actions.block) ch.playHold("block", m.guard);
      else if(!on && ch.held) ch.releaseHold();
      return !!ch.held;
    },

    // m — состояние движения из fight/motion.js:
    // { speed, backward, airborne, running }
    update(dt, m){
      sinceStrike += dt;
      ch.update(dt);

      // Разовая доиграла — отпускаем состояние.
      if(!ch.busy && active) active = null;
      // Окно связки истекло — комбинация сбрасывается.
      if(sinceStrike >= CHAIN_WINDOW) chain = null;

      // Во время приёма посадку тоже подтягиваем — у приседания, отжимания
      // и блока таз записан на своей высоте. Блок учитываем отдельно:
      // он удерживается своим путём, и в active не попадает.
      if(ch.busy){
        const поза = active || (ch.held ? "block" : null);
        if(cycleFromClips && поза && groundFix[поза] !== undefined){
          groundY += (groundFix[поза] - groundY) * (1 - Math.exp(-12 * dt));
          inner.position.y = baseY + groundY;
        }
        return;
      }

      if(cycleFromClips){
        const { name, rate } = pickLoop(m);
        const a = ch.actions[name];
        if(a) a.timeScale = rate;
        ch.play(name);

        // Посадка подтягивается ПЛАВНО, а не рывком.
        //
        // Переход между клипами занимает время: поза в эти кадры смешана
        // из двух. Если менять поправку мгновенно, боец на миг проваливается
        // под пол — на полметра при переходе со стойки на шаг.
        const want = groundFix[name] || 0;
        groundY += (want - groundY) * (1 - Math.exp(-12 * dt));
        inner.position.y = baseY + groundY;
        return;
      }
      if(!rig.ok) return;
      // Ходьба идёт по своему счётчику, стойка — по общему времени,
      // иначе дыхание сбивалось бы при каждой остановке.
      const moving = m.speed > 0.12;
      t += dt * (moving ? m.speed * 4 : 1);
      moving ? poseWalk(rig, t) : poseIdle(rig, t);
    },

    setBelt(){
      // У настоящей модели пояс — часть меша. Перекраска появится,
      // когда приедут модели с поясом отдельным материалом.
    }
  };
}

function boxHero(who, beltColor){
  const fig = makePlaceholder(who, beltColor);
  let t = 0;
  return {
    object: fig,
    real: false,
    source: null,
    clips: [],
    anim: "коробки",
    speed: MODES[DEFAULT_MODE].speed,
    mode: MODES[DEFAULT_MODE],
    busy: false,
    blocking: false,
    move: null,
    motionCfg(){ const m = MODES[DEFAULT_MODE];
      return { walk: m.speed, run: m.run, lockFacing: m.lock }; },
    setMode(){ return MODES[DEFAULT_MODE]; },
    toggleMode(){ return MODES[DEFAULT_MODE]; },
    setBlock(){ return false; },
    attack(){ return false; },
    act(){ return false; },
    strikeNow(){ return null; },
    update(dt, m){
      const moving = (m?.speed || 0) > 0.12;
      t = moving ? t + dt * 9 : 0;
      animateWalk(fig, t, moving);
    },
    setBelt(color){ setBeltColor(fig, color); }
  };
}
