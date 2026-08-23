// Экран входа: имя и выбор персонажа.
//
// Первое, что видит ребёнок. Правила простые:
//   — кнопка «начать» неактивна, пока не введено имя, чтобы нельзя было
//     проскочить экран случайно и остаться безымянным;
//   — Enter в поле имени начинает игру, как и кнопка;
//   — прошлый профиль подставляется, но остаётся редактируемым.

import { profile, loadProfile, saveProfile, cleanName, MAX_NAME } from "../core/profile.js";

export function showStart(onBegin){
  const el     = document.getElementById("start");
  const input  = document.getElementById("name");
  const begin  = document.getElementById("begin");
  const whoBtns= [...document.querySelectorAll(".who")];

  input.maxLength = MAX_NAME;

  // Подставляем прошлый профиль, если он есть.
  if(loadProfile()) input.value = profile.name;
  selectHero(profile.hero);

  function selectHero(hero){
    profile.hero = hero;
    for(const b of whoBtns){
      const on = b.dataset.hero === hero;
      b.classList.toggle("on", on);
      b.setAttribute("aria-pressed", String(on));
    }
  }

  function refresh(){
    begin.disabled = cleanName(input.value).length === 0;
  }

  function start(){
    const name = cleanName(input.value);
    if(!name) { input.focus(); return; }
    profile.name = name;
    saveProfile();

    el.classList.add("hidden");
    onBegin(profile);
  }

  for(const b of whoBtns) b.addEventListener("click", () => selectHero(b.dataset.hero));
  input.addEventListener("input", refresh);
  input.addEventListener("keydown", e => { if(e.key === "Enter") start(); });
  begin.addEventListener("click", start);

  el.classList.remove("hidden");
  refresh();

  // На телефоне фокус сам вызвал бы клавиатуру поверх экрана — пусть
  // ребёнок сначала увидит, куда попал, и ткнёт в поле сам.
  if(!matchMedia("(pointer:coarse)").matches) input.focus();
}
