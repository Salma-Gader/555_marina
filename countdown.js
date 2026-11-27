// Compte à rebours jusqu'au 1er janvier 2027, 00h00 à Tanger (UTC+1).
const TARGET = Date.UTC(2026, 11, 31, 23, 0, 0);
const box = document.getElementById("count");
const units = Object.fromEntries([...box.querySelectorAll("[data-u]")].map((n) => [n.dataset.u, n]));
const pad = (v) => String(v).padStart(2, "0");

function tick() {
  let s = Math.max(0, Math.floor((TARGET - Date.now()) / 1000));
  if (s === 0) {
    document.querySelector(".minuit-title").textContent = "Bonne année 2027";
    box.hidden = true;
    return;
  }
  const j = Math.floor(s / 86400); s -= j * 86400;
  const h = Math.floor(s / 3600); s -= h * 3600;
  const m = Math.floor(s / 60); s -= m * 60;
  units.j.textContent = j; units.h.textContent = pad(h); units.m.textContent = pad(m); units.s.textContent = pad(s);
  box.setAttribute("aria-label", `${j} jours, ${h} heures et ${m} minutes avant 2027`);
  setTimeout(tick, 1000 - (Date.now() % 1000));
}
tick();
