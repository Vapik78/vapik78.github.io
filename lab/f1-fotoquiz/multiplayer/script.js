/* =========================================================================
   MULTIPLAYER: relies on CATEGORIES / DRIVERS / getDriversByCategory
   from ../data.js (loaded before this file).
   ========================================================================= */

function shuffle(arr){
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--){
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// --- Elements ---
const screenSetup = document.getElementById('screen-setup');
const screenPlay = document.getElementById('screen-play');
const screenEnd = document.getElementById('screen-end');

const themeGrid = document.getElementById('theme-grid');
const timePresets = document.getElementById('time-presets');
const customTimeToggle = document.getElementById('custom-time-toggle');
const customTime = document.getElementById('custom-time');
const roundPresets = document.getElementById('round-presets');
const customRoundsToggle = document.getElementById('custom-rounds-toggle');
const customRounds = document.getElementById('custom-rounds');
const revealNameToggle = document.getElementById('reveal-name-toggle');
const revealNameDesc = document.getElementById('reveal-name-desc');
const setupNote = document.getElementById('setup-note');
const startBtn = document.getElementById('start-btn');

const roundBadge = document.getElementById('round-badge');
const themeBadge = document.getElementById('theme-badge');
const photoImg = document.getElementById('photo-img');
const photoReveal = document.getElementById('photo-reveal');
const photoRevealName = document.getElementById('photo-reveal-name');
const photoCover = document.getElementById('photo-cover');
const photoCoverText = document.getElementById('photo-cover-text');
const timerRing = document.getElementById('timer-ring');
const timerRingInner = document.getElementById('timer-ring-inner');

const startTimerBtn = document.getElementById('start-timer-btn');
const pauseBtn = document.getElementById('pause-btn');
const revealBtn = document.getElementById('reveal-btn');
const nextRoundBtn = document.getElementById('next-round-btn');

const endMsg = document.getElementById('end-msg');
const driverList = document.getElementById('driver-list');
const driverListItems = document.getElementById('driver-list-items');
const playAgainBtn = document.getElementById('play-again-btn');
const changeSettingsBtn = document.getElementById('change-settings-btn');

// --- Setup state ---
let selectedThemeId = null;
let selectedSeconds = null;
let selectedRounds = null;
let revealNameEachRound = true;

// --- Game state ---
let roundDrivers = [];
let currentRound = 0;
let secondsLeft = 0;
let totalSeconds = 0;
let isPaused = false;
let tickHandle = null;

function buildThemeGrid(){
  themeGrid.innerHTML = '';
  CATEGORIES.forEach(cat => {
    const count = getDriversByCategory(cat.id).length;
    const card = document.createElement('button');
    card.className = 'theme-card';
    card.type = 'button';
    card.innerHTML = `
      <h3>${cat.label}</h3>
      <p>${cat.description}</p>
      <span class="theme-count">${count} photo${count === 1 ? '' : 's'}</span>
    `;
    card.addEventListener('click', () => {
      selectedThemeId = cat.id;
      document.querySelectorAll('.theme-card').forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');
      updateNote();
      validate();
    });
    themeGrid.appendChild(card);
  });
}

timePresets.querySelectorAll('.preset-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    selectedSeconds = parseInt(btn.dataset.seconds, 10);
    customTimeToggle.checked = false;
    customTime.disabled = true;
    timePresets.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('selected'));
    btn.classList.add('selected');
    validate();
  });
});

customTimeToggle.addEventListener('change', () => {
  if (customTimeToggle.checked){
    customTime.disabled = false;
    timePresets.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('selected'));
    selectedSeconds = Math.max(2, parseInt(customTime.value, 10) || 15);
  } else {
    customTime.disabled = true;
  }
  validate();
});
customTime.addEventListener('input', () => {
  if (!customTimeToggle.checked) return;
  selectedSeconds = Math.max(2, parseInt(customTime.value, 10) || 15);
  validate();
});

roundPresets.querySelectorAll('.preset-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    selectedRounds = parseInt(btn.dataset.rounds, 10);
    customRoundsToggle.checked = false;
    customRounds.disabled = true;
    roundPresets.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('selected'));
    btn.classList.add('selected');
    updateNote();
    validate();
  });
});

customRoundsToggle.addEventListener('change', () => {
  if (customRoundsToggle.checked){
    customRounds.disabled = false;
    roundPresets.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('selected'));
    selectedRounds = Math.max(1, parseInt(customRounds.value, 10) || 1);
  } else {
    customRounds.disabled = true;
  }
  updateNote();
  validate();
});
customRounds.addEventListener('input', () => {
  if (!customRoundsToggle.checked) return;
  selectedRounds = Math.max(1, parseInt(customRounds.value, 10) || 1);
  updateNote();
  validate();
});

function updateRevealDesc(){
  revealNameDesc.textContent = revealNameToggle.checked
    ? 'The name appears on the photo as soon as the timer ends.'
    : 'Names stay hidden all round. You\'ll get a full list at the end.';
}
revealNameToggle.addEventListener('change', () => {
  revealNameEachRound = revealNameToggle.checked;
  updateRevealDesc();
});
updateRevealDesc();

function updateNote(){
  if (!selectedThemeId){
    setupNote.textContent = '';
    return;
  }
  const poolSize = getDriversByCategory(selectedThemeId).length;
  if (!selectedRounds){
    setupNote.textContent = `${poolSize} photo${poolSize === 1 ? '' : 's'} available in this theme.`;
    return;
  }
  if (selectedRounds > poolSize){
    setupNote.textContent = `Only ${poolSize} photos available in this theme, so you'll play ${poolSize} round${poolSize === 1 ? '' : 's'} instead of ${selectedRounds}.`;
  } else {
    setupNote.textContent = `${poolSize} photos available. Playing ${selectedRounds} round${selectedRounds === 1 ? '' : 's'}.`;
  }
}

function validate(){
  startBtn.disabled = !(selectedThemeId && selectedSeconds >= 2 && selectedRounds >= 1);
}

function buildRounds(){
  const pool = getDriversByCategory(selectedThemeId);
  const effectiveRounds = Math.min(selectedRounds, pool.length);
  return shuffle(pool).slice(0, effectiveRounds);
}

startBtn.addEventListener('click', () => {
  roundDrivers = buildRounds();
  currentRound = 0;
  themeBadge.textContent = getCategory(selectedThemeId).label;
  screenSetup.style.display = 'none';
  screenEnd.style.display = 'none';
  screenPlay.style.display = '';
  renderRound();
});

function renderRound(){
  const driver = roundDrivers[currentRound];

  roundBadge.textContent = `Round ${currentRound + 1}/${roundDrivers.length}`;

  photoImg.style.display = '';
  photoImg.src = driver.photo;
  photoReveal.classList.remove('shown');

  // Snap the cover back over the photo instantly (no fade-in), so the new
  // driver never flashes on screen before the cover is back in place.
  photoCover.classList.add('no-anim');
  photoCover.classList.remove('revealed', 'hide');
  photoCoverText.textContent = 'Hidden. Press "Start Timer" to reveal';
  void photoCover.offsetWidth; // force a reflow so the instant state is applied
  photoCover.classList.remove('no-anim');

  totalSeconds = selectedSeconds;
  secondsLeft = selectedSeconds;
  isPaused = false;
  clearInterval(tickHandle);
  tickHandle = null;

  timerRing.classList.remove('done', 'paused');
  timerRing.style.setProperty('--pct', 100);
  timerRingInner.textContent = secondsLeft;

  setControlState('ready');
}

function setControlState(state){
  startTimerBtn.style.display = state === 'ready' ? '' : 'none';
  pauseBtn.style.display = (state === 'running' || state === 'paused') ? '' : 'none';
  revealBtn.style.display = (state === 'running' || state === 'paused') ? '' : 'none';
  nextRoundBtn.style.display = state === 'revealed' ? '' : 'none';
  pauseBtn.textContent = state === 'paused' ? 'Resume' : 'Pause';
  nextRoundBtn.textContent = (currentRound === roundDrivers.length - 1) ? 'Finish →' : 'Next Round →';
}

function startTimer(){
  photoCover.classList.add('hide');
  setControlState('running');
  tickHandle = setInterval(() => {
    if (isPaused) return;
    secondsLeft--;
    const pct = Math.max(0, (secondsLeft / totalSeconds) * 100);
    timerRing.style.setProperty('--pct', pct);
    timerRingInner.textContent = Math.max(0, secondsLeft);
    if (secondsLeft <= 0){
      revealNow();
    }
  }, 1000);
}

function revealNow(){
  clearInterval(tickHandle);
  tickHandle = null;
  timerRing.classList.add('done');
  timerRing.classList.remove('paused');
  timerRingInner.textContent = '✓';
  const driver = roundDrivers[currentRound];

  if (revealNameEachRound){
    // Reveal-immediately mode: keep the photo visible, caption it with the name.
    photoRevealName.textContent = driver.name;
    photoReveal.classList.add('shown');
  } else {
    // Reveal-at-the-end mode: cover the photo back up, no name shown yet.
    photoCoverText.textContent = "Time's up!";
    photoCover.classList.add('revealed');
    photoCover.classList.remove('hide'); // fades back in smoothly over the photo
  }

  setControlState('revealed');
}

startTimerBtn.addEventListener('click', startTimer);

pauseBtn.addEventListener('click', () => {
  isPaused = !isPaused;
  timerRing.classList.toggle('paused', isPaused);
  setControlState(isPaused ? 'paused' : 'running');
});

revealBtn.addEventListener('click', revealNow);

nextRoundBtn.addEventListener('click', () => {
  currentRound++;
  if (currentRound >= roundDrivers.length){
    showEndScreen();
  } else {
    renderRound();
  }
});

function showEndScreen(){
  screenPlay.style.display = 'none';
  screenEnd.style.display = '';
  if (revealNameEachRound){
    endMsg.textContent = 'All rounds shown. Check your papers!';
    driverList.style.display = 'none';
    driverListItems.innerHTML = '';
  } else {
    endMsg.textContent = "Here's who was who. Check your papers!";
    driverListItems.innerHTML = roundDrivers.map(d => `<li>${d.name}</li>`).join('');
    driverList.style.display = '';
  }
}

playAgainBtn.addEventListener('click', () => {
  roundDrivers = buildRounds();
  currentRound = 0;
  screenEnd.style.display = 'none';
  screenPlay.style.display = '';
  renderRound();
});

changeSettingsBtn.addEventListener('click', () => {
  clearInterval(tickHandle);
  screenEnd.style.display = 'none';
  screenPlay.style.display = 'none';
  screenSetup.style.display = '';
});

buildThemeGrid();
