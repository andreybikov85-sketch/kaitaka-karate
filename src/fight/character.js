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
    this.once = null;          // разовая анимация: удар, падение
    this.height = height;

    this.mixer.addEventListener("finished", e => {
      if(e.action === this.once) this.once = null;
    });
  }

  // Занят разовой анимацией — движение и новые удары пока запрещены.
  get busy(){ return !!this.once; }

  // Добавить клип анимации под коротким именем.
  //
  // secs — сколько действие должно длиться в игре. Mixamo отдаёт анимации
  // в киношном темпе: удар ногой там идёт 1.6 секунды. Для ребёнка это
  // не бой, а ожидание — нажал и смотришь. Поэтому темп задаётся нужной
  // длительностью, а ускорение считается от фактической. Так любой клип
  // встаёт в темп игры, какой бы длины он ни приехал.
  addClip(name, clip, secs){
    const a = this.mixer.clipAction(clip);
    a.clampWhenFinished = true;
    if(secs && clip.duration > 0) a.timeScale = clip.duration / secs;
    this.actions[name] = a;
    return a;
  }

  // Переключение с плавным переходом. Без перехода смена стойки на удар
  // выглядит как подмена кадра — персонаж «щёлкает» в новую позу.
  play(name, fade = 0.18){
    if(this.once) return;                 // разовая анимация главнее
    const next = this.actions[name];
    if(!next || next === this.current) return;
    next.reset().play();
    if(this.current) this.current.crossFadeTo(next, fade, false);
    this.current = next;
  }

  // Разовая анимация: проиграть один раз и вернуться в стойку.
  playOnce(name, fade = 0.08){
    const a = this.actions[name];
    if(!a || this.once) return false;
    a.reset();
    a.setLoop(THREE.LoopOnce, 1);
    a.clampWhenFinished = true;
    a.fadeIn(fade).play();
    if(this.current) this.current.fadeOut(fade);
    this.once = a;
    return true;
  }

  update(dt){
    this.mixer.update(dt);
    // Разовая закончилась — возвращаем цикл, который шёл до неё.
    if(!this.once && this.current && this.current.getEffectiveWeight() < 0.99){
      this.current.reset().fadeIn(0.12).play();
    }
  }
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

// Догрузить все анимации, какие найдутся. Отсутствующие пропускаются молча:
// игра должна работать и с половиной набора.
export async function loadClips(ch, list){
  const got = [];
  for(const [name, cfg] of Object.entries(list)){
    try { await loadClip(ch, name, cfg.url, cfg.secs); got.push(name); }
    catch(e){ /* файла нет — этот приём просто недоступен */ }
  }
  return got;
}

// Догрузить анимацию из отдельного файла и привязать к уже загруженному персонажу.
export async function loadClip(ch, name, url, secs){
  const fbx = await load(url);
  const clip = fbx.animations && fbx.animations[0];
  if(!clip) throw new Error("В файле нет анимации: " + url);

  // В клипе без тела дорожки иногда двигают корень целиком — персонаж
  // уезжает от нас по сцене. Позицией героя управляет игра, а не клип,
  // поэтому смещение корня выбрасываем, оставляя только повороты костей.
  clip.tracks = clip.tracks.filter(t => !/Hips\.position$/.test(t.name));

  ch.addClip(name, clip, secs);
  return clip;
}

// Окно урона: отрезок клипа, где бьющая конечность дальше всего вынесена
// от корпуса. Раньше это окно подбиралось руками; теперь считается из самой
// анимации, поэтому не разъедется при замене клипа.
//
// Правило из 2D-прототипа: урон обязан проходить в фазе выпада. Если сдвинуть
// его в замах, противник получает урон до того, как удар до него визуально
// дошёл, и бой ощущается нечестным.
export function strikeWindow(ch, clip, limbName){
  let limb = null, hips = null;
  ch.root.traverse(o => {
    if(!o.isBone) return;
    const n = o.name.replace(/^mixamorig:?/, "");
    if(n === limbName && !limb) limb = o;
    if(n === "Hips" && !hips) hips = o;
  });
  if(!limb || !hips) return null;

  const a = ch.mixer.clipAction(clip);
  const wasWeight = a.getEffectiveWeight();
  a.reset().play();

  // Меряем ВЫНОС ВПЕРЁД — насколько конечность ушла от таза вдоль взгляда.
  // Не расстояние до неё: нога и в стойке вытянута вниз на те же 80 см,
  // поэтому по расстоянию удар неотличим от покоя.
  const N = 40, lp = new THREE.Vector3(), hp = new THREE.Vector3(), reach = [];
  for(let i = 0; i < N; i++){
    a.time = clip.duration * i / (N - 1);
    ch.mixer.update(0);
    ch.root.updateMatrixWorld(true);
    ch.root.worldToLocal(limb.getWorldPosition(lp));
    ch.root.worldToLocal(hips.getWorldPosition(hp));
    reach.push(lp.z - hp.z);
  }
  a.stop();
  a.setEffectiveWeight(wasWeight);

  const max = Math.max(...reach);
  if(max <= 0) return null;

  // Порог 30% от пика. Выше — окно схлопывается: удар ногой у Mixamo резкий,
  // при 70% остаётся 50 мс, то есть три кадра, и попасть почти невозможно.
  // При 30% окно выходит около 130 мс — ровно столько, сколько в 2D-прототипе
  // было проверено на живом девятилетнем игроке.
  const hot = [];
  for(let i = 0; i < N; i++) if(reach[i] >= max * 0.3) hot.push(i);
  return {
    from: hot[0] / (N - 1),
    to: hot[hot.length - 1] / (N - 1),
    peak: +max.toFixed(3)
  };
}

// Что внутри файла — для отладки и проверки после скачивания с Mixamo.
export function describe(fbx){
  let meshes = 0, bones = 0;
  fbx.traverse(o => { if(o.isMesh) meshes++; if(o.isBone) bones++; });
  return { meshes, bones, clips: (fbx.animations || []).map(c => c.name) };
}
