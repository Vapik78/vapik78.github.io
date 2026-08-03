// ─────────────────────────────────────────────────────────────────────────
// EXPERIENCE DATA — stejný princip jako u foto/script.js. Nejnovější
// položka je nahoře. Chceš přidat/upravit záznam? Zkopíruj blok a uprav.
//
// Roky u některých položek jsou schválně vágní ("od útlého věku" apod.),
// protože přesná data nebyla v bio uvedená — klidně je uprav na konkrétní
// roky, jakmile je budeš znát.
// ─────────────────────────────────────────────────────────────────────────

const EXPERIENCE = [
  {
    role: { cs: "Člen IT týmu", en: "IT team member" },
    org: { cs: "PorgMUN", en: "PorgMUN" },
    date: { cs: "2027 (plánováno)", en: "2027 (planned)" },
    desc: {
      cs: "Budu součástí IT týmu, který zajišťuje technické zázemí konference PorgMUN.",
      en: "Will be part of the IT team handling the technical side of the PorgMUN conference."
    },
    logo: null,
    initials: "PM"
  },
  {
    role: { cs: "Dobrovolník / štáb", en: "Volunteer / crew" },
    org: { cs: "Czexperiment", en: "Czexperiment" },
    date: { cs: "2026", en: "2026" },
    desc: {
      cs: "Pomáhal jsem se štábem při natáčení pořadu Czexperiment.",
      en: "Helped out with the crew during the filming of the Czexperiment show."
    },
    logo: null,
    initials: "CZ"
  },
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
    role: { cs: "Vývojář", en: "Developer" },
    org: { cs: "Studentský parlament (školní projekt)", en: "Student Council (school project)" },
    date: { cs: "2026 (2. pololetí)", en: "2026 (spring semester)" },
    desc: {
      cs: "S dvěma dalšími kamarády jsme vytvořili webovou databázi pro studentský parlament naší školy.",
      en: "Built a web database for our school's student council together with two friends."
    },
    logo: null,
    initials: "SP"
  },
  {
    role: { cs: "Brigády: administrativa → direct marketing a grafika", en: "Internships: admin → direct marketing & design" },
    org: { cs: "Naturamed", en: "Naturamed" },
    date: { cs: "2025 a 2026 (léto)", en: "2025 & 2026 (summer)" },
    desc: {
      cs: "Nejdřív krátká brigáda s daty v Excelu, o rok později přepracování grafiky produktů pro direct marketing.",
      en: "Started with a short data-entry internship in Excel, a year later redesigned product graphics for direct marketing."
    },
    logo: null,
    initials: "N"
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
  },
  {
    role: { cs: "Zakladatel", en: "Founder" },
    org: { cs: "Buran production", en: "Buran production" },
    date: { cs: "probíhá", en: "ongoing" }, // TODO: doplň rok založení
    desc: {
      cs: "Filmové studio, které sponzoruje a distribuuje moje filmy.",
      en: "A film studio that sponsors and distributes my films."
    },
    logo: null,
    initials: "BP"
  },
  {
    role: { cs: "Kameraman a střihač", en: "Camera operator & editor" },
    org: { cs: "Vlastní filmové projekty", en: "Independent film projects" },
    date: { cs: "od základní školy", en: "since elementary school" },
    desc: {
      cs: "Začal jsem editací videí pro YouTube kanál kamaráda v Movavi, dnes natáčím a stříhám vlastní filmy v DaVinci Resolve.",
      en: "Started by editing videos for a friend's YouTube channel in Movavi, today I shoot and edit my own films in DaVinci Resolve."
    },
    logo: null,
    initials: "F"
  }

  // Další zastávka? Zkopíruj a uprav třeba takto:
  // {
  //   role: { cs: "Pozice", en: "Role" },
  //   org: { cs: "Název", en: "Name" },
  //   date: { cs: "2027", en: "2027" },
  //   desc: { cs: "Krátký popis.", en: "Short description." },
  //   logo: "obrazky/nazev-loga.png",
  //   initials: "NA"
  // },
];

function currentLang() {
  return typeof getLang === "function" ? getLang() : "cs";
}

function renderExperience() {
  const container = document.getElementById("experience-timeline");
  if (!container) return;

  const lang = currentLang();
  container.innerHTML = "";

  EXPERIENCE.forEach(item => {
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

document.addEventListener("DOMContentLoaded", () => {
  renderExperience();

  const toggle = document.getElementById("lang-toggle");
  const toggleMobile = document.getElementById("lang-toggle-mobile");
  if (toggle) toggle.addEventListener("click", renderExperience);
  if (toggleMobile) toggleMobile.addEventListener("click", renderExperience);
});
