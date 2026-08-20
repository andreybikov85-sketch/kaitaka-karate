// Сборка арены из описания уровня.
//
// Модуль ничего не знает про конкретные залы: он читает данные
// (см. data/levels/) и расставляет по ним пол, стены и предметы.
// Новая арена — это новая запись в данных, а не новый код.

import * as THREE from "three";
import { C } from "./palette.js";
import { PROPS } from "./props.js";
import { tatamiTexture, woodTexture, wallTexture } from "./textures.js";

let current = null;

export function buildArena(scene, level, lights, logo){
  if(current){ scene.remove(current); dispose(current); }

  const g = new THREE.Group();
  const L = level.length, D = level.depth;

  floor(g, level, L, D);
  walls(g, level, L, D);

  for(const p of level.props || []){
    const make = PROPS[p.type];
    if(!make) continue;                      // неизвестный предмет — пропускаем молча
    const o = make({ ...p, logo });
    o.position.set(p.x || 0, p.y || 0, p.z || 0);
    if(p.ry) o.rotation.y = p.ry;
    g.add(o);
  }

  applyLight(scene, level, lights);
  scene.add(g);
  current = g;
  return g;
}

function floor(g, level, L, D){
  // Татами: одна плоскость с повторяющейся текстурой вместо десятков
  // отдельных матов. Меньше объектов — меньше работы для видеокарты,
  // а стыки получаются чётче, чем у составленных вплотную коробок.
  const t = tatamiTexture();
  t.repeat.set(L / 2, D / 2);
  const mat = new THREE.Mesh(
    new THREE.PlaneGeometry(L, D),
    new THREE.MeshStandardMaterial({ map: t, roughness: .96 })
  );
  mat.rotation.x = -Math.PI / 2;
  mat.receiveShadow = true;
  g.add(mat);

  // Дощатый пол по краям татами — граница зоны боя видна и без разметки.
  const w = woodTexture();
  w.repeat.set(L / 2, 2);
  const wm = new THREE.MeshStandardMaterial({ map: w, roughness: .92 });
  for(const s of [-1, 1]){
    const strip = new THREE.Mesh(new THREE.PlaneGeometry(L, 3), wm);
    strip.rotation.x = -Math.PI / 2;
    strip.position.set(0, -0.01, s * (D / 2 + 1.5));
    strip.receiveShadow = true;
    g.add(strip);
  }
}

function walls(g, level, L, D){
  const t = wallTexture();
  t.repeat.set(L / 3, 1.4);
  const wall = new THREE.MeshStandardMaterial({ map: t, roughness: .95 });
  const H = level.wallHeight || 4.2;

  const back = new THREE.Mesh(new THREE.PlaneGeometry(L, H), wall);
  back.position.set(0, H / 2, -(D / 2 + 3));
  back.receiveShadow = true;
  g.add(back);

  // Тёмная панель понизу: об неё читается, где стена встречается с полом.
  const skirt = new THREE.Mesh(
    new THREE.PlaneGeometry(L, 0.5),
    new THREE.MeshStandardMaterial({ color: C.night2, roughness: .9 })
  );
  skirt.position.set(0, 0.25, -(D / 2 + 2.98));
  g.add(skirt);

  // Полоса цвета клуба по верху стены.
  const band = new THREE.Mesh(
    new THREE.PlaneGeometry(L, 0.28),
    new THREE.MeshStandardMaterial({ color: C.club, roughness: .8 })
  );
  band.position.set(0, H - 0.5, -(D / 2 + 2.98));
  g.add(band);
}

function applyLight(scene, level, lights){
  const l = level.light || {};
  scene.background = new THREE.Color(l.bg !== undefined ? l.bg : C.night);
  scene.fog = new THREE.Fog(l.bg !== undefined ? l.bg : C.night,
                            l.fogNear || 26, l.fogFar || 70);
  if(lights.hemi){
    lights.hemi.color.set(l.sky || 0xbcd0e8);
    lights.hemi.groundColor.set(l.ground || C.tatami);
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
