// Интерфейс заданий: слова сэнсэя, панель хода работы, итог, вручение пояса.
//
// Панель одна на все задания. Этап отдаёт три вещи — что делать, сколько
// сделано и сколько осталось времени, — а как это показать, решается здесь.

const el = id => document.getElementById(id);

export function makeTaskUI(heroName, faceUrl, hooks){
  const brief   = el("brief");
  const briefTx = el("brief-text");
  const briefNo = el("brief-no");
  const panel   = el("task");
  const cells   = el("task-bars");
  const text    = el("task-text");
  const note    = el("task-note");
  const timer   = el("task-timer");
  const done    = el("done");
  const doneTx  = el("done-text");
  const doneSub = el("done-sub");
  const doneGo  = el("done-go");

  const face = el("brief-face");
  if(faceUrl){ face.src = faceUrl; face.hidden = false; }

  el("brief-go").addEventListener("click", () => hooks.begin());
  doneGo.addEventListener("click", () => hooks.next());

  let было = 0;
  function делений(n){
    if(n === было) return;
    было = n;
    cells.innerHTML = "";
    for(let i = 0; i < n; i++){
      const d = document.createElement("div");
      d.className = "bar";
      d.innerHTML = '<span class="bar-fill"></span>';
      cells.appendChild(d);
    }
  }

  return {
    brief(task, no, всего){
      panel.classList.add("hidden");
      done.classList.add("hidden");
      briefNo.textContent = "ЗАДАНИЕ " + no + " ИЗ " + всего + " · " + task.name;
      briefTx.innerHTML = task.brief
        .map(s => s.replace("{имя}", heroName))
        .map(s => `<p>${s}</p>`).join("");
      brief.classList.remove("hidden");
    },

    accept(){ if(!brief.classList.contains("hidden")) hooks.begin(); },
    nextFromKey(){ if(!done.classList.contains("hidden")) hooks.next(); },

    play(hud, left){
      brief.classList.add("hidden");
      done.classList.add("hidden");
      panel.classList.remove("hidden");

      делений(hud.cells.length);
      const bars = cells.children;
      for(let i = 0; i < hud.cells.length; i++){
        const k = Math.max(0, Math.min(1, hud.cells[i]));
        bars[i].firstChild.style.width = (k * 100) + "%";
        bars[i].classList.toggle("full", k >= 1);
      }
      text.textContent = hud.text;
      note.textContent = hud.note || "";

      const s = Math.max(0, Math.ceil(left));
      timer.textContent = Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0");
      // Последние десять секунд подсвечиваем: ребёнок смотрит на зал,
      // а не на часы, и без сигнала время кончается неожиданно.
      timer.classList.toggle("low", left <= 10);
    },

    result(won, words, task, no, всего){
      panel.classList.add("hidden");
      doneTx.textContent = words;
      doneSub.textContent = won
        ? (no < всего ? "Дальше — задание " + (no + 1) : "Все задания пройдены")
        : "Задание " + no + " · " + task.name;
      doneGo.textContent = won ? (no < всего ? "ДАЛЬШЕ" : "ЗАВЕРШИТЬ") : "ЕЩЁ РАЗ";
      done.dataset.won = won ? "1" : "0";
      done.classList.remove("hidden");
    },

    belt(belt){
      panel.classList.add("hidden");
      doneTx.textContent = "ПОЯС: " + belt.name.toUpperCase();
      doneSub.textContent = belt.rank + " · поздравляю, " + heroName + "!";
      doneGo.textContent = "ОСУ!";
      done.dataset.won = "1";
      done.classList.remove("hidden");
    }
  };
}
