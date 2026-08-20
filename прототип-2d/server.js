// Локальный сервер для разработки. Зависимостей нет — только встроенный Node.
//
// ES-модули браузер не грузит по протоколу file://, поэтому для разработки
// нужен http. Запуск: npm start
//
// Готовый файл для сына собирается отдельно: npm run build

const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = process.env.PORT || 8080;
const ROOT = __dirname;

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".png": "image/png",
  ".json": "application/json; charset=utf-8"
};

http.createServer((req, res) => {
  let rel = decodeURIComponent(req.url.split("?")[0]);
  if(rel === "/") rel = "/index.html";

  // Не выпускаем за пределы папки проекта.
  const file = path.join(ROOT, path.normalize(rel));
  if(!file.startsWith(ROOT)){
    res.writeHead(403).end("Нет доступа");
    return;
  }

  fs.readFile(file, (err, data) => {
    if(err){
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("Не найдено: " + rel);
      return;
    }
    res.writeHead(200, {
      "Content-Type": MIME[path.extname(file)] || "application/octet-stream",
      "Cache-Control": "no-store"     // чтобы правки были видны сразу
    });
    res.end(data);
  });
}).listen(PORT, () => {
  console.log("Игра запущена: http://localhost:" + PORT);
  console.log("Остановить: Ctrl+C");
});
