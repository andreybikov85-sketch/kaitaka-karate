// ВРЕМЕННАЯ фигура из коробок.
//
// Живёт до этапа 1, пока не приедут модели с Mixamo. Нужна ровно для того,
// чтобы было видно движение, тени и выбор персонажа.
//
// Одно требование отсюда переезжает в настоящие модели:
// ПОЯС — ОТДЕЛЬНЫЙ ОБЪЕКТ. За игру он меняет цвет четырнадцать раз, от белого
// 0 кю до чёрного 3 дана. Если пояс запечён в текстуру кимоно, перекрасить
// его не выйдет и модель придётся заказывать заново.

import * as THREE from "three";
import { C } from "../scene/palette.js";

export function makePlaceholder(hero, beltColor){
  const g = new THREE.Group();
  const girl = hero === "girl";

  const add = (w, h, d, color, y, x = 0, z = 0) => {
    const m = new THREE.Mesh(
      new THREE.BoxGeometry(w, h, d),
      new THREE.MeshStandardMaterial({ color, roughness: 0.8 })
    );
    m.position.set(x, y, z);
    m.castShadow = true;
    g.add(m);
    return m;
  };

  // Корпус и голова
  add(girl ? 0.56 : 0.62, 0.75, 0.34, C.gi, 1.22);
  const belt = add(girl ? 0.60 : 0.66, 0.10, 0.38, beltColor, 0.88);
  add(0.34, 0.34, 0.32, C.skin, 1.78);
  add(0.36, 0.12, 0.34, C.hair, 1.92);

  // Единственное различие персонажей, пока нет моделей: причёска.
  if(girl) add(0.30, 0.34, 0.14, C.hair, 1.74, 0, -0.20);   // хвост сзади

  const armL = add(0.16, 0.52, 0.16, C.gi, 1.22, girl ? -0.37 : -0.40);
  const armR = add(0.16, 0.52, 0.16, C.gi, 1.22, girl ?  0.37 :  0.40);
  const legL = add(0.22, 0.85, 0.22, C.gi, 0.43, -0.16);
  const legR = add(0.22, 0.85, 0.22, C.gi, 0.43,  0.16);

  // Пояс отдаём наружу, чтобы менять цвет при получении нового ранга.
  g.userData = { belt, limbs: { armL, armR, legL, legR } };
  return g;
}

// Смена цвета пояса — вызывается на вручении.
export function setBeltColor(fig, color){
  fig.userData.belt.material.color.set(color);
}

// Походка: руки и ноги качаются в противофазе.
export function animateWalk(fig, t, moving){
  const { armL, armR, legL, legR } = fig.userData.limbs;
  if(moving){
    const s = Math.sin(t) * 0.5;
    legL.rotation.x =  s; legR.rotation.x = -s;
    armL.rotation.x = -s; armR.rotation.x =  s;
  } else {
    for(const p of [legL, legR, armL, armR]) p.rotation.x *= 0.8;
  }
}
