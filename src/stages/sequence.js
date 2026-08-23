// Этап «повтори за мной»: выполнить показанную последовательность.
//
// Шаг последовательности — либо направление (повернуться туда), либо удар.
// Порядок строгий: пропустить нельзя, а вот лишнее движение прощается —
// оно просто не засчитывается. Сбивать ребёнка за случайное нажатие
// значило бы наказывать за то, что он ещё не освоился с управлением.

import { STATE } from "./state.js";

export function makeSequence(task, ctx){
  // Шаги с повторами разворачиваем в плоский список: три цуки подряд —
  // это три шага, и на панели их видно как три деления.
  const steps = [];
  for(const s of task.steps){
    const n = s.times || 1;
    for(let i = 0; i < n; i++) steps.push(s);
  }

  let at = 0;
  let left = task.seconds;
  let state = STATE.PLAY;

  return {
    get state(){ return state; },
    get left(){ return left; },
    get mark(){ return null; },

    hud(){
      const s = steps[at];
      return {
        text: s ? s.label : "",
        cells: steps.map((_, i) => i < at ? 1 : 0),
        note: at + " / " + steps.length
      };
    },

    update(dt, c){
      if(state !== STATE.PLAY) return state;

      left -= dt;
      if(left <= 0){ left = 0; state = STATE.LOSE; return state; }

      const s = steps[at];
      if(!s) { state = STATE.WIN; return state; }

      // Направление засчитывается по ВЗГЛЯДУ, а не по нажатой клавише:
      // важно, что боец действительно повернулся, а не что кнопка нажата.
      const ок = s.dir ? c.facing === s.dir : c.started === s.move;
      if(ок && ++at >= steps.length) state = STATE.WIN;
      return state;
    }
  };
}
