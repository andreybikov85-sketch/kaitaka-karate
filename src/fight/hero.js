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
import { MOVES, LOOPS, CHAIN_WINDOW, CANCEL_FROM, MOVE_SPEED } from "./moves.js";

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

  // Стойка и ходьба клипами — если их нет, считаем кодом.
  const cycleFromClips = !!(ch.actions.walk && ch.actions.idle);

  // Подгоняем скорость клипа ходьбы под скорость героя. Без этого ноги
  // перебирают отдельно от тела: клип проходит около метра в секунду,
  // а игра везёт персонажа быстрее — получается скольжение.
  if(ch.actions.walk && LOOPS.walk.groundSpeed){
    ch.actions.walk.timeScale = MOVE_SPEED / LOOPS.walk.groundSpeed;
  }

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
    speed: MOVE_SPEED,
    mode: cycleFromClips ? "клипы" : (rig.ok ? "код" : "статуя"),

    get busy(){ return ch.busy; },
    get move(){ return active; },

    // Связка руками. Нажатие в окне продолжает комбинацию,
    // вне окна — начинает заново.
    attack(){
      const next = (chain && sinceStrike < CHAIN_WINDOW) ? chain : "punch";
      return start(next);
    },

    act(name){ return start(name); },

    update(dt, moving){
      sinceStrike += dt;
      ch.update(dt);

      // Разовая доиграла — отпускаем состояние.
      if(!ch.busy && active) active = null;
      // Окно связки истекло — комбинация сбрасывается.
      if(sinceStrike >= CHAIN_WINDOW) chain = null;

      if(ch.busy) return;

      if(cycleFromClips){
        ch.play(moving ? "walk" : "idle");
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
    mode: "коробки",
    speed: MOVE_SPEED,
    busy: false,
    move: null,
    attack(){ return false; },
    act(){ return false; },
    update(dt, moving){
      t = moving ? t + dt * 9 : 0;
      animateWalk(fig, t, moving);
    },
    setBelt(color){ setBeltColor(fig, color); }
  };
}
