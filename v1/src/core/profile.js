// Профиль игрока: имя, персонаж, прогресс по поясам.
//
// Заводится один раз на экране входа и живёт между запусками.
// Всё, что игра знает про конкретного ребёнка, лежит здесь.

const KEY = "kaitaka-profile";

export const profile = {
  name: "",
  hero: "boy",     // "boy" | "girl"
  view: "side",    // "side" | "third" — вид камеры, выбор запоминается
  beltIdx: 0,      // индекс в BELTS, 0 — белый
  unlocked: 1      // сколько глав открыто
};

export const MAX_NAME = 12;

// Имя чистим, а не отвергаем. Ребёнок не должен упереться в «неверный ввод»:
// он просто хочет играть. Лишние пробелы убираем, длину подрезаем молча.
export function cleanName(raw){
  return String(raw || "").replace(/\s+/g, " ").trim().slice(0, MAX_NAME);
}

export function loadProfile(){
  try {
    const d = JSON.parse(localStorage.getItem(KEY));
    if(!d) return false;
    profile.name = cleanName(d.name);
    profile.hero = d.hero === "girl" ? "girl" : "boy";
    profile.view = d.view === "third" ? "third" : "side";
    profile.beltIdx = Number(d.beltIdx) || 0;
    profile.unlocked = Math.max(1, Number(d.unlocked) || 1);
    return !!profile.name;
  } catch(e){
    // Приватный режим — играем без сохранения, но не падаем.
    return false;
  }
}

export function saveProfile(){
  try { localStorage.setItem(KEY, JSON.stringify(profile)); }
  catch(e){ /* не критично: прогресс просто не переживёт закрытие вкладки */ }
}
