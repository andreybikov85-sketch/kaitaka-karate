// Интерфейс задания: слова сэнсэя, панель прогресса, итог.
//
// Всё на обычном HTML поверх 3D — как и остальной интерфейс игры.

const el = id => document.getElementById(id);

export function makeTaskUI(level, heroName, onBegin){
  const t = level.task;
  const count = level.targets.length;

  const brief   = el("brief");
  const briefTx = el("brief-text");
  const panel   = el("task");
  const bars    = el("task-bars");
  const timer   = el("task-timer");
  const done    = el("done");
  const doneTx  = el("done-text");
  const doneSub = el("done-sub");

  // Полоски снарядов делаем один раз — дальше только меняем ширину.
  bars.innerHTML = "";
  const fills = [];
  for(let i = 0; i < count; i++){
    const b = document.createElement("div");
    b.className = "bar";
    b.innerHTML = '<span class="bar-fill"></span><span class="bar-num">0</span>';
    bars.appendChild(b);
    fills.push({ box: b, fill: b.querySelector(".bar-fill"), num: b.querySelector(".bar-num") });
  }

  briefTx.innerHTML = t.brief
    .map(s => s.replace("{имя}", heroName))
    .map(s => `<p>${s}</p>`).join("");

  brief.classList.remove("hidden");

  const start = () => {
    brief.classList.add("hidden");
    panel.classList.remove("hidden");
    onBegin();
  };
  el("brief-go").addEventListener("click", start);

  return {
    // Начать по Enter или по кнопке.
    accept: start,

    showTask(hits, need, left){
      for(let i = 0; i < count; i++){
        const k = Math.min(1, hits[i] / need);
        fills[i].fill.style.width = (k * 100) + "%";
        fills[i].num.textContent = hits[i];
        fills[i].box.classList.toggle("full", hits[i] >= need);
      }
      this.tick(left);
    },

    tick(left){
      const s = Math.max(0, Math.ceil(left));
      timer.textContent = String(Math.floor(s / 60)) + ":" + String(s % 60).padStart(2, "0");
      // Последние десять секунд подсвечиваем: ребёнок следит за снарядами,
      // а не за часами, и без сигнала время кончается неожиданно.
      timer.classList.toggle("low", left <= 10);
    },

    finish(won, text, hits, need){
      panel.classList.add("hidden");
      doneTx.textContent = text;
      const total = hits.reduce((a, b) => a + b, 0);
      doneSub.textContent = won
        ? "Все снаряды пройдены"
        : `Набито ${total} из ${need * hits.length}`;
      done.dataset.won = won ? "1" : "0";
      done.classList.remove("hidden");
    }
  };
}
