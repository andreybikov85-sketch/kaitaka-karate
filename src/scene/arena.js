// Сборка арены из описания уровня.
//
// Модуль ничего не знает про конкретные залы: он читает данные
// (см. data/levels/) и расставляет по ним пол, стены и предметы.
// Новая арена — это новая запись в данных, а не новый код.

import * as THREE from "three";
import { C } from "./palette.js";
import { PROPS } from "./props.js";
import { matTexture, woodTexture, wallTexture } from "./textures.js";

let current = null;

export function buildArena(scene, level, lights, logo){
  if(current){ scene.remove(current); dispose(current); }

  const g = new THREE.Group();
  const L = level.length, D = level.depth, H = level.wallHeight || 2.9;

  floor(g, L, D);
  walls(g, L, D, H);
  ceiling(g, L, D, H);

  const targets = [];
  for(const p of level.props || []){
    const make = PROPS[p.type];
    if(!make) continue;                      // неизвестный предмет — пропускаем молча
    const o = make({ ...p, logo });
    o.position.set(p.x || 0, p.y || 0, p.z || 0);
    if(p.ry) o.rotation.y = p.ry;
    if(p.rx) o.rotation.x = p.rx;
    g.add(o);
    if(p.target !== undefined) targets[p.target] = o;
  }

  applyLight(scene, level, lights);
  scene.add(g);
  current = g;
  g.userData.targets = targets;
  return g;
}

function floor(g, L, D){
  // Пазловые маты одной плоскостью с повторяющейся текстурой: один повтор —
  // один мат метр на метр. Десятки отдельных матов дали бы то же самое,
  // но стоили бы видеокарте в сотню раз дороже.
  const t = matTexture();
  t.repeat.set(L, D);
  const m = new THREE.Mesh(
    new THREE.PlaneGeometry(L, D),
    new THREE.MeshStandardMaterial({ map: t, roughness: .82 })
  );
  m.rotation.x = -Math.PI / 2;
  m.receiveShadow = true;
  g.add(m);
}

function walls(g, L, D, H){
  const t = wallTexture();
  t.repeat.set(L / 2.5, H / 2.5);

  // Стены видны ТОЛЬКО изнутри — как и потолок.
  //
  // Зал маленький, и камера сбоку неизбежно оказывается за ближней стеной.
  // Была бы стена двусторонней, она бы загородила весь зал: игрок смотрел
  // бы в затылок штукатурке. Односторонняя стена для камеры снаружи просто
  // исчезает, и зал виден как в разрезе.
  const wall = new THREE.MeshStandardMaterial({ map: t, roughness: .96, side: THREE.FrontSide });

  const put = (w, x, z, ry) => {
    const p = new THREE.Mesh(new THREE.PlaneGeometry(w, H), wall);
    p.position.set(x, H / 2, z);
    p.rotation.y = ry;
    p.receiveShadow = true;
    g.add(p);
    return p;
  };
  put(L, 0, -D / 2, 0);            // дальняя
  put(L, 0,  D / 2, Math.PI);      // ближняя, к камере
  put(D, -L / 2, 0,  Math.PI / 2); // левая
  put(D,  L / 2, 0, -Math.PI / 2); // правая

  // Тёмный деревянный плинтус по всему периметру — он на фото заметный
  // и держит низ стены, иначе она «висит» над матами.
  const wt = woodTexture();
  wt.repeat.set(L / 2, 1);
  const skirt = new THREE.MeshStandardMaterial({ map: wt, roughness: .85 });
  const sk = (w, x, z, ry) => {
    const p = new THREE.Mesh(new THREE.PlaneGeometry(w, 0.16), skirt);
    p.position.set(x, 0.08, z);
    p.rotation.y = ry;
    g.add(p);
  };
  skirt.side = THREE.FrontSide;      // вместе со стеной
  sk(L, 0, -D / 2 + 0.01, 0);
  sk(L, 0,  D / 2 - 0.01, Math.PI);
  sk(D, -L / 2 + 0.01, 0,  Math.PI / 2);
  sk(D,  L / 2 - 0.01, 0, -Math.PI / 2);
}

function ceiling(g, L, D, H){
  // Потолок односторонний: видно снизу, а сверху его как бы нет.
  // Так вид сбоку смотрит в зал как в разрез, а вид из-за спины —
  // из-под потолка, и зал ощущается помещением, а не полем со стенами.
  const m = new THREE.Mesh(
    new THREE.PlaneGeometry(L, D),
    new THREE.MeshStandardMaterial({ color: C.ceiling, roughness: .9, side: THREE.FrontSide })
  );
  m.rotation.x = Math.PI / 2;
  m.position.y = H;
  g.add(m);
}

function applyLight(scene, level, lights){
  const l = level.light || {};
  scene.background = new THREE.Color(l.bg !== undefined ? l.bg : C.night);
  scene.fog = new THREE.Fog(l.bg !== undefined ? l.bg : C.night,
                            l.fogNear || 26, l.fogFar || 70);
  if(lights.hemi){
    lights.hemi.color.set(l.sky || 0xbcd0e8);
    lights.hemi.groundColor.set(l.ground || C.mat);
    lights.hemi.intensity = l.ambient !== undefined ? l.ambient : 1.1;
  }
  if(lights.sun){
    lights.sun.color.set(l.sun || 0xfff2dd);
    lights.sun.intensity = l.sunPower !== undefined ? l.sunPower : 2.0;
    if(l.sunPos) lights.sun.position.set(...l.sunPos);
  }
}

// Освобождаем видеопамять: сцены меняются между уровнями, и без этого
// геометрия старых залов копилась бы до конца игры.
function dispose(root){
  root.traverse(o => {
    if(o.geometry) o.geometry.dispose();
    if(o.material) for(const m of [].concat(o.material)){
      if(m.map) m.map.dispose();
      m.dispose();
    }
  });
}
