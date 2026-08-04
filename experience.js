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
    date: { cs: "Květen 2026 - Duben 2027", en: "May 2026 - April 2027" },
    desc: {
      cs: "Správa a aktualizace webových stránek konference a registrační platformy, publikace novinek a spolupráce s registračním týmem. Řešení technických problémů a koordinace IT úkolů během příprav konference.",
      en: "Maintaining and updating the conference website and registration platform, publishing news and announcements, and collaborating with the Registration Team. Troubleshooting technical issues and coordinating IT tasks during the preparation of the conference."
    },
    logo: "obrazky/porgmun_logo.png", 
    initials: "PM"
  },
  {
    role: { cs: "Dobrovolník", en: "Volunteer" },
    org: { cs: "Czexperiment", en: "Czexperiment" },
    date: { cs: "2026", en: "2026" },
    desc: {
      cs: "Pomáhal jsem se štábem při natáčení pořadu Czexperiment.",
      en: "Helped out with the crew during the filming of the Czexperiment show."
    },
    logo: "obrazky/czexperiment_logo.jpeg",
    initials: "CZ"
  },
 // {
  //     role: { cs: "Fotograf", en: "Photographer" },
  //     org: { cs: "Struermun", en: "Struermun" },
  //     date: { cs: "2026 (snad)", en: "2026 (hopefully)" }, // TODO: uprav, až bude potvrzeno
  //     desc: {
  //       cs: "Fotodokumentace konference Struermun — zatím čekám na potvrzení.",
  //       en: "Photo coverage of the Struermun conference — still waiting on confirmation."
  //     },
  //     logo: null,
  //    initials: "S"
  //  },
  {
    role: { cs: "Front End Vývojář", en: "Front end Developer" },
    org: { cs: "Webová databáze seminárních prací", en: "Database of seminar papers" },
    date: { cs: "březen 2026 - Současnost", en: "March 2026 - Present" },
    desc: {
      cs: "S dvěma dalšími kamarády vytváříme webovou databázi pro studentský parlament naší školy.",
      en: "Building a web database for our school's student council together with two friends."
    },
    logo: "obrazky/porg_logo.jpeg",
    initials: "SP"
  },
  {
    role: { cs: "Brigády: administrativa → direct marketing a grafika", en: "Internships: admin → direct marketing & design" },
    org: { cs: "Naturamed", en: "Naturamed" },
    date: { cs: "2025 a 2026 (léto)", en: "2025 & 2026 (summer)" },
    desc: {
      cs: "Nejdřív krátká brigáda s daty v Excelu, o rok později design pro direct marketing.",
      en: "Started with a short data-entry internship in Excel, a year later redesigned product graphics for direct marketing."
    },
    logo: "obrazky/naturamed_logo.jpg",
    initials: "N"
  },
  {
    role: { cs: "Fotograf školních akcí", en: "School event photographer" },
    org: { cs: "PORG Libeň", en: "PORG Libeň" },
    date: { cs: "2025 — současnost", en: "2025 — present" },
    desc: {
      cs: "Fotím školní akce a výlety",
      en: "Shooting school events and trips"
    },
    logo: "obrazky/porg_logo.jpeg",
    initials: "P"
  },
  {
    role: { cs: "Zakladatel", en: "Founder" },
    org: { cs: "Buran production", en: "Buran production" },
    date: { cs: "2022 - Současnost", en: "2022 - Present" }, // TODO: doplň rok založení
    desc: {
      cs: "Filmové studio, které sponzoruje a distribuuje moje filmy.",
      en: "A film studio that sponsors and distributes my films."
    },
    logo: "obrazky/MB.png",
    initials: "BP"
  },
  //{
  //role: { cs: "Kameraman a střihač", en: "Camera operator & editor" },
  //org: { cs: "Vlastní filmové projekty", en: "Independent film projects" },
  //date: { cs: "od základní školy", en: "since elementary school" },
  //desc: {
  //  cs: "Začal jsem editací videí pro YouTube kanál kamaráda v Movavi, dnes natáčím a stříhám vlastní filmy v DaVinci Resolve.",
  //  en: "Started by editing videos for a friend's YouTube channel in Movavi, today I shoot and edit my own films in DaVinci Resolve."
  //  },
  //  logo: null,
  //  initials: "F"
  //}

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
