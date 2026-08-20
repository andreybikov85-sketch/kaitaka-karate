// Герой: настоящая модель, если она есть, иначе коробки.
//
// Модуль прячет разницу между ними за одним интерфейсом, поэтому остальной
// игре всё равно, что именно сейчас на арене:
//   hero.object          — объект для сцены
//   hero.update(dt, mv)  — кадр анимации
//   hero.setBelt(color)  — перекрасить пояс
//   hero.real            — true, если это модель, а не заглушка

import { loadCharacter, loadClips } from "./character.js";
import { makeRig, poseIdle, poseWalk } from "./procedural.js";
import { makePlaceholder, animateWalk, setBeltColor } from "./placeholder.js";

// Анимации. Чего нет в assets/anims/ — просто недоступно, игра не падает.
//
// secs — сколько действие длится в игре. Это ТЕМП ИГРЫ, а не длина файла:
// Mixamo отдаёт удар ногой на 1.6 секунды, что для ребёнка не бой,
// а ожидание. Клип ускоряется до нужной длительности сам.
const CLIPS = {
  idle:  { url:"assets/anims/idle.fbx" },
  walk:  { url:"assets/anims/walk.fbx" },
  punch: { url:"assets/anims/punch.fbx", secs:0.42 },
  kick:  { url:"assets/anims/kick.fbx",  secs:0.62 },
  block: { url:"assets/anims/block.fbx", secs:0.30 },
  hit:   { url:"assets/anims/hit.fbx",   secs:0.38 },
  down:  { url:"assets/anims/down.fbx",  secs:0.90 }
};

// Разовые: проигрываются один раз и возвращают бойца в стойку.
const ONCE = ["punch", "kick", "hit", "down"];

// Файлы пробуются по порядку. Как только в assets/models/ появятся boy.fbx
// и girl.fbx, они подхватятся сами — правок в коде не нужно.
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
  let t = 0;

  // Клипы стойки и ходьбы главнее кода. Но набор может быть неполным:
  // пока есть только удар, циклы по-прежнему считаются формулой.
  const cycleFromClips = !!(ch.actions.walk || ch.actions.idle);

  return {
    object: ch.root,
    real: true,
    source: url,
    rigged: rig.ok,
    clips,
    mode: cycleFromClips ? "клипы" : (rig.ok ? "код" : "статуя"),

    // Занят ударом — движение и новый удар запрещены. Ровно та же логика,
    // что в 2D-прототипе: без неё удар сбрасывается в стойку в том же кадре.
    get busy(){ return ch.busy; },

    // Разовое действие: удар, получение урона, падение.
    act(name){
      if(!ONCE.includes(name)) return false;
      return ch.playOnce(name);
    },

    update(dt, moving){
      ch.update(dt);                 // разовые клипы крутятся всегда

      if(ch.busy) return;            // во время удара позу не трогаем

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
    busy: false,
    act(){ return false; },
    update(dt, moving){
      t = moving ? t + dt * 9 : 0;
      animateWalk(fig, t, moving);
    },
    setBelt(color){ setBeltColor(fig, color); }
  };
}
