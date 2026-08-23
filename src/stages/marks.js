// Круги на полу — разметка заданий.
//
// Один и тот же знак во всех этапах: круг под снарядом, круг у старта,
// круг у дальнего края. Ребёнок должен один раз понять, что круг значит
// «сюда», и дальше узнавать его везде, а не разбираться заново.
//
// Цвет говорит о состоянии:
//   бледный  — точка есть, но сейчас не она
//   золотой  — сейчас надо сюда, и ты уже внутри
//   красный  — сюда надо, но ты ещё далеко
//   серый    — с этой точкой покончено

import * as THREE from "three";

const COLOR = {
  idle:   { c: 0xffffff, o: 0.16 },
  target: { c: 0xc1272d, o: 0.45 },
  active: { c: 0xe8b647, o: 0.62 },
  done:   { c: 0x6f7a86, o: 0.07 }
};

export function makeMarks(scene, points, radius){
  const rings = [];
  if(scene){
    for(const p of points){
      const m = new THREE.Mesh(
        new THREE.RingGeometry(Math.max(0.05, radius - 0.07), radius, 44),
        new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false,
                                      side: THREE.DoubleSide })
      );
      m.rotation.x = -Math.PI / 2;
      m.position.set(p.x, 0.02, p.z);
      scene.add(m);
      rings.push(m);
    }
  }

  return {
    set(i, state){
      const r = rings[i];
      if(!r) return;
      const c = COLOR[state] || COLOR.idle;
      r.material.color.set(c.c);
      r.material.opacity = c.o;
    },
    // Круг цели слегка дышит — так он читается как «иди сюда»,
    // а не как пятно на полу.
    pulse(i, t){
      const r = rings[i];
      if(r) r.scale.setScalar(1 + Math.sin(t * 4) * 0.05);
    },
    reset(i){ if(rings[i]) rings[i].scale.setScalar(1); },
    dispose(){ for(const r of rings) r.parent && r.parent.remove(r); }
  };
}
