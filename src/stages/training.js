// Этап «тренировка на макиварах».
//
// Сэнсэй объясняет задание, потом идёт отсчёт: обойти снаряды и набить
// на каждом нужное число ударов, пока не вышло время.
//
// Всё, что можно подкрутить — число снарядов, ударов, время, слова
// сэнсэя, — лежит в данных уровня (data/levels/). Здесь только правила.

import * as THREE from "three";

export const STATE = { BRIEF: "brief", PLAY: "play", WIN: "win", LOSE: "lose" };

export function makeTraining(level, targets, ui, scene){
  const t = level.task;
  const need = t.hits;
  const count = level.targets.length;

  const hits = new Array(count).fill(0);
  const shake = new Array(count).fill(0);
  const lastStrike = new Array(count).fill(-1);

  // Круг досягаемости под каждым снарядом.
  //
  // Без него непонятно, достанешь ты отсюда или нет: ребёнок бьёт,
  // ничего не происходит, и он не знает, подойти ближе или он уже бьёт
  // мимо. Круг отвечает на этот вопрос до удара, а не после.
  const rings = [];
  if(scene){
    for(let i = 0; i < count; i++){
      const g = new THREE.RingGeometry(t.reach - 0.07, t.reach, 40);
      const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({
        color: 0xffffff, transparent: true, opacity: 0.18,
        depthWrite: false, side: THREE.DoubleSide
      }));
      m.rotation.x = -Math.PI / 2;
      m.position.set(level.targets[i].x, 0.02, level.targets[i].z);
      scene.add(m);
      rings.push(m);
    }
  }

  let state = STATE.BRIEF;
  let left = t.seconds;

  const p = new THREE.Vector3();

  return {
    get state(){ return state; },
    get left(){ return left; },
    hits,

    // Сэнсэй договорил — пошёл отсчёт.
    begin(){
      if(state !== STATE.BRIEF) return;
      state = STATE.PLAY;
      left = t.seconds;
      ui.showTask(hits, need, left);
    },

    update(dt, hero){
      // Снаряды качаются после удара независимо от состояния этапа —
      // иначе последний удар замер бы на месте.
      for(let i = 0; i < count; i++){
        if(shake[i] > 0){
          shake[i] = Math.max(0, shake[i] - dt * 4);
          const o = targets[i];
          if(o) o.rotation.z = Math.sin(shake[i] * 34) * shake[i] * 0.22;
        }
      }

      // Круг горит, когда снаряд в пределах удара. Добитый гаснет
      // совсем — по залу сразу видно, что осталось.
      if(rings.length && hero){
        const h = hero.object.position;
        for(let i = 0; i < count; i++){
          const done = hits[i] >= need;
          const near = Math.hypot(h.x - level.targets[i].x, h.z - level.targets[i].z) <= t.reach;
          const m = rings[i].material;
          m.opacity = done ? 0.06 : (near ? 0.62 : 0.18);
          m.color.set(done ? 0x6f7a86 : (near ? 0xe8b647 : 0xffffff));
        }
      }

      if(state !== STATE.PLAY) return;

      left -= dt;
      if(left <= 0){
        left = 0;
        state = STATE.LOSE;
        ui.finish(false, t.lose, hits, need);
        return;
      }

      // Попадание. Удар засчитывается один раз: у каждого свой номер,
      // и цель помнит, какой номер она уже приняла. Иначе за те несколько
      // кадров, что длится фаза выпада, набежало бы сразу пять ударов.
      const s = hero.strikeNow();
      if(s){
        for(let i = 0; i < count; i++){
          if(hits[i] >= need || lastStrike[i] === s.id) continue;
          const o = targets[i];
          if(!o) continue;
          o.getWorldPosition(p);
          // Меряем по горизонтали: удар в корпус макивары засчитывается
          // и когда бьёшь ногой снизу, и когда рукой сверху.
          const d = Math.hypot(s.point.x - p.x, s.point.z - p.z);
          if(d > t.reach) continue;

          lastStrike[i] = s.id;
          hits[i]++;
          shake[i] = 1;
          ui.showTask(hits, need, left);
          break;                           // один удар — одна цель
        }
      }

      ui.tick(left);

      if(hits.every(h => h >= need)){
        state = STATE.WIN;
        ui.finish(true, t.win, hits, need);
      }
    }
  };
}
