// Цепочка заданий: сэнсэй объясняет, ученик выполняет, сэнсэй отвечает.
//
// Устройство одно на все задания. Что именно делать — решают данные
// (data/tasks.js) и модуль этапа. Здесь только порядок:
//
//   объяснение → работа → похвала или подбадривание → следующее
//   и в конце всей цепочки — вручение пояса.
//
// Провал не отбрасывает назад: задание просто повторяется. Ребёнок
// не должен терять сделанное из-за одной неудачной попытки.

import { STATE } from "./state.js";
import { makeShuttle } from "./shuttle.js";
import { makeSequence } from "./sequence.js";
import { makeMakiwara } from "./makiwara.js";

const FACTORY = {
  shuttle:  makeShuttle,
  sequence: makeSequence,
  makiwara: makeMakiwara
};

export const PHASE = { BRIEF: "brief", PLAY: "play", RESULT: "result", BELT: "belt" };

export function makeChain(all, ctx, ui){
  // Задания, для которых этапа ещё нет, в цепочку не попадают.
  //
  // Их нельзя ни выполнить, ни провалить — цепочка встала бы на них
  // навсегда, и пояс стал бы недостижим. В данных они остаются: это план,
  // а не мусор. Появится этап — задание встанет в строй само.
  const tasks = all.filter(t => FACTORY[t.kind]);
  const отложено = all.filter(t => !FACTORY[t.kind]).map(t => t.name);
  if(отложено.length) console.info("Заданий ждёт своего этапа:", отложено.join(", "));

  let idx = 0;
  let phase = PHASE.BRIEF;
  let stage = null;

  function задание(){ return tasks[idx]; }

  function объяснить(){
    phase = PHASE.BRIEF;
    if(stage && stage.dispose) stage.dispose();
    stage = null;
    ui.brief(задание(), idx + 1, tasks.length);
  }

  return {
    get phase(){ return phase; },
    get task(){ return задание(); },
    get stage(){ return stage; },
    get index(){ return idx; },

    start(){ объяснить(); },

    // Сэнсэй договорил — пошла работа.
    begin(){
      if(phase !== PHASE.BRIEF) return;
      const t = задание();
      stage = FACTORY[t.kind](t, ctx);
      phase = PHASE.PLAY;
      ui.play(stage.hud(), stage.left);
    },

    // Игрок нажал «дальше» на экране итога.
    next(){
      if(phase !== PHASE.RESULT) return;
      if(stage && stage.state === STATE.WIN){
        if(++idx >= tasks.length){ phase = PHASE.BELT; ui.belt(); return; }
      }
      объяснить();                       // провал — то же задание заново
    },

    update(dt, c){
      if(phase !== PHASE.PLAY || !stage) return;
      const st = stage.update(dt, c);
      ui.play(stage.hud(), stage.left, stage.mark);
      if(st === STATE.PLAY) return;
      phase = PHASE.RESULT;
      const t = задание();
      ui.result(st === STATE.WIN, st === STATE.WIN ? t.win : t.lose, t, idx + 1, tasks.length);
    }
  };
}
