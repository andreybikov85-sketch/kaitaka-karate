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
// Mixamo отдаёт удар рукой на 1.8 секунды, ногой на 1.6. Для ребёнка это
// не бой, а ожидание. Клип ускоряется до нужной длительности сам.
const CLIPS = {
  idle:  { url:"assets/anims/idle.json" },
  walk:  { url:"assets/anims/walk.json" },
  punch: { url:"assets/anims/punch.json", secs:0.40 },   // цуки, прямой
  hook:  { url:"assets/anims/hook.json",  secs:0.50 },   // боковой, добивание связки
  kick:  { url:"assets/anims/kick.json",  secs:0.62 },   // гери
  block: { url:"assets/anims/block.json", secs:0.30 },
  hit:   { url:"assets/anims/hit.json",   secs:0.38 },
  down:  { url:"assets/anims/down.json",  secs:0.90 },
  dash:  { url:"assets/anims/dash.json",  secs:0.45 }    // рывок вперёд
};

// Разовые: проигрываются один раз и возвращают бойца в стойку.
const ONCE = ["punch", "hook", "kick", "hit", "down", "dash"];

// Связка руками: второй удар подряд идёт другой рукой и сбоку.
// Так удары складываются в комбинацию, а не повторяются под копирку.
const COMBO_WINDOW = 0.9;

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
  let lastPunch = null, sinceLastPunch = 99;

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

      // Второй цуки подряд превращается в хук — получается связка.
      if(name === "punch" && ch.actions.hook && sinceLastPunch < COMBO_WINDOW && lastPunch === "punch"){
        if(ch.playOnce("hook")){ lastPunch = "hook"; sinceLastPunch = 0; return true; }
      }
      const ok = ch.playOnce(name);
      if(ok && (name === "punch" || name === "hook")){
        lastPunch = name; sinceLastPunch = 0;
      }
      return ok;
    },

    update(dt, moving){
      sinceLastPunch += dt;
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
