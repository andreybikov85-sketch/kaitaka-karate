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

import { loadCharacter, loadClips } from "./character.js";
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

  // Клипы записаны из разных стоек: в обычной ходьбе лодыжка опускается
  // ниже, чем в боевом подшаге. Замеряем каждый цикл и запоминаем поправку,
  // иначе при смене режима боец повиснет над татами.
  const groundFix = {};
  let refGround = null;
  for(const name of Object.keys(LOOPS)){
    if(!ch.actions[name]) continue;
    const lo = ch.measureGround(name);
    if(refGround === null || lo < refGround) refGround = lo;
    groundFix[name] = lo;
  }
  for(const k in groundFix) groundFix[k] = refGround - groundFix[k];

  // Темп клипа подгоняется под скорость режима: иначе ноги перебирают
  // отдельно от тела и персонаж скользит.
  function applyMode(m){
    mode = MODES[m] || mode;
    for(const [key, factor] of [["move", 1], ["back", BACK_FACTOR]]){
      const name = mode[key];
      const a = ch.actions[name];
      const gs = LOOPS[name]?.groundSpeed;
      if(a && gs) a.timeScale = (mode.speed * factor) / gs;
    }
  }
  applyMode(DEFAULT_MODE);

  // Стойка и движение клипами — если их нет, считаем кодом.
  const cycleFromClips = !!(ch.actions[mode.move] && ch.actions[mode.idle]);

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
    if(m.kind === "strike"){ chain = m.chain; sinceStrike = 0; }
    return true;
  }

  return {
    object: ch.root,
    real: true,
    source: url,
    rigged: rig.ok,
    clips,
    anim: cycleFromClips ? "клипы" : (rig.ok ? "код" : "статуя"),

    // Скорость отхода ниже: пятиться от противника не должно быть
    // так же выгодно, как идти на него.
    speedFor(backward){ return mode.speed * (backward ? BACK_FACTOR : 1); },
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

    // Блок держится, пока нажата кнопка. Вызывается каждый кадр.
    setBlock(on){
      const m = MOVES.block;
      if(on && !ch.held && !ch.busy && ch.actions.block) ch.playHold("block", m.guard);
      else if(!on && ch.held) ch.releaseHold();
      return !!ch.held;
    },

    update(dt, moving, backward){
      sinceStrike += dt;
      ch.update(dt);

      // Разовая доиграла — отпускаем состояние.
      if(!ch.busy && active) active = null;
      // Окно связки истекло — комбинация сбрасывается.
      if(sinceStrike >= CHAIN_WINDOW) chain = null;

      if(ch.busy) return;

      if(cycleFromClips){
        // Отход — отдельный цикл: боец пятится, не отворачиваясь
        // от противника. Без него он разворачивался бы спиной к бою.
        const walkName = (backward && ch.actions[mode.back]) ? mode.back : mode.move;
        const loop = moving ? walkName : mode.idle;
        ch.play(loop);
        // Выравниваем посадку под стойку текущего клипа.
        inner.position.y = baseY + (groundFix[loop] || 0);
        return;
      }
      if(!rig.ok) return;
      // Ходьба идёт по своему счётчику, стойка — по общему времени,
      // иначе дыхание сбивалось бы при каждой остановке.
      t += dt * (moving ? 8.5 : 1);
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
    speedFor(){ return MODES[DEFAULT_MODE].speed; },
    setMode(){ return MODES[DEFAULT_MODE]; },
    toggleMode(){ return MODES[DEFAULT_MODE]; },
    setBlock(){ return false; },
    attack(){ return false; },
    act(){ return false; },
    update(dt, moving){
      t = moving ? t + dt * 9 : 0;
      animateWalk(fig, t, moving);
    },
    setBelt(color){ setBeltColor(fig, color); }
  };
}
