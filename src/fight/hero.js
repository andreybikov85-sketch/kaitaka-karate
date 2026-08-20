// Герой: настоящая модель, если она есть, иначе коробки.
//
// Модуль прячет разницу между ними за одним интерфейсом, поэтому остальной
// игре всё равно, что именно сейчас на арене:
//   hero.object          — объект для сцены
//   hero.update(dt, mv)  — кадр анимации
//   hero.setBelt(color)  — перекрасить пояс
//   hero.real            — true, если это модель, а не заглушка

import { loadCharacter } from "./character.js";
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
  let t = 0;
  return {
    object: ch.root,
    real: true,
    source: url,
    update(dt, moving){
      ch.update(dt);
      // Клипы ходьбы и стойки появятся вместе с файлами анимаций.
      // Пока их нет, персонаж стоит в позе, в которой приехал.
      if(ch.actions.walk || ch.actions.idle) ch.play(moving ? "walk" : "idle");
      t += dt;
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
