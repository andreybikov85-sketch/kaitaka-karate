// Звук. Всё синтезируется через WebAudio — звуковых файлов в проекте нет.

let soundOn = true;
let actx = null;

// Контекст создаётся только после действия пользователя — таково требование браузеров.
export function ac(){
  if(!actx){
    try { actx = new (window.AudioContext || window.webkitAudioContext)(); }
    catch(e){ /* звука не будет, игра работает дальше */ }
  }
  return actx;
}

export function isSoundOn(){ return soundOn; }

export function toggleSound(){
  soundOn = !soundOn;
  if(soundOn){ ac(); S.pick(); }
  return soundOn;
}

function beep(freq, dur, type, vol, slide){
  if(!soundOn) return;
  const a = ac(); if(!a) return;
  const o = a.createOscillator(), g = a.createGain();
  o.type = type || "square";
  o.frequency.setValueAtTime(freq, a.currentTime);
  if(slide) o.frequency.exponentialRampToValueAtTime(Math.max(40, slide), a.currentTime + dur);
  g.gain.setValueAtTime(vol || 0.08, a.currentTime);
  g.gain.exponentialRampToValueAtTime(0.0001, a.currentTime + dur);
  o.connect(g); g.connect(a.destination);
  o.start(); o.stop(a.currentTime + dur + 0.02);
}

function noise(dur, vol){
  if(!soundOn) return;
  const a = ac(); if(!a) return;
  const n = a.sampleRate * dur;
  const buf = a.createBuffer(1, n, a.sampleRate);
  const d = buf.getChannelData(0);
  for(let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
  const s = a.createBufferSource(); s.buffer = buf;
  const g = a.createGain(); g.gain.value = vol || 0.12;
  s.connect(g); g.connect(a.destination);
  s.start();
}

export const S = {
  punch(){ beep(320, 0.06, "square", 0.05, 180); noise(0.05, 0.06); },
  hit(){ noise(0.09, 0.14); beep(180, 0.08, "square", 0.06, 90); },
  kick(){ beep(220, 0.09, "sawtooth", 0.06, 120); noise(0.07, 0.1); },
  block(){ beep(140, 0.07, "triangle", 0.07, 110); },
  hurt(){ beep(150, 0.16, "sawtooth", 0.07, 70); },
  kiai(){ beep(520, 0.28, "square", 0.09, 120); noise(0.22, 0.16); },
  pick(){ beep(660, 0.07, "triangle", 0.07); beep(990, 0.09, "triangle", 0.06); },
  down(){ beep(120, 0.3, "sawtooth", 0.08, 50); },
  throwBall(){ beep(400, 0.08, "triangle", 0.05, 240); },
  belt(){ [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => beep(f, 0.18, "triangle", 0.07), i * 130)); },
  lose(){ [392, 349, 294, 220].forEach((f, i) => setTimeout(() => beep(f, 0.25, "triangle", 0.07), i * 180)); }
};
