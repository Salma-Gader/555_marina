// Apparition douce du contenu au défilement.
// Les éléments [data-reveal] d'un même parent arrivent l'un après l'autre.
const root = document.documentElement;
const items = [...document.querySelectorAll("[data-reveal]")];

if (!root.classList.contains("reveal-on") || !items.length) {
  root.classList.remove("reveal-on");
} else {
  // décalage en cascade entre frères (max ~0,5 s)
  const seen = new Map();
  for (const el of items) {
    const n = seen.get(el.parentElement) || 0;
    seen.set(el.parentElement, n + 1);
    el.style.setProperty("--d", `${Math.min(n * 0.08, 0.5)}s`);
  }

  const show = (el, instant) => {
    if (instant) el.style.setProperty("--d", "0s");
    el.classList.add("is-in");
  };

  const io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      // déjà dépassé (rechargement au milieu de la page) : afficher sans attendre
      const above = e.boundingClientRect.bottom < 0;
      if (e.isIntersecting || above) {
        show(e.target, above);
        io.unobserve(e.target);
      }
    }
  }, { rootMargin: "0px 0px -8% 0px", threshold: 0.12 });

  items.forEach((el) => io.observe(el));

  // lien d'ancre (#tables…) : la cible et son contenu apparaissent tout de suite
  const revealIn = (sel) => {
    const t = sel && document.querySelector(sel);
    if (t) t.querySelectorAll("[data-reveal]").forEach((el) => { show(el, true); io.unobserve(el); });
  };
  addEventListener("hashchange", () => revealIn(location.hash));
  if (location.hash) revealIn(location.hash);
}
