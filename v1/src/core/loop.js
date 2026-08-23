// Игровой цикл.
//
// Модули регистрируют свои функции обновления через onUpdate, цикл вызывает
// их каждый кадр с шагом времени dt (в секундах). Никто не должен опираться
// на «кадр» как единицу времени — иначе игра пойдёт вдвое быстрее на монитор
// 120 Гц, чем на 60 Гц.

const updaters = [];
let render = null;
let last = 0;
let running = false;

export function onUpdate(fn){ updaters.push(fn); }
export function onRender(fn){ render = fn; }

export function startLoop(){
  if(running) return;
  running = true;
  last = performance.now();
  requestAnimationFrame(frame);
}

function frame(now){
  // Ограничение шага. Если вкладку свернули на минуту, dt был бы огромным
  // и объекты за один кадр пролетели бы сквозь друг друга.
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;

  try {
    for(const fn of updaters) fn(dt);
    if(render) render(dt);
  } catch(err){
    // Ошибка в одном кадре не должна убивать игру насовсем.
    // Ребёнок увидит замерший экран вместо чёрного, а мы — след в консоли.
    console.error("Ошибка в кадре:", err);
  }

  requestAnimationFrame(frame);
}
