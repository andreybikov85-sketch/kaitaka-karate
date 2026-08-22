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
import { woodTexture, strawTexture } from "./textures.js";

let wood = null, straw = null;
const woodTex  = () => (wood  ||= woodTexture());
const strawTex = () => (straw ||= strawTexture());

// Сузить коробку кверху: у настоящей макивары доска толстая у пола
// и тонкая наверху — потому она и пружинит от удара, а не стоит колом.
// Прямоугольный столб этого не передаёт совсем.
function taper(geom, topScale, h){
  const p = geom.attributes.position;
  for(let i = 0; i < p.count; i++){
    const y = p.getY(i);
    const k = (y + h / 2) / h;                       // 0 у пола, 1 наверху
    const s = 1 + (topScale - 1) * k;
    p.setX(i, p.getX(i) * s);
    p.setZ(i, p.getZ(i) * s);
  }
  p.needsUpdate = true;
  geom.computeVertexNormals();
  return geom;
}

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
  const H = 1.72;              // высота доски, бьют примерно в грудь

  // Доска: широкая и толстая внизу, тонкая наверху. Именно поэтому
  // макивара пружинит — и именно это делает её узнаваемой.
  const wt = woodTex().clone(); wt.needsUpdate = true; wt.repeat.set(1, 4);
  const post = new THREE.Mesh(
    taper(new THREE.BoxGeometry(0.19, H, 0.085), 0.55, H),
    new THREE.MeshStandardMaterial({ map: wt, roughness: .92 })
  );
  post.position.y = H / 2;
  post.castShadow = true; post.receiveShadow = true;
  g.add(post);

  // Соломенная подушка — по ней и бьют.
  const st = strawTex().clone(); st.needsUpdate = true; st.repeat.set(1, 1);
  const pad = new THREE.Mesh(
    new THREE.BoxGeometry(0.24, 0.42, 0.13),
    new THREE.MeshStandardMaterial({ map: st, roughness: .98 })
  );
  pad.position.set(0, H - 0.24, 0.05);
  pad.castShadow = true;
  g.add(pad);

  // Обмотка верёвкой: витки держат солому. Кольца слегка разного
  // размера и повёрнуты вразнобой — ровный ряд выглядит как деталь
  // от машины, а не как связано руками.
  const ropeMat = new THREE.MeshStandardMaterial({ color: 0xb99a5e, roughness: .95 });
  for(let i = 0; i < 5; i++){
    const r = new THREE.Mesh(
      new THREE.TorusGeometry(0.14 + (i % 2) * 0.004, 0.012, 5, 12),
      ropeMat
    );
    r.position.set(0, H - 0.40 + i * 0.085, 0.05);
    r.rotation.set(Math.PI / 2, 0, (Math.random() - 0.5) * 0.12);
    r.scale.set(1, 0.62, 1);          // доска плоская, витки овальные
    r.castShadow = true;
    g.add(r);
  }

  // Основание: брус, в который доска вставлена, и клинья по бокам.
  g.add(box(0.42, 0.12, 0.34, mat(C.wood, .9), 0, 0.06, 0));
  g.add(box(0.50, 0.05, 0.42, mat(C.night2, .95), 0, 0.02, 0));
  for(const s of [-1, 1]){
    const wedge = box(0.06, 0.22, 0.12, mat(C.wood, .9), s * 0.11, 0.16, 0);
    wedge.rotation.z = s * 0.22;
    g.add(wedge);
  }

  // Метка на уровне удара — по ней целятся.
  g.add(box(0.26, 0.012, 0.005, mat(C.kyoku, .6), 0, H - 0.24, 0.118));
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
