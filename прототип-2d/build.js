// Сборка в один HTML-файл.
//
// Собирает все модули, стили и логотип в dist/sasha-kyokushin.html.
// Этот файл ни от чего не зависит: можно кинуть на флешку, отправить в
// мессенджере, открыть двойным кликом без интернета и без сервера.
//
// Запуск: npm run build

const fs = require("fs");
const path = require("path");

const ROOT = __dirname;
const OUT_DIR = path.join(ROOT, "dist");
const OUT = path.join(OUT_DIR, "sasha-kyokushin.html");

// Порядок важен: модуль должен идти после тех, от кого зависит.
const ORDER = [
  "src/config.js",
  "src/audio.js",
  "src/input.js",
  "src/state.js",
  "src/render/canvas.js",
  "src/render/fighter.js",
  "src/render/background.js",
  "src/player.js",
  "src/enemies.js",
  "src/render/world.js",
  "src/render/hud.js",
  "src/render/screens.js",
  "src/game.js",
  "src/main.js"
];

// Убираем import/export — всё окажется в одной области видимости.
function strip(code){
  return code
    .replace(/^\s*import\s+[^;]*?;\s*$/gm, "")
    .replace(/^\s*export\s+(const|let|function|class)\s/gm, "$1 ")
    .replace(/^\s*export\s*\{[^}]*\}\s*;?\s*$/gm, "");
}

function build(){
  const css = fs.readFileSync(path.join(ROOT, "src/style.css"), "utf8");
  const logo = fs.readFileSync(path.join(ROOT, "assets/logo.png")).toString("base64");

  const js = ORDER
    .map(f => "/* ===== " + f + " ===== */\n" + strip(fs.readFileSync(path.join(ROOT, f), "utf8")))
    .join("\n");

  let html = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");
  html = html
    .replace('<link rel="stylesheet" href="src/style.css">', "<style>\n" + css + "\n</style>")
    .replace('<script type="module" src="src/main.js"></script>',
             "<script>\n(() => {\n\"use strict\";\n" + js + "\n})();\n</script>")
    // Логотип встраиваем прямо в файл, отдельная картинка не нужна.
    .replace(/(\n)/, "$1");

  const inlineJs = html.replace('LOGO.src = "assets/logo.png";',
                                'LOGO.src = "data:image/png;base64,' + logo + '";');

  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(OUT, inlineJs, "utf8");

  const kb = (fs.statSync(OUT).size / 1024).toFixed(1);
  console.log("Готово: dist/sasha-kyokushin.html (" + kb + " КБ)");
  console.log("Файл автономный — можно открывать двойным кликом.");
}

build();
