// Этап «челнок»: добежать до края зала, отработать упражнение, вернуться.
//
// Три круга подряд — приседания, прыжки, отжимания. Задание простое,
// но именно оно ставит дыхание и учит пользоваться бегом.

import { STATE } from "./state.js";

export function makeShuttle(task, ctx){
  const { level } = ctx;
  const far  = { x:  level.length / 2 - 2.5, z: 0 };
  const home = { x: -level.length / 2 + 2.5, z: 0 };

  let round = 0;                 // какой круг идёт
  let phase = "go";              // go | work | back
  let reps  = 0;
  let left  = task.seconds;
  let state = STATE.PLAY;
  let wasMove = null;            // что боец делал в прошлом кадре

  const цель = () => phase === "back" ? home : far;

  function подсказка(){
    const r = task.rounds[round];
    if(phase === "go")   return "БЕГИ НА ДАЛЬНИЙ КРАЙ";
    if(phase === "work") return r.label;
    return "ВОЗВРАЩАЙСЯ";
  }

  return {
    get state(){ return state; },
    get left(){ return left; },
    get mark(){ return phase === "work" ? null : цель(); },

    hud(){
      const r = task.rounds[round];
      return {
        text: подсказка(),
        // Полосок столько, сколько кругов: видно, сколько ещё осталось.
        cells: task.rounds.map((rr, i) =>
          i < round ? 1 : (i > round ? 0 : (phase === "work" ? reps / rr.reps : 0))),
        note: phase === "work" ? reps + " / " + r.reps : (round + 1) + " из " + task.rounds.length
      };
    },

    update(dt, c){
      if(state !== STATE.PLAY) return state;

      left -= dt;
      if(left <= 0){ left = 0; state = STATE.LOSE; return state; }

      const r = task.rounds[round];
      const p = c.hero.object.position;

      if(phase === "go" || phase === "back"){
        const t = цель();
        if(Math.hypot(p.x - t.x, p.z - t.z) <= task.reach){
          if(phase === "go"){ phase = "work"; reps = 0; }
          else {
            // Круг закрыт — следующий или конец.
            if(++round >= task.rounds.length){ state = STATE.WIN; return state; }
            phase = "go";
          }
        }
        return state;
      }

      // Считаем повторы: упражнение засчитывается, когда доиграло до конца.
      // По началу считать нельзя — тогда можно было бы дёргать кнопку,
      // не доводя движение.
      if(wasMove === r.move && c.hero.move === null){
        if(++reps >= r.reps) phase = "back";
      }
      wasMove = c.hero.move;
      return state;
    }
  };
}
