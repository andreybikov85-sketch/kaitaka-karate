// Точка входа. Подключает ввод, кнопку звука и запускает игровой цикл.

import { cv } from "./render/canvas.js";
import { initInput } from "./input.js";
import { toggleSound } from "./audio.js";
import { loadProgress } from "./state.js";
import { startLoop } from "./game.js";

loadProgress();
initInput(cv);

const soundBtn = document.getElementById("sound");
if(soundBtn){
  soundBtn.onclick = () => {
    soundBtn.textContent = "ЗВУК: " + (toggleSound() ? "ВКЛ" : "ВЫКЛ");
  };
}

startLoop();
