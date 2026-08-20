// Библиотека объектов окружения.
//
// Каждая запись — функция, собирающая один предмет из простых форм.
// Уровень их только перечисляет (см. data/levels/), поэтому новая арена
// добавляется данными, а не кодом.
//
// Все цвета берутся из палитры. Задавать цвет прямо здесь нельзя —
// иначе зал перестанет перекрашиваться из одного места.

import * as THREE from "three";
import { C } from "./palette.js";
import { woodTexture } from "./textures.js";

let wood = null;
const woodTex = () => (wood ||= woodTexture());

const mat = (color, rough = 0.9) =>
  new THREE.MeshStandardMaterial({ color, roughness: rough });

function box(w, h, d, material, x = 0, y = 0, z = 0){
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

/* ---- Макивара: столб с набивкой, по которому отрабатывают удары ---- */

function makiwara(o){
  const g = new THREE.Group();
  const t = woodTex().clone(); t.needsUpdate = true; t.repeat.set(1, 3);
  g.add(box(0.16, 1.9, 0.16, new THREE.MeshStandardMaterial({ map: t, roughness: .95 }), 0, 0.95, 0));
  g.add(box(0.30, 0.46, 0.14, mat(C.wood, .8), 0, 1.62, 0.06));   // набивка
  g.add(box(0.34, 0.06, 0.18, mat(C.kyoku, .7), 0, 1.86, 0.06));  // обмотка
  g.add(box(0.46, 0.08, 0.46, mat(C.night2, .9), 0, 0.04, 0));    // основание
  return g;
}

/* ---- Тяжёлый мешок на цепи ---- */

function bag(o){
  const g = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.CylinderGeometry(0.24, 0.27, 1.25, 12),
    mat(C.wood, .85)
  );
  body.position.y = 1.02;
  body.castShadow = true;
  g.add(body);
  g.add(box(0.5, 0.05, 0.5, mat(C.night2, .6), 0, 1.68, 0));
  const chain = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.7, 6), mat(C.night2, .5));
  chain.position.y = 2.02;
  g.add(chain);
  g.add(box(0.42, 0.07, 0.22, mat(C.kyoku, .7), 0, 1.42, 0));     // красная лента
  return g;
}

/* ---- Знамя клуба с эмблемой КАЙТАКА ---- */

function banner(o){
  const g = new THREE.Group();
  const h = o.h || 2.2, w = o.w || 1.5;

  g.add(box(w + 0.24, 0.09, 0.09, mat(C.wood, .8), 0, h / 2 + 0.05, 0));

  const cloth = new THREE.Mesh(
    new THREE.PlaneGeometry(w, h),
    new THREE.MeshStandardMaterial({ color: C.gi, roughness: .95, side: THREE.DoubleSide })
  );
  cloth.receiveShadow = true;
  g.add(cloth);

  // Эмблема — единственная растровая картинка в проекте: настоящий
  // логотип клуба, его не нарисуешь кодом.
  if(o.logo){
    const em = new THREE.Mesh(
      new THREE.PlaneGeometry(w * 0.78, w * 0.78),
      new THREE.MeshBasicMaterial({ map: o.logo, transparent: true })
    );
    em.position.set(0, h * 0.12, 0.012);
    g.add(em);
  }

  g.add(box(w + 0.1, 0.05, 0.05, mat(C.club, .8), 0, -h / 2 - 0.02, 0));
  return g;
}

/* ---- Окно: проём со светом и рамой ---- */

function window_(o){
  const g = new THREE.Group();
  const w = o.w || 1.6, h = o.h || 1.3;

  const glass = new THREE.Mesh(
    new THREE.PlaneGeometry(w, h),
    new THREE.MeshBasicMaterial({ color: 0xdfeaf5 })
  );
  g.add(glass);

  const frame = mat(C.wood, .85);
  g.add(box(w + 0.14, 0.09, 0.1, frame, 0,  h / 2, 0.02));
  g.add(box(w + 0.14, 0.09, 0.1, frame, 0, -h / 2, 0.02));
  g.add(box(0.08, h, 0.1, frame, 0, 0, 0.02));
  for(let i = 1; i <= 2; i++) g.add(box(w, 0.05, 0.08, frame, 0, -h / 2 + i * h / 3, 0.02));
  return g;
}

/* ---- Скамья вдоль стены ---- */

function bench(o){
  const g = new THREE.Group();
  const len = o.len || 2.4;
  const t = woodTex().clone(); t.needsUpdate = true; t.repeat.set(len / 2, 1);
  g.add(box(len, 0.08, 0.36, new THREE.MeshStandardMaterial({ map: t, roughness: .9 }), 0, 0.42, 0));
  for(const s of [-1, 1]) g.add(box(0.09, 0.42, 0.3, mat(C.night2, .9), s * (len / 2 - 0.2), 0.21, 0));
  return g;
}

/* ---- Потолочная балка поперёк зала ---- */

function beam(o){
  const t = woodTex().clone(); t.needsUpdate = true; t.repeat.set(4, 1);
  return box(0.22, 0.26, o.len || 15,
    new THREE.MeshStandardMaterial({ map: t, roughness: .95 }), 0, 0, 0);
}

/* ---- Стойка с поясами: цветные полосы на планке ---- */

function beltRack(o){
  const g = new THREE.Group();
  const belts = o.belts || [];
  g.add(box(1.7, 0.07, 0.12, mat(C.wood, .85), 0, 0, 0));
  belts.forEach((c, i) => {
    const x = -0.72 + i * (1.44 / Math.max(1, belts.length - 1));
    g.add(box(0.1, 0.5, 0.05, mat(c, .85), x, -0.28, 0.02));
  });
  return g;
}

export const PROPS = { makiwara, bag, banner, window: window_, bench, beam, beltRack };
