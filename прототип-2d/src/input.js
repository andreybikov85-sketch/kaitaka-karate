// Ввод: клавиатура и экранные кнопки для планшета.
//
// keys[k]  — кнопка удерживается прямо сейчас
// took(k)  — кнопка была нажата и это нажатие ещё не обработано (сбрасывается при чтении)

import { ac } from "./audio.js";

export const keys = {
  up: 0, down: 0, left: 0, right: 0,
  punch: 0, kick: 0, block: 0, kiai: 0,
  enter: 0, pause: 0
};

const pressed = {};

const MAP = {
  ArrowUp: "up",    KeyW: "up",
  ArrowDown: "down", KeyS: "down",
  ArrowLeft: "left", KeyA: "left",
  ArrowRight: "right", KeyD: "right",
  KeyJ: "punch", KeyZ: "punch",
  KeyK: "kick",  KeyX: "kick",
  KeyL: "block", KeyC: "block",
  Space: "kiai",
  Enter: "enter",
  KeyP: "pause", Escape: "pause"
};

const DIRS = new Set(["up", "down", "left", "right"]);

export function took(k){
  if(pressed[k]){ pressed[k] = 0; return true; }
  return false;
}

export function initInput(cv){
  addEventListener("keydown", e => {
    const k = MAP[e.code];
    if(!k) return;
    e.preventDefault();
    if(!keys[k]) pressed[k] = 1;
    keys[k] = 1;
    ac();
  });

  addEventListener("keyup", e => {
    const k = MAP[e.code];
    if(!k) return;
    e.preventDefault();
    keys[k] = 0;
  });

  // Экранные кнопки. Крестовина не подтверждает экраны — иначе меню проскакивает.
  document.querySelectorAll("button.k").forEach(b => {
    const k = b.dataset.k;
    const isDir = DIRS.has(k);

    const on = e => {
      e.preventDefault();
      if(!keys[k]) pressed[k] = 1;
      keys[k] = 1;
      if(!isDir){ keys.enter = 1; pressed.enter = 1; }
      b.classList.add("on");
      ac();
    };
    const off = e => {
      e.preventDefault();
      keys[k] = 0;
      if(!isDir) keys.enter = 0;
      b.classList.remove("on");
    };

    b.addEventListener("pointerdown", on);
    b.addEventListener("pointerup", off);
    b.addEventListener("pointerleave", off);
    b.addEventListener("pointercancel", off);
  });

  // Касание холста — подтверждение на экранах заставок.
  cv.addEventListener("pointerdown", e => {
    e.preventDefault();
    pressed.enter = 1;
    keys.enter = 1;
    ac();
  });
  cv.addEventListener("pointerup", () => { keys.enter = 0; });
}
