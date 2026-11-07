/* Cabinet Clash — line icons for ministries, deck modes and home options (replace the emoji). */
(function () {
  'use strict';
  const CC = window.CC;
  const svg = (d) => `<svg class="ico" viewBox="0 0 24 24" aria-hidden="true">${d}</svg>`;
  const ICONS = {
    L: svg('<path d="M3 21h18M5 21v-9m14 9v-9M9.5 21v-9m5 9v-9M3 9.5 12 4l9 5.5z"/>'),
    E: svg('<ellipse cx="12" cy="6" rx="7" ry="2.8"/><path d="M5 6v6c0 1.6 3.1 2.8 7 2.8s7-1.2 7-2.8V6M5 12v6c0 1.6 3.1 2.8 7 2.8s7-1.2 7-2.8v-6"/>'),
    F: svg('<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.4 2.6 3.7 5.6 3.7 9s-1.3 6.4-3.7 9c-2.4-2.6-3.7-5.6-3.7-9S9.6 5.6 12 3z"/>'),
    I: svg('<path d="m12 3 2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.4l-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z"/>'),
    J: svg('<path d="M12 4v16M8 20h8M5 7h14M7 7l-3 6a3 3 0 0 0 6 0zM17 7l-3 6a3 3 0 0 0 6 0z"/>'),
    D: svg('<path d="m12 3 8 3v6c0 4.5-3.4 8-8 9-4.6-1-8-4.5-8-9V6z"/>'),
    S: svg('<path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/><path d="M12 9.5v4.5M9.8 11.8h4.4"/>'),
    legends: svg('<path d="m12 3 2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.4l-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z"/>'),
    world: svg('<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.4 2.6 3.7 5.6 3.7 9s-1.3 6.4-3.7 9c-2.4-2.6-3.7-5.6-3.7-9S9.6 5.6 12 3z"/>'),
    countries: svg('<path d="M5 21V4M5 4h12l-2.5 4L17 12H5"/>'),
    continents: svg('<path d="m3 6 6-2 6 2 6-2v14l-6 2-6-2-6 2zM9 4v14M15 6v14"/>'),
    modern: svg('<rect x="7" y="3" width="10" height="18" rx="2"/><path d="M11 18h2"/>'),
    history: svg('<path d="M5 4.5A1.5 1.5 0 0 1 6.5 3H19v15H6.5A1.5 1.5 0 0 0 5 19.5zM5 19.5A1.5 1.5 0 0 0 6.5 21H19M9 7h6"/>'),
    solo: svg('<circle cx="12" cy="8" r="3.5"/><path d="M5 20c0-3.9 3.1-7 7-7s7 3.1 7 7"/>'),
    local: svg('<circle cx="9" cy="8" r="3"/><circle cx="17" cy="9" r="2.4"/><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6M15.5 14.3c3 .2 5.5 2.4 5.5 5.7"/>'),
    online: svg('<path d="M2.5 9a14 14 0 0 1 19 0M5.5 12.5a9.5 9.5 0 0 1 13 0M8.8 16a5 5 0 0 1 6.4 0"/><circle cx="12" cy="19.4" r="1" fill="currentColor"/>'),
  };
  CC.SEATS.forEach((s) => { s.icon = ICONS[s.k]; });
  CC.MODES.forEach((m) => { if (ICONS[m.k]) m.icon = ICONS[m.k]; });
  CC.ICONS = ICONS;
})();
