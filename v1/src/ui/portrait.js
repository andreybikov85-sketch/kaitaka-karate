// Портрет персонажа для экранов — снимается с самой модели.
//
// Отдельной картинки не заводим: она разъехалась бы с моделью при первой
// же замене. Здесь голова один раз рендерится в маленький холст, и
// портрет всегда совпадает с тем, кто ходит по залу.

import * as THREE from "three";
import { C } from "../scene/palette.js";

export function renderPortrait(ch, size = 320){
  let head = null;
  ch.root.traverse(o => {
    if(o.isBone && !head && /Head$/.test(o.name.replace(/^mixamorig:?/, ""))) head = o;
  });
  if(!head) return null;

  ch.root.updateMatrixWorld(true);
  const hp = new THREE.Vector3();
  head.getWorldPosition(hp);

  const r = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  r.setSize(size, size);
  r.setPixelRatio(1);
  r.outputColorSpace = THREE.SRGBColorSpace;

  const sc = new THREE.Scene();
  // Свет мягкий и с одной стороны: плоская заливка делает лицо картонным.
  sc.add(new THREE.HemisphereLight(0xffffff, 0x445066, 2.0));
  const key = new THREE.DirectionalLight(0xfff0dc, 2.2);
  key.position.set(-1.2, 1.6, 2.2);
  sc.add(key);

  // Персонаж стоит в сцене — на время съёмки одалживаем его.
  const home = ch.root.parent;
  sc.add(ch.root);

  // Голова смотрит вдоль +Z, камера встаёт перед ней чуть сверху.
  const cam = new THREE.PerspectiveCamera(26, 1, 0.05, 20);
  const d = ch.height * 0.55;
  cam.position.set(hp.x + d * 0.20, hp.y + d * 0.16, hp.z + d);
  cam.lookAt(hp.x, hp.y + ch.height * 0.012, hp.z);

  r.render(sc, cam);
  const url = r.domElement.toDataURL("image/png");

  if(home) home.add(ch.root);          // возвращаем на место
  r.dispose();
  return url;
}
