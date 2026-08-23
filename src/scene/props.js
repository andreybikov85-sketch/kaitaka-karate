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
import { woodTexture, strawTexture, muralTexture } from "./textures.js";

let wood = null, straw = null, mural = null;
const woodTex  = () => (wood  ||= woodTexture());
const strawTex = () => (straw ||= strawTexture());
const muralTex = () => (mural ||= muralTexture());

const mat = (color, rough = 0.9) =>
  new THREE.MeshStandardMaterial({ color, roughness: rough });

function box(w, h, d, material, x = 0, y = 0, z = 0){
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

// Сузить коробку кверху: у настоящей макивары доска толстая у пола
// и тонкая наверху — потому она и пружинит от удара, а не стоит колом.
function taper(geom, topScale, h){
  const p = geom.attributes.position;
  for(let i = 0; i < p.count; i++){
    const y = p.getY(i);
    const k = (y + h / 2) / h;
    const s = 1 + (topScale - 1) * k;
    p.setX(i, p.getX(i) * s);
    p.setZ(i, p.getZ(i) * s);
  }
  p.needsUpdate = true;
  geom.computeVertexNormals();
  return geom;
}

/* ---- Колонна: обшитый тёмной доской столб от пола до потолка ---- */
// Главная примета зала КАЙТАКА. Их две посреди татами, и они видны
// с любой точки — без них зал не узнать.

function column(o){
  const g = new THREE.Group();
  const h = o.h || 2.9, w = o.w || 0.46;

  const t = woodTex().clone(); t.needsUpdate = true; t.repeat.set(1, 6);
  const face = new THREE.MeshStandardMaterial({ map: t, roughness: .88 });
  const post = box(w, h, w, face, 0, h / 2, 0);
  g.add(post);

  // Тёмная и светлая грани: без разницы по сторонам столб выглядит плоским.
  g.add(box(w * 1.02, h, 0.01, mat(C.woodDark, .9), 0, h / 2, -w / 2));
  g.add(box(0.01, h, w * 1.02, mat(C.woodLight, .85), w / 2, h / 2, 0));

  // Обвязка понизу и поверху — доски прибиты не встык.
  g.add(box(w * 1.08, 0.07, w * 1.08, mat(C.woodDark, .9), 0, 0.05, 0));
  g.add(box(w * 1.08, 0.07, w * 1.08, mat(C.woodDark, .9), 0, h - 0.05, 0));
  return g;
}

/* ---- Радиатор под окном ---- */

function radiator(o){
  const g = new THREE.Group();
  const n = o.n || 10, w = 0.055;
  const m = mat(C.metal, .5);
  for(let i = 0; i < n; i++) g.add(box(w * 0.8, 0.52, 0.09, m, (i - (n - 1) / 2) * w, 0.30, 0));
  g.add(box(n * w, 0.03, 0.10, m, 0, 0.56, 0));
  g.add(box(n * w, 0.03, 0.10, m, 0, 0.05, 0));
  return g;
}

/* ---- Окно: маленькое и высоко, как в полуподвале ---- */

function window_(o){
  const g = new THREE.Group();
  const w = o.w || 0.95, h = o.h || 0.72;

  const glass = new THREE.Mesh(
    new THREE.PlaneGeometry(w, h),
    new THREE.MeshBasicMaterial({ color: 0xdCEBFA })
  );
  g.add(glass);

  const f = mat(C.metal, .45);
  g.add(box(w + 0.10, 0.07, 0.09, f, 0,  h / 2, 0.02));
  g.add(box(w + 0.10, 0.07, 0.09, f, 0, -h / 2, 0.02));
  g.add(box(0.055, h, 0.09, f, 0, 0, 0.02));
  // Откосы: стена толстая, проём утоплен.
  g.add(box(w + 0.24, 0.09, 0.18, mat(C.wall, .95), 0, h / 2 + 0.07, -0.06));
  return g;
}

/* ---- Полотно с эмблемой клуба на фронтальной стене ---- */

function banner(o){
  const g = new THREE.Group();
  const h = o.h || 1.55, w = o.w || 4.4;

  const cloth = new THREE.Mesh(
    new THREE.PlaneGeometry(w, h),
    new THREE.MeshStandardMaterial({ color: 0xf7f7f5, roughness: .95, side: THREE.DoubleSide })
  );
  cloth.receiveShadow = true;
  g.add(cloth);

  if(o.logo){
    const s = h * 0.78;
    const em = new THREE.Mesh(
      new THREE.PlaneGeometry(s, s),
      new THREE.MeshBasicMaterial({ map: o.logo, transparent: true })
    );
    em.position.z = 0.012;
    g.add(em);
  }
  return g;
}

/* ---- Роспись во всю стену ---- */

function muralWall(o){
  const w = o.w || 7.5, h = o.h || 2.2;
  const m = new THREE.Mesh(
    new THREE.PlaneGeometry(w, h),
    new THREE.MeshStandardMaterial({ map: muralTex(), roughness: .96 })
  );
  m.receiveShadow = true;
  return m;
}

/* ---- Дверь ---- */

function door(o){
  const g = new THREE.Group();
  const w = o.w || 0.85, h = o.h || 2.0;
  const t = woodTex().clone(); t.needsUpdate = true; t.repeat.set(1, 3);
  g.add(box(w, h, 0.07, new THREE.MeshStandardMaterial({ map: t, roughness: .8 }), 0, h / 2, 0));
  g.add(box(w + 0.09, 0.06, 0.10, mat(C.woodDark, .85), 0, h + 0.02, 0));
  return g;
}

/* ---- Макивара ---- */

function makiwara(o){
  const g = new THREE.Group();
  const H = 1.72;

  const wt = woodTex().clone(); wt.needsUpdate = true; wt.repeat.set(1, 4);
  const post = new THREE.Mesh(
    taper(new THREE.BoxGeometry(0.19, H, 0.085), 0.55, H),
    new THREE.MeshStandardMaterial({ map: wt, roughness: .92 })
  );
  post.position.y = H / 2;
  post.castShadow = true; post.receiveShadow = true;
  g.add(post);

  const st = strawTex().clone(); st.needsUpdate = true;
  const pad = new THREE.Mesh(
    new THREE.BoxGeometry(0.24, 0.42, 0.13),
    new THREE.MeshStandardMaterial({ map: st, roughness: .98 })
  );
  pad.position.set(0, H - 0.24, 0.05);
  pad.castShadow = true;
  g.add(pad);

  // Витки верёвки разного размера и повёрнутые вразнобой — ровный ряд
  // выглядит как деталь от машины, а не как связано руками.
  const ropeMat = new THREE.MeshStandardMaterial({ color: 0xb99a5e, roughness: .95 });
  for(let i = 0; i < 5; i++){
    const r = new THREE.Mesh(new THREE.TorusGeometry(0.14 + (i % 2) * 0.004, 0.012, 5, 12), ropeMat);
    r.position.set(0, H - 0.40 + i * 0.085, 0.05);
    r.rotation.set(Math.PI / 2, 0, (Math.random() - 0.5) * 0.12);
    r.scale.set(1, 0.62, 1);
    r.castShadow = true;
    g.add(r);
  }

  g.add(box(0.42, 0.12, 0.34, mat(C.wood, .9), 0, 0.06, 0));
  g.add(box(0.50, 0.05, 0.42, mat(C.woodDark, .95), 0, 0.02, 0));
  for(const s of [-1, 1]){
    const wedge = box(0.06, 0.22, 0.12, mat(C.wood, .9), s * 0.11, 0.16, 0);
    wedge.rotation.z = s * 0.22;
    g.add(wedge);
  }
  g.add(box(0.26, 0.012, 0.005, mat(C.kyoku, .6), 0, H - 0.24, 0.118));
  return g;
}

/* ---- Тяжёлый мешок на кронштейне ---- */

function bag(o){
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.20, 0.23, 1.15, 14), mat(C.woodDark, .8));
  body.position.y = 0.95;
  body.castShadow = true;
  g.add(body);
  g.add(box(0.44, 0.04, 0.44, mat(C.metal, .5), 0, 1.55, 0));
  const chain = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.7, 6), mat(C.metal, .4));
  chain.position.y = 1.9;
  g.add(chain);
  g.add(box(0.38, 0.06, 0.20, mat(C.kyoku, .7), 0, 1.28, 0));
  return g;
}

/* ---- Стойка с поясами ---- */

function beltRack(o){
  const g = new THREE.Group();
  const belts = o.belts || [];
  g.add(box(1.6, 0.06, 0.10, mat(C.wood, .85), 0, 0, 0));
  belts.forEach((c, i) => {
    const x = -0.68 + i * (1.36 / Math.max(1, belts.length - 1));
    g.add(box(0.09, 0.44, 0.045, mat(c, .85), x, -0.25, 0.02));
  });
  return g;
}

export const PROPS = {
  column, radiator, window: window_, banner, mural: muralWall,
  door, makiwara, bag, beltRack
};
