// Анимация поворотом костей — без файлов с Mixamo.
//
// Нужна для двух случаев:
//   1. пока клипы не приехали, персонаж всё равно должен двигаться;
//   2. если какого-то клипа нет, боец не замирает статуей.
//
// ПОЧЕМУ НЕ УГЛЫ. Первая версия задавала повороты углами в системе координат
// родительской кости — и не работала: у плеча эта система развёрнута вдоль
// руки, поэтому «опустить руку на 75° вокруг Z» поднимало её вверх и назад.
// У разных моделей кости смотрят по-разному, и одно и то же число даёт
// разный результат.
//
// Поэтому здесь кости не поворачиваются, а НАЦЕЛИВАЮТСЯ: задаётся, куда
// должна смотреть конечность в системе персонажа, а нужный поворот
// вычисляется сам. Это работает с любой моделью, как бы ни был собран её
// скелет.
//
// Оси персонажа: X — вбок, Y — вверх, Z — вперёд, куда он смотрит.

import * as THREE from "three";

const NAMES = [
  "Hips","Spine","Spine1","Spine2","Neck","Head",
  "LeftShoulder","LeftArm","LeftForeArm","LeftHand",
  "RightShoulder","RightArm","RightForeArm","RightHand",
  "LeftUpLeg","LeftLeg","LeftFoot","LeftToeBase",
  "RightUpLeg","RightLeg","RightFoot","RightToeBase"
];

export function makeRig(root){
  const bones = {}, rest = {};
  root.traverse(o => {
    if(!o.isBone) return;
    // Загрузчик Three.js вычищает двоеточие: в файле "mixamorig:Hips",
    // в сцене "mixamorigHips". Срезаем оба варианта.
    const n = o.name.replace(/^mixamorig:?/, "");
    if(NAMES.includes(n) && !bones[n]){
      bones[n] = o;
      rest[n] = o.quaternion.clone();
    }
  });
  return {
    root, bones, rest,
    hipsRestY: bones.Hips ? bones.Hips.position.y : 0,
    ok: !!(bones.Hips && bones.LeftArm && bones.LeftUpLeg)
  };
}

const _a = new THREE.Vector3(), _b = new THREE.Vector3(), _d = new THREE.Vector3();
const _wq = new THREE.Quaternion(), _pq = new THREE.Quaternion(), _dq = new THREE.Quaternion();

// Направить кость так, чтобы её дочерняя кость оказалась в стороне (dx,dy,dz).
// Направление задаётся в системе персонажа, поэтому при развороте героя
// поза едет вместе с ним.
function aim(rig, boneName, childName, dx, dy, dz){
  const bone = rig.bones[boneName], child = rig.bones[childName];
  if(!bone || !child) return;

  bone.getWorldPosition(_a);
  child.getWorldPosition(_b);
  _b.sub(_a);
  if(_b.lengthSq() < 1e-12) return;
  _b.normalize();

  // Желаемое направление переводим из системы персонажа в мировую.
  rig.root.getWorldQuaternion(_wq);
  _d.set(dx, dy, dz).normalize().applyQuaternion(_wq);

  // Поворот, совмещающий текущее направление с желаемым.
  _dq.setFromUnitVectors(_b, _d);

  // Применяем в мире, затем переводим обратно в систему родителя:
  //   местный = родитель⁻¹ · поворот · мировой
  bone.getWorldQuaternion(_wq);
  _wq.premultiply(_dq);
  bone.parent.getWorldQuaternion(_pq).invert();
  bone.quaternion.copy(_pq).multiply(_wq);

  // Обновляем только поддерево этой кости: следующая цель считается
  // от уже принятого положения родителя.
  bone.updateMatrixWorld(true);
}

function reset(rig){
  for(const n in rig.bones) rig.bones[n].quaternion.copy(rig.rest[n]);
  if(rig.bones.Hips) rig.bones.Hips.position.y = rig.hipsRestY;
  rig.root.updateMatrixWorld(true);
}

/* ---- Позы ----
   Поза = куда смотрят конечности. Кости обрабатываются сверху вниз:
   сначала корпус, потом руки и ноги от плеча и бедра к кисти и стопе. */

// Боевая стойка киокушинкай: кулаки у корпуса, локти прижаты,
// вес чуть назад, лёгкое дыхание.
export function poseIdle(rig, t){
  reset(rig);
  const br = Math.sin(t * 1.8);

  aim(rig, "Spine",  "Spine1", 0,  1,    0.04);
  aim(rig, "Neck",   "Head",   0,  1,    0.03);

  // Плечо вниз и чуть вперёд, предплечье — вперёд и внутрь: кулак у груди.
  aim(rig, "LeftArm",      "LeftForeArm",  0.34, -0.90,  0.12);
  aim(rig, "LeftForeArm",  "LeftHand",     0.10, -0.10,  0.99);
  aim(rig, "RightArm",     "RightForeArm", -0.34, -0.90,  0.12);
  aim(rig, "RightForeArm", "RightHand",    -0.10, -0.10,  0.99);

  aim(rig, "LeftUpLeg",  "LeftLeg",   0.10, -1, 0.12);
  aim(rig, "LeftLeg",    "LeftFoot",  0,    -1, -0.10);
  aim(rig, "RightUpLeg", "RightLeg", -0.10, -1, -0.12);
  aim(rig, "RightLeg",   "RightFoot", 0,    -1, 0.06);

  // Ниже 1.0 опускать нельзя: согнутые колени уже укорачивают ноги,
  // и лишний подсед топит стопы в пол.
  rig.bones.Hips.position.y = rig.hipsRestY * (1.005 + br * 0.006);
}

// Спокойная стойка: руки опущены, вес на обеих ногах, лёгкое дыхание.
//
// Нужна тем, кто сейчас не дерётся — сэнсэю, когда он остановился
// посмотреть. Боевая стойка на нём выглядит так, будто он вот-вот
// нападёт на собственного ученика.
export function poseStand(rig, t){
  reset(rig);
  const br = Math.sin(t * 1.4);

  aim(rig, "Spine", "Spine1", 0, 1, 0.01);
  aim(rig, "Neck",  "Head",   0, 1, 0.02);

  // Руки вдоль тела, чуть отведены от корпуса и слегка согнуты —
  // прямые как палки выглядят неживо.
  aim(rig, "LeftArm",      "LeftForeArm",   0.17, -0.98, 0.02);
  aim(rig, "LeftForeArm",  "LeftHand",      0.10, -0.97, 0.20);
  aim(rig, "RightArm",     "RightForeArm", -0.17, -0.98, 0.02);
  aim(rig, "RightForeArm", "RightHand",    -0.10, -0.97, 0.20);

  aim(rig, "LeftUpLeg",  "LeftLeg",   0.07, -1, 0.01);
  aim(rig, "LeftLeg",    "LeftFoot",  0,    -1, -0.02);
  aim(rig, "RightUpLeg", "RightLeg", -0.07, -1, 0.01);
  aim(rig, "RightLeg",   "RightFoot", 0,    -1, -0.02);

  rig.bones.Hips.position.y = rig.hipsRestY * (1.002 + br * 0.004);
}

// Шаг. Ноги качаются в противофазе, руки — навстречу ногам.
export function poseWalk(rig, t){
  reset(rig);
  const s = Math.sin(t), c = Math.cos(t);

  aim(rig, "Spine", "Spine1", 0, 1, 0.03);

  // Бедро выносится вперёд-назад.
  aim(rig, "LeftUpLeg",  "LeftLeg",   0.09, -1,  s * 0.55);
  aim(rig, "RightUpLeg", "RightLeg", -0.09, -1, -s * 0.55);

  // Колено гнётся на ВЫНОСЕ ВПЕРЁД, чтобы пронести стопу над полом,
  // и распрямляется к моменту постановки. Если гнуть его у задней ноги,
  // стопа задирается на отходе и походка читается как движение назад.
  const kneeL = Math.max(0,  c) * 0.9;
  const kneeR = Math.max(0, -c) * 0.9;
  aim(rig, "LeftLeg",  "LeftFoot",  0, -1, -kneeL);
  aim(rig, "RightLeg", "RightFoot", 0, -1, -kneeR);

  // Руки идут навстречу ногам — иначе походка выглядит как у робота.
  aim(rig, "LeftArm",      "LeftForeArm",  0.22, -0.95, -s * 0.42);
  aim(rig, "LeftForeArm",  "LeftHand",     0.06, -0.90,  0.42);
  aim(rig, "RightArm",     "RightForeArm", -0.22, -0.95,  s * 0.42);
  aim(rig, "RightForeArm", "RightHand",    -0.06, -0.90,  0.42);

  rig.bones.Hips.position.y = rig.hipsRestY * (0.985 + Math.abs(c) * 0.015);
}
