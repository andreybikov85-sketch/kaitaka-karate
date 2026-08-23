// Этап «макивара»: обойти снаряды и набить на каждом нужное число ударов.

import * as THREE from "three";
import { STATE } from "./state.js";

export function makeMakiwara(task, ctx){
  const { level, targets, scene } = ctx;
  const spots = level.targets;
  const count = spots.length;

  const hits = new Array(count).fill(0);
  const shake = new Array(count).fill(0);
  const lastStrike = new Array(count).fill(-1);

  let left = task.seconds;
  let state = STATE.PLAY;
  const p = new THREE.Vector3();

  // Круг досягаемости под каждым снарядом. Без него непонятно, достанешь
  // отсюда или нет: ребёнок бьёт, ничего не происходит, и он не знает,
  // подойти ближе или он уже мажет. Круг отвечает до удара, а не после.
  const rings = [];
  if(scene){
    for(let i = 0; i < count; i++){
      const m = new THREE.Mesh(
        new THREE.RingGeometry(task.reach - 0.07, task.reach, 40),
        new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true,
                                      opacity: 0.18, depthWrite: false,
                                      side: THREE.DoubleSide })
      );
      m.rotation.x = -Math.PI / 2;
      m.position.set(spots[i].x, 0.02, spots[i].z);
      scene.add(m);
      rings.push(m);
    }
  }

  return {
    get state(){ return state; },
    get left(){ return left; },
    get mark(){ return null; },

    hud(){
      return {
        text: "БЕЙ ПО МАКИВАРАМ",
        cells: hits.map(h => Math.min(1, h / task.hits)),
        note: hits.reduce((a, b) => a + b, 0) + " / " + task.hits * count
      };
    },

    dispose(){ for(const r of rings) r.parent && r.parent.remove(r); },

    update(dt, c){
      // Снаряды качаются независимо от состояния — иначе последний удар
      // замер бы на месте.
      for(let i = 0; i < count; i++){
        if(shake[i] > 0){
          shake[i] = Math.max(0, shake[i] - dt * 4);
          if(targets[i]) targets[i].rotation.z = Math.sin(shake[i] * 34) * shake[i] * 0.22;
        }
      }

      const h = c.hero.object.position;
      for(let i = 0; i < count; i++){
        if(!rings[i]) continue;
        const done = hits[i] >= task.hits;
        const near = Math.hypot(h.x - spots[i].x, h.z - spots[i].z) <= task.reach;
        rings[i].material.opacity = done ? 0.06 : (near ? 0.62 : 0.18);
        rings[i].material.color.set(done ? 0x6f7a86 : (near ? 0xe8b647 : 0xffffff));
      }

      if(state !== STATE.PLAY) return state;

      left -= dt;
      if(left <= 0){ left = 0; state = STATE.LOSE; return state; }

      // Удар засчитывается один раз: у каждого свой номер, и цель помнит
      // принятый. Иначе за несколько кадров фазы выпада набежало бы пять.
      const s = c.hero.strikeNow();
      if(s){
        for(let i = 0; i < count; i++){
          if(hits[i] >= task.hits || lastStrike[i] === s.id) continue;
          if(!targets[i]) continue;
          targets[i].getWorldPosition(p);
          if(Math.hypot(s.point.x - p.x, s.point.z - p.z) > task.reach) continue;
          lastStrike[i] = s.id;
          hits[i]++;
          shake[i] = 1;
          break;                          // один удар — одна цель
        }
      }

      if(hits.every(x => x >= task.hits)) state = STATE.WIN;
      return state;
    }
  };
}
