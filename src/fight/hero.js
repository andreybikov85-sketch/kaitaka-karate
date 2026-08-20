// Герой: настоящая модель, если она есть, иначе коробки.
//
// Модуль прячет разницу между ними за одним интерфейсом, поэтому остальной
// игре всё равно, что именно сейчас на арене:
//   hero.object          — объект для сцены
//   hero.update(dt, mv)  — кадр анимации
//   hero.setBelt(color)  — перекрасить пояс
//   hero.real            — true, если это модель, а не заглушка

import { loadCharacter } from "./character.js";
import { makeRig, poseIdle, poseWalk } from "./procedural.js";
import { makePlaceholder, animateWalk, setBeltColor } from "./placeholder.js";

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
      return realHero(ch, url);
    } catch(e){
      // Файла нет или он битый — молча пробуем следующий.
      // Игра не должна вставать из-за отсутствующей модели.
    }
  }
  return boxHero(who, beltColor);
}

function realHero(ch, url){
  const rig = makeRig(ch.root);
  let t = 0;

  // Настоящие клипы главнее: как только в assets/anims/ появятся файлы,
  // они вытеснят анимацию кодом. До этого двигаем костями сами.
  const hasClips = !!(ch.actions.walk || ch.actions.idle);

  return {
    object: ch.root,
    real: true,
    source: url,
    rigged: rig.ok,
    mode: hasClips ? "клипы" : (rig.ok ? "код" : "статуя"),

    update(dt, moving){
      if(hasClips){
        ch.update(dt);
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
    update(dt, moving){
      t = moving ? t + dt * 9 : 0;
      animateWalk(fig, t, moving);
    },
    setBelt(color){ setBeltColor(fig, color); }
  };
}
