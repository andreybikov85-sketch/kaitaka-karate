// Загрузка персонажа и его анимаций.
//
// Модель приезжает с Mixamo одним файлом (с телом), анимации — отдельными
// файлами без тела. Здесь они собираются вместе: один скелет, много клипов.
//
// Почему клипы отдельными файлами: скачанная «со скином» анимация тащит
// внутри копию всей модели. Семь анимаций — семь копий персонажа и
// многие мегабайты на ровном месте.

import * as THREE from "three";
import { FBXLoader } from "three/addons/loaders/FBXLoader.js";

const loader = new FBXLoader();

// Рост персонажа в мире игры, в метрах. Мир строится в метрах:
// столбы на арене 2.4 м, татами размечен по метру.
const TARGET_HEIGHT = 1.55;   // ребёнок девяти лет

function load(url){
  return new Promise((ok, fail) => loader.load(url, ok, undefined, fail));
}

export class Character {
  constructor(root, height){
    this.root = root;          // то, что кладём в сцену
    this.model = root.children[0];
    this.mixer = new THREE.AnimationMixer(this.model);
    this.actions = {};
    this.current = null;
    this.height = height;
  }

  // Добавить клип анимации под коротким именем.
  addClip(name, clip){
    const a = this.mixer.clipAction(clip);
    a.clampWhenFinished = true;
    this.actions[name] = a;
    return a;
  }

  // Переключение с плавным переходом. Без перехода смена стойки на удар
  // выглядит как подмена кадра — персонаж «щёлкает» в новую позу.
  play(name, fade = 0.18){
    const next = this.actions[name];
    if(!next || next === this.current) return;
    next.reset().play();
    if(this.current) this.current.crossFadeTo(next, fade, false);
    this.current = next;
  }

  update(dt){ this.mixer.update(dt); }
}

// Загрузить персонажа. Возвращает Character.
export async function loadCharacter(url){
  const fbx = await load(url);

  // Размер приводим сами, а не домножаем на 0.01 «как у Mixamo».
  // Модели из разных источников приезжают в разных единицах: сантиметры,
  // метры, дюймы. Замер по габаритам работает с любой.
  const box = new THREE.Box3().setFromObject(fbx);
  const size = new THREE.Vector3();
  box.getSize(size);
  const scale = size.y > 0 ? TARGET_HEIGHT / size.y : 1;
  fbx.scale.setScalar(scale);

  // Ставим ногами на пол: после масштабирования низ габаритов должен быть в нуле.
  fbx.position.y = -box.min.y * scale;

  fbx.traverse(o => {
    if(o.isMesh){
      o.castShadow = true;
      o.receiveShadow = true;
      // Mixamo часто отдаёт материалы с зеркальным бликом от старого
      // движка — на матовой ткани кимоно это выглядит как мокрый пластик.
      if(o.material){
        for(const m of [].concat(o.material)){
          if(m.shininess !== undefined) m.shininess = 0;
          if(m.specular) m.specular.setScalar(0);
        }
      }
    }
  });

  // Обёртка нужна, чтобы двигать и поворачивать персонажа, не трогая
  // подгонку роста и посадку на пол внутри.
  const root = new THREE.Group();
  root.add(fbx);

  const ch = new Character(root, size.y * scale);
  for(const clip of fbx.animations || []) ch.addClip(clip.name || "clip", clip);
  return ch;
}

// Догрузить анимацию из отдельного файла и привязать к уже загруженному персонажу.
export async function loadClip(ch, name, url){
  const fbx = await load(url);
  const clip = fbx.animations && fbx.animations[0];
  if(!clip) throw new Error("В файле нет анимации: " + url);

  // В клипе без тела дорожки иногда двигают корень целиком — персонаж
  // уезжает от нас по сцене. Позицией героя управляет игра, а не клип,
  // поэтому смещение корня выбрасываем, оставляя только повороты костей.
  clip.tracks = clip.tracks.filter(t => !/Hips\.position$/.test(t.name));

  ch.addClip(name, clip);
  return clip;
}

// Что внутри файла — для отладки и проверки после скачивания с Mixamo.
export function describe(fbx){
  let meshes = 0, bones = 0;
  fbx.traverse(o => { if(o.isMesh) meshes++; if(o.isBone) bones++; });
  return { meshes, bones, clips: (fbx.animations || []).map(c => c.name) };
}
