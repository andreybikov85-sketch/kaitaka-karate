// Сэнсэй: ходит по залу и даёт задания.
//
// Драться он пока не умеет — его дело выйти, объяснить и наблюдать.
//
// ОБХОД ПЕРИМЕТРА. У сэнсэя два клипа ходьбы: прямой шаг и шаг с поворотом
// влево. Поворотный клип уводит корпус на 36 градусов за цикл — то есть
// сам по себе водит по кругу. Развернуть его в прямую линию нельзя:
// пришлось бы докручивать модель против клипа, и стопы поехали бы юзом.
//
// Поэтому маршрут разложен на то, что клипы умеют: прямой отрезок вдоль
// стены — прямым клипом, поворот на углу — поворотным. Прямоугольник
// обходится ровно четырьмя левыми поворотами, и это совпало.
//
// Случайность: длина остановок, где он встанет посмотреть и как надолго.
// Без неё он ходит как заводной и через минуту становится мебелью.

import * as THREE from "three";
import { loadCharacter, loadClip, HEIGHT } from "./character.js";
import { makeRig, poseStand } from "./procedural.js";

const MODEL = "assets/models/sensei.fbx";
const CLIPS = {
  stand: "assets/anims/sensei-stand.json",   // стоит и наблюдает
  walk:  "assets/anims/walk.json",           // прямой шаг
  turn:  "assets/anims/sensei-walk.json"     // шаг с поворотом влево
};

// Замерено на поворотном клипе: за цикл корпус уходит на столько градусов.
const TURN_PER_CYCLE = 36.2 * Math.PI / 180;
const TURN_CYCLE_SECS = 1.2;

const STAND = { min: 2.0, max: 5.0 };   // сколько стоит и смотрит
const GO    = { min: 4.0, max: 9.0 };   // сколько идёт до следующей остановки

const rnd = (a, b) => a + Math.random() * (b - a);

export async function makeSensei(area){
  let ch;
  try {
    ch = await loadCharacter(MODEL, HEIGHT.sensei);
    if(!ch.rigged) return null;
    for(const [name, url] of Object.entries(CLIPS)){
      try { await loadClip(ch, name, url); } catch(e){ /* этого клипа нет */ }
    }
  } catch(e){
    return null;                       // сэнсэя нет — уровень обойдётся без него
  }
  if(!ch.actions.walk) return null;

  // Шаг меряем на самом сэнсэе: он выше ребёнка, и тот же клип проходит
  // у него больше метров.
  const stride = ch.measureStride("walk") || 1.0;
  const turnRate = TURN_PER_CYCLE / TURN_CYCLE_SECS;

  // Поворот идёт по дуге, и её радиус задан клипом: скорость хода делить
  // на скорость вращения. Начинать доворот в самом углу нельзя — дугой
  // вынесет наружу, и сэнсэй пройдёт сквозь стену. Поэтому поворачиваем
  // заранее, за радиус до угла: тогда дуга скругляет угол изнутри.
  const turnRadius = stride / turnRate;

  // Порядок обхода подобран под клип: он поворачивает ТОЛЬКО влево.
  //
  // Модель смотрит вдоль +Z, её левая сторона — это +X, поэтому левый
  // поворот увеличивает угол: +Z → +X → −Z → −X. Обход должен идти
  // ровно в этом порядке. При обратном порядке сэнсэй уезжал на 90°
  // не туда, а потом рывком доворачивался — и вылетал за периметр
  // почти на три метра, сквозь заднюю стену.
  const { x0, x1, z0, z1 } = area;
  const corners = [
    new THREE.Vector3(x0, 0, z1),   // пришли сюда, двигаясь по +Z
    new THREE.Vector3(x1, 0, z1),   // по +X
    new THREE.Vector3(x1, 0, z0),   // по −Z
    new THREE.Vector3(x0, 0, z0)    // по −X
  ];
  // Направления отрезков считаем из геометрии, а не из текущей позиции:
  // так угол не накапливает ошибку за долгий обход.
  const HEADINGS = [0, Math.PI / 2, Math.PI, -Math.PI / 2];

  let leg = 0;                 // к какому углу идём
  let yaw = HEADINGS[0];       // куда смотрит
  let mode = "walk";           // walk | turn | stand | brief
  let timer = rnd(GO.min, GO.max);
  let turnLeft = 0;            // сколько радиан осталось довернуть

  const pos = ch.root.position.copy(corners[3]);
  ch.root.rotation.y = yaw;

  // Стойка покоя. Если клипа нет — задаём позу кодом: учитель,
  // остановившийся посмотреть, не должен стоять так, будто сейчас
  // нападёт на ученика. Клип, когда он есть, главнее.
  const rig = makeRig(ch.root);
  const byCode = !ch.actions.stand && rig.ok;
  let standT = 0;

  function stand(dt){
    if(byCode){
      if(ch.current || ch.busy) ch.freeze();
      standT += dt;
      poseStand(rig, standT);
    } else {
      setClip("stand");
      ch.update(dt);
    }
  }

  function setClip(name){
    if(ch.actions[name]) ch.play(name, 0.25);
  }
  setClip("walk");

  return {
    object: ch.root,
    character: ch,          // нужен, чтобы снять портрет с модели
    height: ch.height,

    // Пока объясняет — стоит лицом к ученику.
    brief(x, z){
      mode = "brief";
      yaw = Math.atan2(x - pos.x, z - pos.z);
      ch.root.rotation.y = yaw;
    },

    // Объяснил — пошёл по периметру.
    release(){
      if(mode !== "brief") return;
      mode = "walk";
      timer = rnd(GO.min, GO.max);
      yaw = HEADINGS[leg];
      ch.root.rotation.y = yaw;
      setClip("walk");
    },

    step(dt){
      if(mode === "brief"){ stand(dt); return; }

      if(mode === "stand"){
        timer -= dt;
        if(timer <= 0){ mode = "walk"; timer = rnd(GO.min, GO.max); setClip("walk"); }
        else { stand(dt); return; }
      }

      if(mode === "turn"){
        // Доворот идёт клипом с поворотом: скорость вращения берём из него,
        // и тело едет по дуге ровно так, как записано в анимации.
        const d = Math.min(turnLeft, turnRate * dt);
        yaw += d;
        turnLeft -= d;
        pos.x += Math.sin(yaw) * stride * dt;
        pos.z += Math.cos(yaw) * stride * dt;
        ch.root.rotation.y = yaw;
        if(turnLeft <= 1e-3){
          mode = "walk";
          yaw = HEADINGS[leg];        // ровно по стене, без накопленной ошибки
          ch.root.rotation.y = yaw;
          setClip("walk");
        }
        ch.update(dt);
        return;
      }

      // Прямой отрезок вдоль стены.
      pos.x += Math.sin(yaw) * stride * dt;
      pos.z += Math.cos(yaw) * stride * dt;
      ch.root.rotation.y = yaw;

      const t = corners[leg];
      if(Math.hypot(t.x - pos.x, t.z - pos.z) < turnRadius){
        // Дошёл до угла — доворачиваем налево на четверть круга.
        leg = (leg + 1) % corners.length;
        turnLeft = Math.PI / 2;
        mode = "turn";
        setClip(ch.actions.turn ? "turn" : "walk");
      } else {
        timer -= dt;
        if(timer <= 0){
          mode = "stand";
          timer = rnd(STAND.min, STAND.max);
        }
      }
      ch.update(dt);
    }
  };
}
