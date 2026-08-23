// Перемещение бойца: скорость, разгон, бег, прыжок, разворот.
//
// Раньше это жило прямо в главном цикле и было устроено грубо: нажал —
// поехал на полной, отпустил — встал как вкопанный. Отсюда ощущение, что
// боец скользит по полу, а не идёт.
//
// Здесь скорость — состояние, которое разгоняется и тормозит. От неё же
// зависит, какой клип играть и с какой частотой: анимация следует
// за движением, а не наоборот. Поэтому нога не разъезжается с телом
// ни на разгоне, ни на бегу, ни при остановке.
//
// Модуль ничего не знает про клавиши и клипы — ему передают направление,
// он возвращает состояние движения.

import * as THREE from "three";
import { MOTION, AIM } from "./moves.js";

export function makeMotion(object, bounds){
  let vx = 0, vz = 0;          // горизонтальная скорость, м/с
  let vy = 0;                  // вертикальная
  let held = 0;                // сколько держат направление — для перехода на бег
  let face = Math.PI / 2;      // куда смотрит
  let faceTarget = face;
  let aiming = false;          // доворачиваемся к цели — обычное правило не мешает

  const pos = object.position;

  return {
    get speed(){ return Math.hypot(vx, vz); },
    get airborne(){ return pos.y > 0.01; },
    get facing(){ return face; },
    get running(){ return held >= MOTION.runAfter; },

    // Прыжок возможен только с земли: в воздухе второго толчка нет.
    jump(){
      if(pos.y > 0.01) return false;
      vy = MOTION.jump;
      return true;
    },

    // Остановить намертво — на удар, на блок, на конец этапа.
    halt(){ vx = 0; vz = 0; held = 0; },

    // Довернуться к точке. Нужен при ударе: без доворота ребёнок бьёт
    // в пустоту, особенно в виде сбоку, где взгляд заперт влево-вправо,
    // а цель может стоять по глубине.
    faceToward(x, z){
      faceTarget = Math.atan2(x - pos.x, z - pos.z);
      aiming = true;
    },

    // dir: направление в мире, {x, z}, длина 0..1. Ноль — стоять.
    // cfg: { walk, run, lockFacing, frozen }
    update(dt, dir, cfg){
      const len = Math.hypot(dir.x, dir.z);
      const wants = !cfg.frozen && len > 0.01;

      // Долго держат направление — переходим на бег. Отдельной кнопки нет:
      // у ребёнка их и так хватает, а на экране места ещё меньше.
      held = wants ? held + dt : 0;
      const target = (cfg.run && held >= MOTION.runAfter) ? cfg.run : cfg.walk;

      // Разгон к желаемой скорости, торможение — к нулю.
      const wantVx = wants ? (dir.x / len) * target : 0;
      const wantVz = wants ? (dir.z / len) * target : 0;
      const rate = (wants ? MOTION.accel : MOTION.brake) * dt;

      vx = approach(vx, wantVx, rate);
      vz = approach(vz, wantVz, rate);

      // Перенос. По диагонали быстрее не выходит: скорость нормирована выше.
      pos.x += vx * dt;
      pos.z += vz * dt;

      // Прыжок и падение.
      if(pos.y > 0 || vy > 0){
        vy -= MOTION.gravity * dt;
        pos.y += vy * dt;
        if(pos.y <= 0){ pos.y = 0; vy = 0; }
      }

      // Стены зала.
      pos.x = clamp(pos.x, -bounds.x, bounds.x);
      pos.z = clamp(pos.z, -bounds.z, bounds.z);

      // Куда смотреть.
      //
      // lockFacing — взгляд держится влево-вправо и никогда не уходит
      // в глубину. Так устроен вид сбоку: боец не должен поворачиваться
      // спиной к экрану, иначе не видно ни его, ни того, что он делает.
      //
      // Доворот к цели сильнее этого правила: он для того и нужен, чтобы
      // достать снаряд или противника, стоящего по глубине.
      if(!aiming){
        if(wants && !cfg.lockFacing) faceTarget = Math.atan2(dir.x, dir.z);
        else if(wants && cfg.lockFacing && Math.abs(dir.x) > 0.1)
          faceTarget = dir.x > 0 ? Math.PI / 2 : -Math.PI / 2;
      }

      // Плавный разворот по кратчайшей дуге: мгновенный поворот на 180°
      // читается как подмена кадра, а не как движение.
      let d = faceTarget - face;
      while(d >  Math.PI) d -= Math.PI * 2;
      while(d < -Math.PI) d += Math.PI * 2;
      const turnRate = aiming ? AIM.turn : MOTION.turn;
      face += d * (1 - Math.exp(-turnRate * dt));
      object.rotation.y = face;
      if(aiming && Math.abs(d) < 0.05) aiming = false;   // довернулись

      // Идёт ли спиной вперёд — от этого зависит цикл шага.
      const backward = this.speed > 0.05 &&
        (Math.sin(face) * vx + Math.cos(face) * vz) < -0.05;

      return { speed: this.speed, backward, airborne: this.airborne, running: this.running };
    }
  };
}

function approach(v, target, step){
  if(v < target) return Math.min(target, v + step);
  if(v > target) return Math.max(target, v - step);
  return v;
}

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
