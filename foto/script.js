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
    org: { cs: "StruerMUN", en: "StruerMUN" },
    date: { cs: "říjen 2026", en: "October 2026" },
    desc: {
      cs: "Tři dny jsem fotil konferenci StruerMUN v dánském Strueru, hlavně výbor Historical Security Council.",
      en: "Spent three days shooting the StruerMUN conference in Struer, Denmark, mostly the Historical Security Council."
    },
    logo: "../obrazky/struermun_logo.jpeg",
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
    logo: "../obrazky/porg_logo.jpeg",
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

// ─────────────────────────────────────────────────────────────────────────
// GALLERY DATA — same idea as TIMELINE. Add or remove a block to change
// which photos are shown. The files live in ../obrazky/struermun/
//
// Fields:
//   file  — file name inside that folder
//   size  — "wide" for a big tile, "tall" for a vertical photo,
//           leave it out for a normal tile
//   alt   { cs, en } — short description of the photo
//
// Order matters on desktop: wide + tall + two normal tiles fill a block
// with no gaps, so do three tall tiles in a row, and three normal tiles
// fill a single row.
// ─────────────────────────────────────────────────────────────────────────

const GALLERY = [
  {
    file: "DSC07169.jpg", size: "tall",
    alt: { cs: "Bílý kostým mezi prázdnými židlemi před zahajovacím ceremoniálem", en: "A white costume among the empty chairs before the opening ceremony" }
  },
  {
    file: 'DSC07176.jpg"">', size: "wide",
    alt: { cs: "Delegáti Historical Security Council v kloboucích na zahajovacím ceremoniálu", en: "Historical Security Council delegates in their hats at the opening ceremony" }
  },
  {
    file: "DSC07211.jpg",
    alt: { cs: "Prázdný sál s cedulkami zemí ještě před začátkem", en: "The hall with country placards before anyone arrived" }
  },
  {
    file: "DSC07322.jpg",
    alt: { cs: "Zaplněný sál při zahájení konference", en: "A full hall at the opening of the conference" }
  },

  {
    file: "DSC07525.jpg", size: "tall",
    alt: { cs: "Proslov na pódiu při zahajovacím ceremoniálu", en: "A speech on stage at the opening ceremony" }
  },
  {
    file: "DSC07478.jpg", size: "tall",
    alt: { cs: "Projev za Brazílii u řečnického pultu", en: "Speaking for Brazil at the podium" }
  },
  {
    file: "DSC07879.jpg", size: "tall",
    alt: { cs: "Zamyšlení s kladívkem u brady", en: "Deep in thought, gavel resting on the chin" }
  },

  {
    file: "DSC07824.jpg", size: "wide",
    alt: { cs: "Vyjednávání u notebooku v kostýmu a papírové koruně", en: "Negotiating over a laptop in costume and a paper crown" }
  },
  {
    file: "DSC08872.jpg", size: "tall",
    alt: { cs: "Mapa Evropy na tabletu jako argument v debatě", en: "A map of Europe on a tablet, used as an argument" }
  },
  {
    file: "DSC08130.jpg",
    alt: { cs: "Zvednuté ruce v jednacím sále", en: "Hands in the air in the committee room" }
  },
  {
    file: "DSC08203.jpg",
    alt: { cs: "Tři delegáti dolaďují návrh u řečnického pultu", en: "Three delegates polishing a draft at the podium" }
  },

  {
    file: "DSC08636.jpg", size: "tall",
    alt: { cs: "Meč a fialový klobouk uprostřed jednání", en: "A sword and a purple sequin hat in the middle of a session" }
  },
  {
    file: "DSC09085.jpg", size: "wide",
    alt: { cs: "Projev s korunou na hlavě při závěrečném ceremoniálu", en: "A speech with a crown on at the closing ceremony" }
  },
  {
    file: "DSC08493.jpg",
    alt: { cs: "Fialový klobouk u pultu a na tabuli seznam: voda, čaj, sušenky", en: "A purple hat at the podium and a chalkboard list: water, tea, cookies" }
  },
  {
    file: "DSC08616.jpg",
    alt: { cs: "Dva delegáti před promítnutým návrhem rezoluce", en: "Two delegates studying a draft resolution on the screen" }
  }
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

function renderGallery() {
  const container = document.getElementById("gallery");
  if (!container) return;

  const lang = currentLang();
  container.innerHTML = "";

  GALLERY.forEach(photo => {
    const src = `../obrazky/${photo.file}`;

    const el = document.createElement("a");
    el.className = `photo-tile ${photo.size || ""}`;
    el.href = src;
    el.target = "_blank";
    el.innerHTML = `<img src="${src}" alt="${photo.alt[lang]}" loading="lazy">`;

    container.appendChild(el);
  });
}

document.addEventListener("DOMContentLoaded", renderTimeline);
document.addEventListener("langchange", renderTimeline);
document.addEventListener("DOMContentLoaded", renderGallery);
document.addEventListener("langchange", renderGallery);
