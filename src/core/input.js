// Ввод: клавиатура и экранные кнопки.
//
// Два разных вопроса, и путать их нельзя:
//   keys.left   — клавиша ЗАЖАТА сейчас (движение, блок)
//   took("punch") — клавиша была НАЖАТА и это нажатие ещё не разобрали (удары)
//
// Если удар вешать на «зажата», то за одно нажатие он сработает столько раз,
// сколько кадров держали кнопку.

const MAP = {
  ArrowLeft:"left", ArrowRight:"right", ArrowUp:"up", ArrowDown:"down",
  KeyA:"left", KeyD:"right", KeyW:"up", KeyS:"down",
  KeyJ:"punch", KeyZ:"punch",
  KeyK:"kick",  KeyX:"kick",
  KeyL:"block", KeyC:"block",
  Space:"kiai",
  Enter:"enter",
  KeyP:"pause", Escape:"pause"
};

export const keys = {};
const pressed = new Set();

export function initInput(){
  addEventListener("keydown", e => {
    const k = MAP[e.code];
    if(!k) return;
    e.preventDefault();
    if(!keys[k]) pressed.add(k);   // только первое срабатывание, не автоповтор
    keys[k] = true;
  });

  addEventListener("keyup", e => {
    const k = MAP[e.code];
    if(!k) return;
    e.preventDefault();
    keys[k] = false;
  });

  // Экранные кнопки для планшета и телефона.
  document.querySelectorAll("[data-k]").forEach(btn => {
    const k = btn.dataset.k;
    const down = e => { e.preventDefault(); if(!keys[k]) pressed.add(k); keys[k] = true; };
    const up   = e => { e.preventDefault(); keys[k] = false; };
    btn.addEventListener("pointerdown", down);
    btn.addEventListener("pointerup", up);
    btn.addEventListener("pointercancel", up);
    btn.addEventListener("pointerleave", up);
  });

  // Ушли из вкладки — отпускаем всё. Иначе персонаж продолжит идти
  // в ту сторону, куда шёл в момент переключения окна.
  addEventListener("blur", () => { for(const k in keys) keys[k] = false; });
}

// Забрать одиночное нажатие. Возвращает true один раз на нажатие.
export function took(k){
  if(pressed.has(k)){ pressed.delete(k); return true; }
  return false;
}
