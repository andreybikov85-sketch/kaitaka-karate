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
  KeyV:"view",
  KeyT:"mode",
  KeyP:"pause", Escape:"pause"
};

export const keys = {};
const pressed = new Set();

// Игрок сейчас набирает текст?
//
// Пока курсор в поле ввода, игра не должна трогать клавиатуру вообще.
// Иначе поле имени «тупит»: в карте управления заняты буквенные клавиши
// и пробел, а preventDefault не даёт символу дойти до поля. В русской
// раскладке «С» сидит на KeyC, который занят блоком, — и буква просто
// не печатается.
function typing(){
  const el = document.activeElement;
  return !!el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable);
}

export function initInput(){
  addEventListener("keydown", e => {
    if(typing()) return;
    const k = MAP[e.code];
    if(!k) return;
    e.preventDefault();
    if(!keys[k]) pressed.add(k);   // только первое срабатывание, не автоповтор
    keys[k] = true;
  });

  addEventListener("keyup", e => {
    if(typing()) return;
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
