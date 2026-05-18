// ============================================================
//  lang.js  –  jazykový přepínač pro marekbures.cz
//  Umísti tento soubor do KOŘENE webu (vedle index.html)
// ============================================================

const TRANSLATIONS = {

  // ── GLOBÁLNÍ NAVBAR ──────────────────────────────────────
  "nav-about":    { cs: "O MNĚ",    en: "ABOUT" },
  "nav-projekty": { cs: "PROJEKTY", en: "PROJECTS" },
  "nav-contact":  { cs: "KONTAKT",  en: "CONTACT" },

  // ── FOOTER ───────────────────────────────────────────────
  "footer-copy": {
    cs: "Všechna práva vyhozena z okna.",
    en: "All rights thrown out the window."
  },

  // ── INDEX (o mně) ────────────────────────────────────────
  "index-subtitle": {
    cs: "Profesionalní flákač a <br> občasný kameraman a střihač",
    en: "Professional slacker and <br> occasional cameraman & editor"
  },
  "index-section-title": { cs: "O MNĚ", en: "ABOUT ME" },
  "index-bio": {
    cs: `Je mi 16 let a studuji na všeobecném gymáziu PORG Libeň. Videotvorbě se věnuji od svých (nevím, už jsem zapomněl) let, začal jsem nejdříve se střihem, kdy jsem na levném střihacím programu ze Steamu (Movavi), stříhal videa pro youtube kanál mého kamaráda. Řekl bych, že v té době byly moji velkou specialitou meme edity, teď už je prakticky nedělám, ale furt se jedná o můj oblíbený žánr, protože se na něm můžu vyblbnout.  <br><br> Následně jsem začal jezdit na filmový tábor, přesunul se na Davinci Resolve a natočil jsem tam spoustu filmů. Zároveň dál dělám i svoje mále projekty s kamarády, či se svojí mladší sestrou. <br><br>Taky se zajímám o počítače, které stavím a prodávám. Nedávno jsem set-upnul vlastní server s Ubuntu server na kterém si streamuju filmy a běží na něm třídní Minecraft server. <br><br> Jsem zakladatel studia Buran production (někdy také Buran studio), které sponzoruje a distribuje moje filmy. Jeho členy jsou já, Marek Bureš, Ramek Bureš, Marek Rubeš a Marek Buran.`,
    en: `I'm 16 and studying at PORG Libeň grammar school in Prague. I've been making videos for as long as I can remember — I started out editing, cutting footage for a friend's YouTube channel using a cheap Steam editor called Movavi. My specialty back then was meme edits; I don't really make them anymore, but it's still my favourite genre because I can go completely wild with it. <br><br> Then I started going to a film camp, switched to DaVinci Resolve and made a bunch of short films there. I also keep doing smaller projects with friends or my younger sister. <br><br> I'm also into computers — I build and sell PCs. Recently I set up my own Ubuntu server that I use for streaming movies and running a class Minecraft server. <br><br> I'm the founder of Buran Production (sometimes called Buran Studio), which sponsors and distributes my films. Members: me (Marek Bureš), Ramek Bureš, Marek Rubeš and Marek Buran.`
  },

  // ── PROJEKTY ─────────────────────────────────────────────
  "projekty-title": { cs: "MOJE PRÁCE", en: "MY WORK" },

  // popisky karet
  "card-coming-soon-title": { cs: "Coming Soon...", en: "Coming Soon..." },
  "card-coming-soon-desc": {
    cs: "Aktuálně mám rozepsaných několik scénářů a jedno video, které je ready na natáčení, idealně vyjde příští měsíc",
    en: "I currently have several scripts in progress and one video ready to shoot — ideally out next month."
  },
  "card-vareni-title": { cs: "Pečem na to!", en: "Let's Cook!" },
  "card-vareni-desc": {
    cs: "Videorecept na to, jak udělat kuře na paprice, natočili jsme v kvintě na projekt na hodinu českého jazyka, kdy jsme měli udělat video z vaření",
    en: "A video recipe for chicken paprikash, filmed in year 5 as a Czech-language class project where we had to make a cooking video."
  },
  "card-bohomila-title": { cs: "Dokument Bohumila", en: "The Bohumila Document" },
  "card-bohomila-desc": {
    cs: "Horror, který jsem natočil s kamarádkou a sestrou na silvestr 24/25. Na tomto minifilmu jsem dělal kameru střih a vše kolem, moje sestra se ujala režie a také přišla s návrhem. Film jsme natočili asi za 2 hodiny a záběrů nebylo mnoho, tudíž jsem byl nucen trochu experimentovat.",
    en: "A horror short I filmed with a friend and my sister on New Year's Eve 2024/25. I handled camera, editing and everything in between; my sister directed and came up with the concept. We shot the whole thing in about 2 hours with limited footage, so I had to get a bit experimental."
  },
  "card-wadlec-title": { cs: "Wadlec on school", en: "Wadlec on School" },
  "card-wadlec-desc": {
    cs: "Projekt inspirovaný seriálem \"Cunk on earth\" na netflixu. Minifilm vznikal na hodinách angličtiny v kvartě. Minifilm jsem prakticky skoro celý napsal, poté režíroval natáčel i stříhal.",
    en: "Inspired by Netflix's \"Cunk on Earth\". Made during English lessons in year 4 — I wrote almost the whole script, then directed, shot and edited it."
  },
  "card-amogus-title": { cs: "Amogus the movie", en: "Amogus the Movie" },
  "card-amogus-desc": {
    cs: "Film inspirovaný PC hrou Among Us, který jsem natáčel spolu se spolužáky ve volném čase na podzimní ŠvP v Tercii",
    en: "Inspired by the PC game Among Us, filmed with classmates in our free time during autumn school trip in year 3."
  },
  "card-debata-title": { cs: "Best of: Školní debata", en: "Best of: School Debate" },
  "card-debata-desc": {
    cs: "Krátký sestřih debaty z hodiny filozofie",
    en: "A short highlight reel from a philosophy class debate."
  },
  "card-shock-title": { cs: "#Shock", en: "#Shock" },
  "card-shock-desc": {
    cs: "Film ve stylu reality show z filmového tábora Aertěk 2025, normálně se zde takovéto filmy nenatáči, ale my jsme se rozhodli pro styl reality show (něco jako survivor) s kamerou jako ze seriálu the office",
    en: "A reality-show-style film from Aertěk film camp 2025. Not the usual format for the camp, but we went for a Survivor vibe shot with an Office-style handheld camera."
  },
  "card-burt-title": { cs: "Buřt", en: "Sausage" },
  "card-burt-desc": {
    cs: "Krátký skecth z filmového tábora Aertěk 2025",
    en: "A short sketch from Aertěk film camp 2025."
  },
  "card-romeo-title": { cs: "Romeo a tři Julie", en: "Romeo and Three Juliets" },
  "card-romeo-desc": {
    cs: "Hlavní film z Aertěku 2024. Film je parodií na shakespearovskou hru Romeo a Julie",
    en: "The main film from Aertěk 2024 — a parody of Shakespeare's Romeo and Juliet."
  },
  "card-poklad-title": { cs: "Poklad", en: "The Treasure" },
  "card-poklad-desc": {
    cs: "Další horror, tentokrát natočen na projektu pana profesora Andrase, na projektu jsem pracoval jako kameraman a střihač (furt tam nejsou zavěřečné titulky pane profesore(a asi nikdy nebudou))",
    en: "Another horror, this time made for a project by Mr Andras. I worked as cameraman and editor. (The end credits are still missing, sir. And probably always will be.)"
  },
  "card-sauny-title": { cs: "Stanzava sauny", en: "Stanzava Saunas" },
  "card-sauny-desc": {
    cs: "Další tentokrát nejnovější (25/26) film z mé tradice točit něco na silvestra, jedná se o kratičkou reklamu na sauny. Natočili jsme to asi za 15 minut a já potom asi za další dvě hoďky dostříhal",
    en: "The latest entry in my New Year's Eve filming tradition (2025/26) — a short sauna ad. We shot it in about 15 minutes and I edited it in roughly two more hours."
  },
  "card-voda-title": { cs: "Reklama na vodu", en: "Water Ad" },
  "card-voda-desc": {
    cs: "Reklama na kohoutkovou vodu z projektu pana profesora Jindry z podzimní ŠvP v Tercii",
    en: "A tap-water ad made for Mr Jindra's project during the autumn school trip in year 3."
  },
  "card-mimina-title": { cs: "Vraždění mimin (z mouky)", en: "Murdering Flour Babies" },
  "card-mimina-desc": {
    cs: "Sestřih z toho kdy se pár spolužáků rozhodlo zničit svoje mimina",
    en: "A compilation of classmates deciding to destroy their flour babies."
  },
  "card-pingpong-title": { cs: "Reportáž o ping pongu", en: "Ping-Pong Report" },
  "card-pingpong-desc": {
    cs: "Další ze série sketchu s mojí sestrou a kamarádkou na silvestra",
    en: "Another sketch from my New Year's Eve series with my sister and a friend."
  },
  "card-autak-title": { cs: "Auťák", en: "The Car" },
  "card-autak-desc": {
    cs: "Sketch z filmového tábora Aertěk 2024, na tomto sketchi jsem pracoval jako zvukař",
    en: "A sketch from Aertěk film camp 2024 — I worked as sound operator."
  },
  "card-kompost-title": { cs: "Kompost", en: "Compost" },
  "card-kompost-desc": {
    cs: "Sketch z filmového tábora Aertěk 2023, jedná se o reportáž o Ekologovi s náhlím zvratem. Zde jsem pracoval jako kameraman",
    en: "A sketch from Aertěk film camp 2023 — a reporter piece about an Ecologist with a sudden twist. I worked as cameraman."
  },
  "card-western-title": { cs: "Souboj v kaňonu křečků", en: "Showdown in Hamster Canyon" },
  "card-western-desc": {
    cs: "Hlavní film z Aertěku 2023 (můj první) Zde jsem pracoval jako kameraman",
    en: "The main film from Aertěk 2023 — my very first. I worked as cameraman."
  },

  // ── KONTAKT ──────────────────────────────────────────────
  "contact-title":    { cs: "KONTAKT",  en: "CONTACT" },
  "contact-subtitle": {
    cs: "Pokud mi chcete něco napsat feel free to do so, rád si přečtu vaše zprávy a odpovím na ně co nejdříve",
    en: "Feel free to reach out — I'll read your message and get back to you as soon as I can."
  },
  "form-name":    { cs: "Jméno",      en: "Name" },
  "form-email":   { cs: "Email",      en: "Email" },
  "form-message": { cs: "Zpráva...",  en: "Message..." },
  "form-submit":  { cs: "POSLAT",     en: "SEND" },

  // ── THANKS ───────────────────────────────────────────────
  "thanks-title":   { cs: "DÍKY!",    en: "THANKS!" },
  "thanks-subtitle": {
    cs: "Tvoje zpráva byla úspěšně odeslána. <br> Ozvu se co nejdřív (pokud to nebude spam 😄)",
    en: "Your message was sent successfully. <br> I'll get back to you soon (unless it's spam 😄)"
  },
  "thanks-back":  { cs: "⬅ Zpět na hlavní stránku", en: "⬅ Back to home" },
  "thanks-again": { cs: "📩 Poslat další zprávu",    en: "📩 Send another message" },
};

// ── Pomocné funkce ────────────────────────────────────────────────────────────

function getLang() {
  return localStorage.getItem("lang") || "cs";
}

function setLang(lang) {
  localStorage.setItem("lang", lang);
}

// Přeloží jeden element podle data-i18n atributu
function translateEl(el, lang) {
  const key = el.dataset.i18n;
  if (!key || !TRANSLATIONS[key]) return;
  const text = TRANSLATIONS[key][lang];
  if (text === undefined) return;
  // placeholder pro inputy/textarea
  if (el.tagName === "INPUT" || el.tagName === "TEXTAREA") {
    el.placeholder = text;
  } else {
    el.innerHTML = text;
  }
}

// Přeloží celou stránku
function applyLang(lang) {
  document.querySelectorAll("[data-i18n]").forEach(el => translateEl(el, lang));

  // Aktualizuj tlačítko přepínače
  const btn = document.getElementById("lang-toggle");
  if (btn) btn.textContent = lang === "cs" ? "EN" : "CZ";

  // Nastav <html lang="">
  document.documentElement.lang = lang;
}

// ── Inicializace (spouští se po DOMContentLoaded) ────────────────────────────

function initLang() {
  const lang = getLang();
  applyLang(lang);

  const btn = document.getElementById("lang-toggle");
  if (btn) {
    btn.addEventListener("click", () => {
      const current = getLang();
      const next = current === "cs" ? "en" : "cs";
      setLang(next);
      applyLang(next);
    });
  }
}

document.addEventListener("DOMContentLoaded", initLang);