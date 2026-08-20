// Главный цикл: обновление логики и отрисовка кадра.

import { W, H, LEVELS } from "./config.js";
import { ctx } from "./render/canvas.js";
import { took } from "./input.js";
import { S } from "./audio.js";
import { G, P, startLevel, spawnWave, advanceWave, saveProgress } from "./state.js";
import { updatePlayer } from "./player.js";
import { updateEnemies, updateShots, updateItems } from "./enemies.js";
import { drawBG } from "./render/background.js";
import { drawWorld } from "./render/world.js";
import { drawHUD } from "./render/hud.js";
import { drawIntro, drawBelt, drawGameOver, drawPause, drawTitle, drawWin } from "./render/screens.js";

let last = 0;

export function startLoop(){
  last = performance.now();
  requestAnimationFrame(loop);
}

function loop(now){
  // Ограничение шага: после сворачивания вкладки dt был бы огромным
  // и объекты «телепортировались» бы сквозь друг друга.
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;

  G.t += dt;
  G.screenT += dt;
  if(G.shake > 0) G.shake = Math.max(0, G.shake - dt * 3);
  if(G.flash > 0) G.flash = Math.max(0, G.flash - dt * 3);
  if(G.msgT > 0) G.msgT -= dt;

  try {
    update(dt);
    render();
  } catch(err){
    // Ошибка в одном кадре не должна убивать игру целиком.
    console.error("Ошибка в кадре:", err);
  }

  requestAnimationFrame(loop);
}

function update(dt){
  switch(G.state){
    case "title":    return updateTitle();
    case "intro":    return updateIntro();
    case "belt":     return updateBelt();
    case "gameover": return updateGameOver();
    case "win":      return updateWin();
    case "pause":    return updatePause();
    case "play":     return updatePlay(dt);
  }
}

function updateTitle(){
  if(G.unlocked > 1){
    if(took("left"))  G.selLevel = (G.selLevel + G.unlocked - 1) % G.unlocked;
    if(took("right")) G.selLevel = (G.selLevel + 1) % G.unlocked;
  }
  if(took("enter")) startLevel(G.selLevel);
}

function updateIntro(){
  if((G.screenT > 1.4 && took("enter")) || G.screenT > 5){
    G.state = "play";
    spawnWave();
  }
}

function updateBelt(){
  if(G.screenT > 1.2 && took("enter")){
    if(G.lvl + 1 >= LEVELS.length){
      G.state = "win";
      G.screenT = 0;
    } else {
      G.unlocked = Math.max(G.unlocked, G.lvl + 2);
      saveProgress();
      startLevel(G.lvl + 1);
    }
  }
}

function updateGameOver(){
  if(G.screenT > 0.8 && took("enter")) startLevel(G.lvl);
}

function updateWin(){
  if(took("enter")){ G.state = "title"; G.screenT = 0; }
}

function updatePause(){
  if(took("pause") || took("enter")) G.state = "play";
}

function updatePlay(dt){
  if(took("pause")){ G.state = "pause"; return; }

  updatePlayer(dt);
  updateEnemies(dt);
  updateShots(dt);
  updateItems(dt);

  for(let i = G.fx.length - 1; i >= 0; i--){
    const f = G.fx[i];
    f.t += dt;
    f.x += f.vx * dt;
    f.y += f.vy * dt;
    if(f.t > f.life) G.fx.splice(i, 1);
  }

  // Волна зачищена?
  const alive = G.enemies.filter(e => !e.dying).length;
  if(alive === 0 && !G.cleared){
    G.cleared = true;
    if(G.bossFight){
      G.state = "belt";
      G.screenT = 0;
      S.belt();
      G.unlocked = Math.max(G.unlocked, G.lvl + 2);
      saveProgress();
    } else {
      G.msg = "ВПЕРЁД →";
      G.msgT = 1.6;
    }
  }

  advanceWave(dt);
}

function render(){
  ctx.save();

  if(G.shake > 0){
    ctx.translate((Math.random() - 0.5) * G.shake * 5, (Math.random() - 0.5) * G.shake * 4);
  }

  if(G.state === "title"){
    drawTitle();
  } else if(G.state === "win"){
    drawWin();
  } else {
    drawBG(LEVELS[G.lvl].theme);
    drawWorld();
    drawHUD();
    if(G.state === "intro")    drawIntro();
    if(G.state === "belt")     drawBelt();
    if(G.state === "gameover") drawGameOver();
    if(G.state === "pause")    drawPause();
  }

  if(G.flash > 0){
    ctx.fillStyle = "rgba(255,255,255," + (G.flash * 0.35) + ")";
    ctx.fillRect(0, 0, W, H);
  }

  ctx.restore();
}
