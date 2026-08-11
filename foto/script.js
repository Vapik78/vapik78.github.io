// ─────────────────────────────────────────────────────────────────────────
// TIMELINE DATA — this is the only thing you need to touch to add,
// remove or reorder entries. Newest entry goes FIRST (top of the list).
//
// Fields:
//   role    { cs, en } — what you did there (e.g. "Fotograf školních akcí")
//   org     { cs, en } — name of the school / event / organization
//   date    { cs, en } — e.g. "2025 — současnost" or "2026"
//   desc    { cs, en } — one short sentence about it (optional, can be "")
//   logo    — path to a logo image, e.g. "../obrazky/porg-logo.png"
//             leave as null to just show the initials below instead
//   initials — 1-3 letters shown if there's no logo yet
// ─────────────────────────────────────────────────────────────────────────

const TIMELINE = [
  {
    role: { cs: "Fotograf", en: "Photographer" },
    org: { cs: "Struermun", en: "Struermun" },
    date: { cs: "2026 (snad)", en: "2026 (hopefully)" }, // TODO: uprav, až bude potvrzeno
    desc: {
      cs: "Fotodokumentace konference Struermun — zatím čekám na potvrzení.",
      en: "Photo coverage of the Struermun conference — still waiting on confirmation."
    },
    logo: null,
    initials: "S"
  },
  {
    role: { cs: "Fotograf školních akcí", en: "School event photographer" },
    org: { cs: "PORG Libeň", en: "PORG Libeň" },
    date: { cs: "2025 — současnost", en: "2025 — present" },
    desc: {
      cs: "Fotím školní akce, výlety a eventy pro PORG Libeň.",
      en: "Shooting school events, trips and gatherings for PORG Libeň."
    },
    logo: null,
    initials: "P"
  }

  // Chceš přidat další zastávku? Zkopíruj blok výše a uprav ho, třeba:
  // {
  //   role: { cs: "Fotograf", en: "Photographer" },
  //   org: { cs: "Název akce", en: "Event name" },
  //   date: { cs: "2027", en: "2027" },
  //   desc: { cs: "Krátký popis.", en: "Short description." },
  //   logo: "../obrazky/nazev-loga.png",
  //   initials: "NA"
  // },
];

function currentLang() {
  // getLang() is defined in /lang.js, loaded before this file
  return typeof getLang === "function" ? getLang() : "cs";
}

function renderTimeline() {
  const container = document.getElementById("timeline");
  if (!container) return;

  const lang = currentLang();
  container.innerHTML = "";

  TIMELINE.forEach(item => {
    const el = document.createElement("div");
    el.className = "timeline-item";

    const logoInner = item.logo
      ? `<img src="${item.logo}" alt="${item.org[lang]}">`
      : (item.initials || "?");

    el.innerHTML = `
      <div class="timeline-logo">${logoInner}</div>
      <div class="timeline-body">
        <p class="timeline-role">${item.role[lang]}</p>
        <p class="timeline-org">${item.org[lang]}</p>
        <p class="timeline-date">${item.date[lang]}</p>
        ${item.desc && item.desc[lang] ? `<p class="timeline-desc">${item.desc[lang]}</p>` : ""}
      </div>
    `;

    container.appendChild(el);
  });
}

document.addEventListener("DOMContentLoaded", renderTimeline);
document.addEventListener("langchange", renderTimeline);
