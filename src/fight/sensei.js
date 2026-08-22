// Сэнсэй: ходит по додзё и даёт задания.
//
// Драться он пока не умеет — его дело выйти, объяснить и наблюдать.
//
// Ходит по кругу, и радиус круга взят не с потолка: клип его шага
// поворачивает корпус на 36 градусов за цикл и проходит около метра
// с четвертью. Если вести его по другой траектории, ноги начнут
// разъезжаться с телом. Поэтому круг считается из самого клипа.

import * as THREE from "three";
import { loadCharacter, loadClip } from "./character.js";

const MODEL = "assets/models/sensei.fbx";
const WALK  = "assets/anims/sensei-walk.json";

// Замерено на клипе: за один цикл сэнсэй поворачивает на столько градусов
// и проходит столько метров. Отсюда радиус круга, по которому он идёт.
const TURN_PER_CYCLE = 36.2 * Math.PI / 180;
const DIST_PER_CYCLE = 1.23;
const CYCLE_SECS     = 1.2;

export async function makeSensei(){
  let ch;
  try {
    ch = await loadCharacter(MODEL);
    if(!ch.rigged) return null;
    await loadClip(ch, "walk", WALK);
  } catch(e){
    return null;                       // сэнсэя нет — уровень обойдётся без него
  }

  const speed  = DIST_PER_CYCLE / CYCLE_SECS;          // м/с, как в клипе
  const rate   = TURN_PER_CYCLE / CYCLE_SECS;          // рад/с
  const radius = speed / rate;

  ch.play("walk");

  let yaw = 0, walking = true;
  const centre = new THREE.Vector3();

  return {
    object: ch.root,
    radius,

    // Поставить на круг: центр и начальный угол.
    place(x, z, startYaw = 0){
      centre.set(x, 0, z);
      yaw = startYaw;
      this.step(0);
    },

    // Остановить или пустить по кругу.
    setWalking(on){
      walking = on;
      if(!on) ch.mixer.timeScale = 0; else ch.mixer.timeScale = 1;
    },

    step(dt){
      if(walking) yaw += rate * dt;
      // Идёт по кругу лицом вперёд: положение и разворот связаны,
      // поэтому стопы не проскальзывают.
      ch.root.position.set(
        centre.x + Math.sin(yaw) * radius,
        0,
        centre.z + Math.cos(yaw) * radius
      );
      ch.root.rotation.y = yaw + Math.PI / 2;
      ch.update(dt);
    },

    // Повернуться лицом к точке — когда объясняет задание.
    faceTo(x, z){
      const o = ch.root.position;
      ch.root.rotation.y = Math.atan2(x - o.x, z - o.z);
    }
  };
}
