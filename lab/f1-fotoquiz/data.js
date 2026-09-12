/* =========================================================================
   F1 PHOTOQUIZ: SHARED DRIVER DATABASE
   -------------------------------------------------------------------------
   Both single/script.js and multiplayer/script.js load this same file, so
   there is only one place to manage drivers, themes and photos.

   HOW TO ADD A PHOTO
   Drop an image into the /photoquiz/photos/ folder named exactly
   "<id>.jpg" (matching a driver's "id" below; .png/.webp work too, just
   update that driver's "photo" path to match). Until a real photo exists,
   the app shows a placeholder card with the driver's initials instead, so
   nothing breaks. You can add photos gradually, in any order.

   HOW TO ADD A NEW THEME
   1. Add an entry to CATEGORIES below (id, label, description).
   2. Tag any driver with that id in their "categories" array.
   Both quiz modes pick up the new theme automatically. No other changes
   needed.

   HOW TO ADD A NEW DRIVER
   Add an object to DRIVERS with a unique id, full name, one or more
   category ids, and a photo path following the pattern above.
   ========================================================================= */

const CATEGORIES = [
  {
    id: "all",
    label: "All Categories",
    description: "Every driver in the database, across every era."
  },
  {
    id: "2020s",
    label: "Drivers of the 2020s",
    description: "Drivers whoa have raced more than 10 races in the 2020s (2020–present)."
  },
  {
    id: "2010s",
    label: "Drivers of the 2010s",
    description: "Driver who raced in the 2010s (2010–2019)."
  },
  {
    id: "2000s",
    label: "Drivers of the 2000s",
    description: "Driver who raced in the early 2000s"
  },
  {
    id: "history",
    label: "History Drivers",
    description: "Legends from before 2000."
  },
  {
    id: "champions",
    label: "World Champions",
    description: "Every driver who has won an F1 world championship."
  }
];

const DRIVERS = [
  // --- 2020s ---
  { id:"max_verstappen",     name:"Max Verstappen",     categories:["2020s","champions"],              photo:"../photos/max_verstappen.jpg" },
  { id:"lewis_hamilton",     name:"Lewis Hamilton",     categories:["2020s","2010s","2000s","champions"], photo:"../photos/lewis_hamilton.jpg" },
  { id:"charles_leclerc",    name:"Charles Leclerc",    categories:["2020s","2010s"],                   photo:"../photos/charles_leclerc.jpg" },
  { id:"lando_norris",       name:"Lando Norris",       categories:["2020s","champions"],               photo:"../photos/lando_norris.jpg" },
  { id:"george_russell",     name:"George Russell",     categories:["2020s"],                           photo:"../photos/george_russell.jpg" },
  { id:"carlos_sainz",       name:"Carlos Sainz",       categories:["2020s","2010s"],                   photo:"../photos/carlos_sainz.jpg" },
  { id:"sergio_perez",       name:"Sergio Pérez",       categories:["2020s","2010s"],                   photo:"../photos/sergio_perez.jpg" },
  { id:"fernando_alonso",    name:"Fernando Alonso",    categories:["2020s","2010s","2000s","champions"], photo:"../photos/fernando_alonso.jpg" },
  { id:"oscar_piastri",      name:"Oscar Piastri",      categories:["2020s"],                           photo:"../photos/oscar_piastri.jpg" },
  { id:"pierre_gasly",       name:"Pierre Gasly",       categories:["2020s","2010s"],                   photo:"../photos/pierre_gasly.jpg" },
  { id:"esteban_ocon",       name:"Esteban Ocon",       categories:["2020s","2010s"],                   photo:"../photos/esteban_ocon.jpg" },
  { id:"yuki_tsunoda",       name:"Yuki Tsunoda",       categories:["2020s"],                           photo:"../photos/yuki_tsunoda.jpg" },
  { id:"valtteri_bottas",    name:"Valtteri Bottas",    categories:["2020s","2010s"],                   photo:"../photos/valtteri_bottas.jpg" },
  { id:"kevin_magnussen",    name:"Kevin Magnussen",    categories:["2020s","2010s"],                   photo:"../photos/kevin_magnussen.jpg" },
  { id:"alexander_albon",    name:"Alexander Albon",    categories:["2020s"],                           photo:"../photos/alexander_albon.jpg" },
  { id:"lance_stroll",       name:"Lance Stroll",       categories:["2020s","2010s"],                   photo:"../photos/lance_stroll.jpg" },
  { id:"nico_hulkenberg",    name:"Nico Hülkenberg",    categories:["2020s","2010s","2000s"],           photo:"../photos/nico_hulkenberg.jpg" },
  { id:"daniel_ricciardo",   name:"Daniel Ricciardo",   categories:["2020s","2010s"],                   photo:"../photos/daniel_ricciardo.jpg" },
  { id:"zhou_guanyu",        name:"Zhou Guanyu",        categories:["2020s"],                           photo:"../photos/zhou_guanyu.jpg" },
  { id:"liam_lawson",        name:"Liam Lawson",        categories:["2020s"],                           photo:"../photos/liam_lawson.jpg" },
  { id:"logan_sargeant",     name:"Logan Sargeant",     categories:["2020s"],                           photo:"../photos/logan_sargeant.jpg" },
  { id:"kimi_antonelli",     name:"Kimi Antonelli",     categories:["2020s"],                           photo:"../photos/kimi_antonelli.jpg" },
  { id:"gabriel_bortoleto",  name:"Gabriel Bortoleto",  categories:["2020s"],                           photo:"../photos/gabriel_bortoleto.jpg" },
  { id:"isack_hadjar",       name:"Isack Hadjar",       categories:["2020s"],                           photo:"../photos/isack_hadjar.jpg" },
  { id:"oliver_bearman",     name:"Oliver Bearman",     categories:["2020s"],                           photo:"../photos/oliver_bearman.jpg" },
  { id:"arvid_lindblad",     name:"Arvid Lindblad",     categories:["2020s"],                           photo:"../photos/arvid_lindblad.jpg" },
  { id:"franco_colapinto",   name:"Franco Colapinto",   categories:["2020s"],                           photo:"../photos/franco_colapinto.jpg" },
  { id:"jack_doohan",        name:"Jack Doohan",        categories:["2020s"],                           photo:"../photos/jack_doohan.jpg" },
  { id:"nyck_de_vries",      name:"Nyck de Vries",      categories:["2020s"],                           photo:"../photos/nyck_de_vries.jpg" },
  { id:"nikita_mazepin",     name:"Nikita Mazepin",     categories:["2020s"],                           photo:"../photos/nikita_mazepin.jpg" },
  { id:"nicholas_latifi",    name:"Nicholas Latifi",    categories:["2020s"],                           photo:"../photos/nicholas_latifi.jpg" },
  { id:"antonio_giovinazzi", name:"Antonio Giovinazzi", categories:["2020s","2010s"],                   photo:"../photos/antonio_giovinazzi.jpg" },
  
  
  
  
  
  
  // --- 2010s ---
  { id:"sebastian_vettel",   name:"Sebastian Vettel",   categories:["2020s","2010s","2000s","champions"],       photo:"../photos/sebastian_vettel.jpg" },
  { id:"kimi_raikkonen",     name:"Kimi Räikkönen",     categories:["2020s","2010s","2000s","champions"],       photo:"../photos/kimi_raikkonen.jpg" },
  { id:"nico_rosberg",       name:"Nico Rosberg",       categories:["2010s","2000s","champions"],       photo:"../photos/nico_rosberg.jpg" },
  { id:"jenson_button",      name:"Jenson Button",      categories:["2010s","2000s","champions"],       photo:"../photos/jenson_button.jpg" },
  { id:"mark_webber",        name:"Mark Webber",        categories:["2010s","2000s"],                   photo:"../photos/mark_webber.jpg" },
  { id:"felipe_massa",       name:"Felipe Massa",       categories:["2010s","2000s"],                   photo:"../photos/felipe_massa.jpg" },
  { id:"romain_grosjean",    name:"Romain Grosjean",    categories:["2010s"],                           photo:"../photos/romain_grosjean.jpg" },
  { id:"daniil_kvyat",       name:"Daniil Kvyat",       categories:["2010s"],                           photo:"../photos/daniil_kvyat.jpg" },
  { id:"stoffel_vandoorne",  name:"Stoffel Vandoorne",  categories:["2010s"],                           photo:"../photos/stoffel_vandoorne.jpg" },
  { id:"jolyon_palmer",      name:"Jolyon Palmer",      categories:["2010s"],                           photo:"../photos/jolyon_palmer.jpg" },
  { id:"marcus_ericsson",    name:"Marcus Ericsson",    categories:["2010s"],                           photo:"../photos/marcus_ericsson.jpg" },
  { id:"pastor_maldonado",   name:"Pastor Maldonado",   categories:["2010s"],                           photo:"../photos/pastor_maldonado.jpg" },
  { id:"robert_kubica",      name:"Robert Kubica",      categories:["2010s","2000s"],                   photo:"../photos/robert_kubica.jpg" },

  // --- 2000s ---
  { id:"michael_schumacher", name:"Michael Schumacher", categories:["2000s","champions"],               photo:"../photos/michael_schumacher.jpg" },
  { id:"juan_pablo_montoya", name:"Juan Pablo Montoya", categories:["2000s"],                           photo:"../photos/juan_pablo_montoya.jpg" },
  { id:"rubens_barrichello", name:"Rubens Barrichello", categories:["2000s"],                           photo:"../photos/rubens_barrichello.jpg" },
  { id:"david_coulthard",    name:"David Coulthard",    categories:["2000s"],                           photo:"../photos/david_coulthard.jpg" },
  { id:"ralf_schumacher",    name:"Ralf Schumacher",    categories:["2000s"],                           photo:"../photos/ralf_schumacher.jpg" },
  { id:"jarno_trulli",       name:"Jarno Trulli",       categories:["2000s"],                           photo:"../photos/jarno_trulli.jpg" },
  { id:"giancarlo_fisichella", name:"Giancarlo Fisichella", categories:["2000s"],                       photo:"../photos/giancarlo_fisichella.jpg" },
  { id:"heikki_kovalainen",  name:"Heikki Kovalainen",  categories:["2000s"],                           photo:"../photos/heikki_kovalainen.jpg" },
  { id:"mika_hakkinen",      name:"Mika Häkkinen",      categories:["2000s","history","champions"],     photo:"../photos/mika_hakkinen.jpg" },
  { id:"jacques_villeneuve", name:"Jacques Villeneuve", categories:["2000s","history","champions"],     photo:"../photos/jacques_villeneuve.jpg" },

  // --- History (pre-2000) ---
  { id:"ayrton_senna",       name:"Ayrton Senna",       categories:["history","champions"],             photo:"../photos/ayrton_senna.jpg" },
  { id:"alain_prost",        name:"Alain Prost",        categories:["history","champions"],             photo:"../photos/alain_prost.jpg" },
  { id:"niki_lauda",         name:"Niki Lauda",         categories:["history","champions"],             photo:"../photos/niki_lauda.jpg" },
  { id:"james_hunt",         name:"James Hunt",         categories:["history","champions"],             photo:"../photos/james_hunt.jpg" },
  { id:"juan_manuel_fangio", name:"Juan Manuel Fangio", categories:["history","champions"],             photo:"../photos/juan_manuel_fangio.jpg" },
  { id:"jim_clark",          name:"Jim Clark",          categories:["history","champions"],             photo:"../photos/jim_clark.jpg" },
  { id:"jackie_stewart",     name:"Jackie Stewart",     categories:["history","champions"],             photo:"../photos/jackie_stewart.jpg" },
  { id:"nelson_piquet",      name:"Nelson Piquet",      categories:["history","champions"],             photo:"../photos/nelson_piquet.jpg" },
  { id:"nigel_mansell",      name:"Nigel Mansell",      categories:["history","champions"],             photo:"../photos/nigel_mansell.jpg" },
  { id:"damon_hill",         name:"Damon Hill",         categories:["history","champions"],             photo:"../photos/damon_hill.jpg" },
  { id:"gilles_villeneuve",  name:"Gilles Villeneuve",  categories:["history"],                         photo:"../photos/gilles_villeneuve.jpg" },
  { id:"graham_hill",        name:"Graham Hill",        categories:["history","champions"],             photo:"../photos/graham_hill.jpg" },
  { id:"emerson_fittipaldi", name:"Emerson Fittipaldi", categories:["history","champions"],             photo:"../photos/emerson_fittipaldi.jpg" }
];

/* =========================================================================
   NOTHING BELOW THIS LINE NEEDS TO CHANGE
   ========================================================================= */

function getCategory(id){
  return CATEGORIES.find(c => c.id === id);
}

function getDriversByCategory(id){
  if (id === "all") return DRIVERS.slice();
  return DRIVERS.filter(d => d.categories.includes(id));
}

function initials(name){
  return name.split(" ").map(w => w[0]).join("").slice(0, 3).toUpperCase();
}
