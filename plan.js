// Plan des tables du réveillon, 555 Tanger Marina Bay.
// Positions et tarifs repris du plan officiel « Réveillon du 31 décembre ».

// À compléter par le lieu : un numéro WhatsApp au format international sans « + » (ex. "2126XXXXXXXX").
// Sans numéro, le bouton renvoie vers le site officiel et la demande peut être copiée.
const RESERVATION = {
  whatsapp: "",
  url: "https://www.555tanger.com/",
};

const ENTRY_EXTRA = 700; // ticket d'entrée par personne en plus à une table
const SEATS = 6;
const MAX_EXTRA = 10;

const TIERS = [
  { id: "vip15", name: "VIP", price: 15000, incl: "2 bouteilles ou 1 magnum", color: "#5B7CFF", ink: "#FFFFFF" },
  { id: "vip13", name: "VIP", price: 13000, incl: "2 bouteilles ou 1 magnum", color: "#E9C766", ink: "#151A2A" },
  { id: "t10", name: "Table", price: 10000, incl: "2 bouteilles ou 1 magnum", color: "#E58B3A", ink: "#151A2A" },
  { id: "t7", name: "Table", price: 7000, incl: "1 bouteille", color: "#5CC98A", ink: "#151A2A" },
  { id: "t5", name: "Table", price: 5000, incl: "1 bouteille", color: "#E46AA0", ink: "#151A2A" },
];
const tierById = Object.fromEntries(TIERS.map((t) => [t.id, t]));

// [numéro, x, y] dans le repère du plan
const POS = [
  [15, 62, 277], [14, 153, 277], [13, 212, 263], [12, 212, 307],
  [16, 64, 331], [17, 64, 374], [18, 64, 417], [19, 64, 461], [20, 64, 505], [21, 64, 555],
  [49, 668, 277], [48, 740, 277], [47, 812, 277],
  [11, 791, 407], [10, 791, 452], [9, 791, 496], [8, 791, 540], [7, 791, 583], [6, 791, 628],
  [5, 791, 672], [4, 791, 716], [3, 791, 762], [2, 791, 806], [1, 791, 853],
  [22, 201, 403], [23, 201, 446], [24, 201, 490], [25, 201, 535], [26, 201, 580],
  [27, 201, 628], [28, 201, 671], [29, 201, 717],
  [46, 647, 402], [45, 647, 455], [44, 647, 516], [43, 647, 573], [42, 647, 628],
  [41, 647, 688], [40, 647, 745], [39, 647, 803],
  [36, 348, 625], [37, 432, 625], [38, 517, 625],
  [35, 348, 685], [34, 432, 685], [33, 514, 685],
  [30, 348, 745], [31, 432, 745], [32, 514, 745],
  [62, 36, 631], [61, 36, 671], [60, 36, 709], [59, 36, 747], [58, 66, 799],
  [65, 282, 1055], [64, 389, 1055], [63, 494, 1055],
  [57, 787, 951], [56, 787, 994], [55, 787, 1036], [54, 787, 1079], [53, 787, 1121],
  [52, 787, 1164], [51, 787, 1207], [50, 787, 1251],
];

const inRange = (n, a, b) => n >= a && n <= b;
function tierOf(n) {
  if ([11, 13, 15, 21].includes(n)) return "vip15";
  if (inRange(n, 1, 10) || n === 12 || n === 14 || inRange(n, 16, 20)) return "vip13";
  if (inRange(n, 22, 26) || inRange(n, 36, 38) || inRange(n, 42, 46) || n === 57 || n === 58) return "t10";
  if (inRange(n, 50, 56)) return "t5";
  return "t7";
}
function zoneOf(n) {
  if (inRange(n, 12, 21)) return "Espace VIP, côté gauche";
  if (inRange(n, 1, 11)) return "Espace VIP, côté droit";
  if (inRange(n, 22, 29) || inRange(n, 39, 46)) return "En bord de piste";
  if (inRange(n, 30, 38)) return "Face à la piste de danse";
  if (inRange(n, 47, 49)) return "À côté de la cabine DJ";
  if (inRange(n, 58, 62)) return "Côté gauche de la salle";
  if (inRange(n, 63, 65)) return "Côté bar";
  return "Côté droit, vers le bar";
}

const TABLES = POS.map(([n, x, y]) => ({ n, x, y, tier: tierOf(n), zone: zoneOf(n) }));
const fmt = (v) => v.toLocaleString("fr-FR").replace(/ | /g, " ") + " dh";

// ---------- SVG ----------
const NS = "http://www.w3.org/2000/svg";
const el = (tag, attrs = {}, parent) => {
  const e = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
  if (parent) parent.appendChild(e);
  return e;
};

const svg = document.getElementById("plan");
const state = { sel: null, extra: 0, filter: "all" };

function drawPlan() {
  // sol
  el("path", { class: "floor", d: "M10 232 H856 V1300 H754 V1098 H150 V842 H10 Z" }, svg);
  // espaces VIP
  el("path", { class: "vip", d: "M14 236 H276 V346 H140 V602 H14 Z" }, svg);
  el("rect", { class: "vip", x: 714, y: 380, width: 138, height: 508 }, svg);
  const vl = el("text", { class: "vip-label", transform: "translate(118 470) rotate(-90)" }, svg); vl.textContent = "ESPACE VIP";
  const vr = el("text", { class: "vip-label", transform: "translate(738 640) rotate(90)" }, svg); vr.textContent = "ESPACE VIP";
  // cabine, scène, piste
  const zones = [
    { x: 288, y: 244, w: 320, h: 56, label: "CABINE DJ" },
    { x: 286, y: 314, w: 340, h: 66, label: "SCÈNE" },
    { x: 232, y: 392, w: 384, h: 198, label: "PISTE DE DANSE" },
  ];
  for (const z of zones) {
    el("rect", { class: "zone zone-fill", x: z.x, y: z.y, width: z.w, height: z.h, rx: 3 }, svg);
    const t = el("text", { class: "zone-label", x: z.x + z.w / 2, y: z.y + z.h / 2 }, svg);
    t.textContent = z.label;
  }
  // bar
  el("path", { class: "zone", d: "M250 842 H602 V1000 H250 V958 H566 V884 H250 Z" }, svg);
  el("rect", { class: "zone zone-fill", x: 284, y: 886, width: 262, height: 70, rx: 3 }, svg);
  const tb = el("text", { class: "zone-label", x: 415, y: 921 }, svg); tb.textContent = "BAR";
  for (let x = 262; x <= 592; x += 41) {
    el("circle", { class: "stool", cx: x, cy: 828, r: 6 }, svg);
    el("circle", { class: "stool", cx: x, cy: 1006, r: 6 }, svg);
  }
  for (let y = 862; y <= 975; y += 28) el("circle", { class: "stool", cx: 620, cy: y, r: 6 }, svg);

  // tables
  for (const t of TABLES) {
    const tier = tierById[t.tier];
    const g = el("g", {
      class: "tbl", tabindex: "0", role: "button",
      "data-n": t.n, "data-tier": t.tier,
      "aria-label": `Table ${t.n}, ${fmt(tier.price)}, ${tier.incl}`,
      "aria-pressed": "false",
    }, svg);
    el("rect", { class: "halo", x: t.x - 27, y: t.y - 22, width: 54, height: 44, rx: 9 }, g);
    el("rect", { x: t.x - 21, y: t.y - 16, width: 42, height: 32, rx: 5, fill: tier.color }, g);
    const tx = el("text", { x: t.x, y: t.y + 1, fill: tier.ink }, g);
    tx.textContent = t.n;
    t.node = g;
    g.addEventListener("click", () => select(t.n, false));
    g.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); select(t.n, false); }
    });
  }
}

// ---------- filtres + liste ----------
const filters = document.querySelector(".filters");
const tiersBox = document.getElementById("tiers");

function drawLists() {
  for (const tier of TIERS) {
    const b = document.createElement("button");
    b.type = "button"; b.className = "chip"; b.dataset.tier = tier.id; b.setAttribute("aria-pressed", "false");
    b.innerHTML = `<i style="background:${tier.color}"></i>${fmt(tier.price)}`;
    filters.appendChild(b);
  }
  filters.addEventListener("click", (e) => {
    const b = e.target.closest(".chip"); if (!b) return;
    setFilter(b.dataset.tier);
  });

  for (const tier of TIERS) {
    const nums = TABLES.filter((t) => t.tier === tier.id).map((t) => t.n).sort((a, b) => a - b);
    const box = document.createElement("div");
    box.className = "tier"; box.dataset.tier = tier.id;
    box.innerHTML = `
      <div class="tier-head">
        <p class="tier-name"><i style="background:${tier.color}"></i>${tier.name === "VIP" ? "Table VIP" : "Table"}</p>
        <p class="tier-price">${fmt(tier.price)}</p>
      </div>
      <p class="tier-incl">${tier.incl}, ${SEATS} personnes</p>
      <div class="tier-nums" role="group" aria-label="Tables à ${fmt(tier.price)}">
        ${nums.map((n) => `<button type="button" data-n="${n}" aria-pressed="false" aria-label="Table ${n}">${n}</button>`).join("")}
      </div>`;
    tiersBox.appendChild(box);
  }
  tiersBox.addEventListener("click", (e) => {
    const b = e.target.closest("button[data-n]"); if (!b) return;
    select(+b.dataset.n, true);
  });
}

function setFilter(id) {
  state.filter = id;
  for (const c of filters.querySelectorAll(".chip")) {
    const on = c.dataset.tier === id;
    c.classList.toggle("is-on", on); c.setAttribute("aria-pressed", String(on));
  }
  for (const t of TABLES) t.node.classList.toggle("is-dim", id !== "all" && t.tier !== id);
}

// ---------- sélection ----------
const pick = document.getElementById("pick");

function select(n, fromList) {
  state.sel = TABLES.find((t) => t.n === n);
  state.extra = 0;
  for (const t of TABLES) {
    const on = t.n === n;
    t.node.classList.toggle("is-sel", on); t.node.setAttribute("aria-pressed", String(on));
  }
  for (const b of tiersBox.querySelectorAll("button[data-n]")) b.setAttribute("aria-pressed", String(+b.dataset.n === n));
  if (state.filter !== "all" && state.filter !== state.sel.tier) setFilter("all");
  renderPick();
  if (fromList || matchMedia("(max-width: 1000px)").matches) {
    const r = pick.getBoundingClientRect();
    if (r.top < 70 || r.bottom > innerHeight) pick.scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "center" });
  }
}

function message(t, tier, total) {
  const people = SEATS + state.extra;
  return `Bonjour, je souhaite réserver la table ${t.n} (${tier.name === "VIP" ? "VIP, " : ""}${fmt(tier.price)}, ${tier.incl}) pour le réveillon du 31 décembre 2026 au 555 Tanger, pour ${people} personnes. Total estimé : ${fmt(total)}.`;
}

function renderPick() {
  const t = state.sel; if (!t) return;
  const tier = tierById[t.tier];
  const total = tier.price + state.extra * ENTRY_EXTRA;
  const wa = RESERVATION.whatsapp
    ? `https://wa.me/${RESERVATION.whatsapp}?text=${encodeURIComponent(message(t, tier, total))}`
    : null;

  pick.innerHTML = `
    <div class="pick-top">
      <div>
        <p class="pick-name">Table ${t.n}</p>
        <p class="pick-zone">${t.zone}</p>
      </div>
      <p class="pick-price">${fmt(tier.price)}</p>
    </div>
    <dl class="pick-dl">
      <dt>Formule</dt><dd>${tier.name === "VIP" ? "VIP, " : ""}${tier.incl}</dd>
      <dt>Capacité</dt><dd>${SEATS} personnes</dd>
    </dl>
    <div class="stepper">
      <label for="extra-out">Personnes en plus<small>${fmt(ENTRY_EXTRA)} par personne</small></label>
      <div class="step-ctl">
        <button type="button" data-step="-1" aria-label="Retirer une personne" ${state.extra === 0 ? "disabled" : ""}>−</button>
        <output id="extra-out" aria-live="polite">${state.extra}</output>
        <button type="button" data-step="1" aria-label="Ajouter une personne" ${state.extra >= MAX_EXTRA ? "disabled" : ""}>+</button>
      </div>
    </div>
    <p class="pick-total"><span>Total estimé, ${SEATS + state.extra} personnes</span><strong>${fmt(total)}</strong></p>
    <div class="pick-actions">
      ${wa
        ? `<a class="btn btn-gold" href="${wa}" target="_blank" rel="noopener">Demander la table ${t.n} sur WhatsApp</a>`
        : `<a class="btn btn-gold" href="${RESERVATION.url}" target="_blank" rel="noopener">Réserver sur 555tanger.com</a>`}
      <button type="button" class="btn btn-ghost" data-copy>Copier ma demande</button>
    </div>
    <p class="pick-msg" role="status"></p>`;

  pick.querySelectorAll("[data-step]").forEach((b) =>
    b.addEventListener("click", () => {
      state.extra = Math.max(0, Math.min(MAX_EXTRA, state.extra + +b.dataset.step));
      renderPick();
      pick.querySelector(`[data-step="${b.dataset.step}"]`)?.focus();
    })
  );
  pick.querySelector("[data-copy]").addEventListener("click", async () => {
    const out = pick.querySelector(".pick-msg");
    try {
      await navigator.clipboard.writeText(message(t, tier, total));
      out.textContent = "Demande copiée. Collez-la dans votre message au 555.";
    } catch {
      out.textContent = "Copie impossible dans ce navigateur. Notez la table " + t.n + " et le total " + fmt(total) + ".";
    }
  });
}

drawPlan();
drawLists();
