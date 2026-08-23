// Этап «челнок»: добежать до края зала, отработать упражнение, вернуться.
//
// Три круга подряд — приседания, прыжки, отжимания. Задание простое,
// но именно оно ставит дыхание и учит пользоваться бегом.
//
// Обе точки размечены кругами на полу, теми же, что у макивар: старт
// и дальний край видно сразу, и не надо гадать, докуда бежать.

import { STATE } from "./state.js";
import { makeMarks } from "./marks.js";

export function makeShuttle(task, ctx){
  const { level, scene } = ctx;
  const HOME = 0, FAR = 1;
  const points = [
    { x: -level.length / 2 + 2.5, z: 0 },   // старт
    { x:  level.length / 2 - 2.5, z: 0 }    // дальний край
  ];
  const marks = makeMarks(scene, points, task.reach);

  let round = 0;                 // какой круг идёт
  let phase = "go";              // go | work | back
  let reps  = 0;
  let left  = task.seconds;
  let state = STATE.PLAY;
  let wasMove = null;            // что боец делал в прошлом кадре
  let t = 0;

  const цельIdx = () => phase === "back" ? HOME : FAR;

  function подсказка(){
    const r = task.rounds[round];
    if(phase === "go")   return "БЕГИ НА ДАЛЬНИЙ КРУГ";
    if(phase === "work") return r.label + " — " + r.reps + " РАЗ";
    return "ВОЗВРАЩАЙСЯ В СВОЙ КРУГ";
  }

  return {
    get state(){ return state; },
    get left(){ return left; },

    dispose(){ marks.dispose(); },

    hud(){
      const r = task.rounds[round];
      return {
        text: подсказка(),
        // Делений столько, сколько кругов: видно, сколько ещё осталось.
        cells: task.rounds.map((rr, i) =>
          i < round ? 1 : (i > round ? 0 : (phase === "work" ? reps / rr.reps : 0))),
        note: phase === "work" ? reps + " / " + r.reps : "круг " + (round + 1) + " из " + task.rounds.length
      };
    },

    update(dt, c){
      t += dt;
      const p = c.hero.object.position;

      // Разметка: где ты и куда надо.
      const цель = цельIdx();
      for(const i of [HOME, FAR]){
        if(i !== цель){ marks.set(i, "idle"); marks.reset(i); continue; }
        const внутри = Math.hypot(p.x - points[i].x, p.z - points[i].z) <= task.reach;
        marks.set(i, phase === "work" ? "active" : (внутри ? "active" : "target"));
        if(внутри) marks.reset(i); else marks.pulse(i, t);
      }

      if(state !== STATE.PLAY) return state;

      left -= dt;
      if(left <= 0){ left = 0; state = STATE.LOSE; return state; }

      const r = task.rounds[round];

      if(phase === "go" || phase === "back"){
        const to = points[цель];
        if(Math.hypot(p.x - to.x, p.z - to.z) <= task.reach){
          if(phase === "go"){ phase = "work"; reps = 0; }
          else {
            if(++round >= task.rounds.length){ state = STATE.WIN; return state; }
            phase = "go";
          }
        }
        return state;
      }

      // Считаем повторы по ОКОНЧАНИЮ движения, а не по началу: иначе
      // можно было бы дёргать кнопку, не доводя присед.
      if(wasMove === r.move && c.hero.move === null){
        if(++reps >= r.reps) phase = "back";
      }
      wasMove = c.hero.move;
      return state;
    }
  };
}
