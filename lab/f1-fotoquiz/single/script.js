/* =========================================================================
   SINGLE PLAYER: relies on CATEGORIES / DRIVERS / getDriversByCategory
   from ../data.js (loaded before this file).

   Two game modes:
   - "normal": untimed, click an answer whenever you're ready (unchanged).
   - "kahoot": every round has a 15s countdown; answering faster earns more
     points, and your overall speed earns a letter grade at the end.
   ========================================================================= */

function shuffle(arr){
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--){
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const KAHOOT_SECONDS = 15;

// --- Elements ---
const screenSetup = document.getElementById('screen-setup');
const screenPlay = document.getElementById('screen-play');
const screenFinal = document.getElementById('screen-final');

const gamemodeToggle = document.getElementById('gamemode-toggle');
const themeGrid = document.getElementById('theme-grid');
const roundPresets = document.getElementById('round-presets');
const customToggle = document.getElementById('custom-toggle');
const customRounds = document.getElementById('custom-rounds');
const setupNote = document.getElementById('setup-note');
const startBtn = document.getElementById('start-btn');

const roundBadge = document.getElementById('round-badge');
const scoreBadge = document.getElementById('score-badge');
const photoImg = document.getElementById('photo-img');
const photoReveal = document.getElementById('photo-reveal');
const photoRevealName = document.getElementById('photo-reveal-name');
const timerRing = document.getElementById('timer-ring');
const timerRingInner = document.getElementById('timer-ring-inner');
const answerGrid = document.getElementById('answer-grid');
const roundFeedback = document.getElementById('round-feedback');
const nextBtn = document.getElementById('next-btn');

const finalScoreEl = document.getElementById('final-score');
const finalTotalEl = document.getElementById('final-total');
const finalTotalSuffixEl = document.getElementById('final-total-suffix');
const finalPtsSuffixEl = document.getElementById('final-pts-suffix');
const kahootGradeEl = document.getElementById('kahoot-grade');
const finalMsg = document.getElementById('final-msg');
const playAgainBtn = document.getElementById('play-again-btn');
const changeSettingsBtn = document.getElementById('change-settings-btn');

// --- Setup state ---
let gameMode = 'normal'; // 'normal' | 'kahoot'
let selectedThemeId = null;
let selectedRounds = null;

// --- Game state (normal mode) ---
let roundDrivers = [];
let currentRound = 0;
let score = 0;

// --- Game state (kahoot mode only) ---
let kahootPoints = 0;
let kahootCorrect = 0;
let kahootTickHandle = null;
let kahootRoundStartTime = 0;
let kahootSecondsLeft = KAHOOT_SECONDS;

gamemodeToggle.querySelectorAll('.gamemode-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    gameMode = btn.dataset.mode;
    gamemodeToggle.querySelectorAll('.gamemode-btn').forEach(b => b.classList.remove('selected'));
    btn.classList.add('selected');
  });
});

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

roundPresets.querySelectorAll('.preset-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    selectedRounds = parseInt(btn.dataset.rounds, 10);
    customToggle.checked = false;
    customRounds.disabled = true;
    roundPresets.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('selected'));
    btn.classList.add('selected');
    updateNote();
    validate();
  });
});

customToggle.addEventListener('change', () => {
  if (customToggle.checked){
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
  if (!customToggle.checked) return;
  selectedRounds = Math.max(1, parseInt(customRounds.value, 10) || 1);
  updateNote();
  validate();
});

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
  startBtn.disabled = !(selectedThemeId && selectedRounds >= 1);
}

function getOptionsForRound(correctDriver, pool){
  let others = pool.filter(d => d.id !== correctDriver.id);
  if (others.length < 3){
    others = DRIVERS.filter(d => d.id !== correctDriver.id);
  }
  const distractors = shuffle(others).slice(0, 3);
  return shuffle([correctDriver, ...distractors]);
}

startBtn.addEventListener('click', () => {
  const pool = getDriversByCategory(selectedThemeId);
  const effectiveRounds = Math.min(selectedRounds, pool.length);
  roundDrivers = shuffle(pool).slice(0, effectiveRounds);
  currentRound = 0;
  score = 0;
  kahootPoints = 0;
  kahootCorrect = 0;
  finalTotalEl.textContent = roundDrivers.length;
  screenSetup.style.display = 'none';
  screenFinal.style.display = 'none';
  screenPlay.style.display = '';
  renderRound();
});

function renderRound(){
  const driver = roundDrivers[currentRound];
  const pool = getDriversByCategory(selectedThemeId);

  roundBadge.textContent = `Round ${currentRound + 1}/${roundDrivers.length}` + (gameMode === 'kahoot' ? ' · ⚡ Kahoot' : '');
  scoreBadge.textContent = gameMode === 'kahoot' ? `Score: ${kahootPoints} pts` : `Score: ${score}`;

  photoImg.style.display = '';
  photoImg.src = driver.photo;
  photoReveal.classList.remove('shown');
  roundFeedback.textContent = '';
  roundFeedback.className = 'round-feedback';
  nextBtn.style.display = 'none';

  const options = getOptionsForRound(driver, pool);
  answerGrid.innerHTML = '';
  options.forEach(opt => {
    const card = document.createElement('button');
    card.className = 'answer-card';
    card.type = 'button';
    card.textContent = opt.name;
    card.addEventListener('click', () => selectAnswer(card, opt, driver));
    answerGrid.appendChild(card);
  });

  if (gameMode === 'kahoot'){
    timerRing.style.display = '';
    startKahootTimer();
  } else {
    timerRing.style.display = 'none';
    clearInterval(kahootTickHandle);
    kahootTickHandle = null;
  }
}

// --- Kahoot timer + scoring ---

function startKahootTimer(){
  kahootRoundStartTime = Date.now();
  kahootSecondsLeft = KAHOOT_SECONDS;
  timerRing.classList.remove('done', 'wrong');
  timerRing.style.setProperty('--pct', 100);
  timerRingInner.textContent = kahootSecondsLeft;

  clearInterval(kahootTickHandle);
  kahootTickHandle = setInterval(() => {
    kahootSecondsLeft--;
    const pct = Math.max(0, (kahootSecondsLeft / KAHOOT_SECONDS) * 100);
    timerRing.style.setProperty('--pct', pct);
    timerRingInner.textContent = Math.max(0, kahootSecondsLeft);
    if (kahootSecondsLeft <= 0){
      clearInterval(kahootTickHandle);
      kahootTickHandle = null;
      handleTimeout();
    }
  }, 1000);
}

function computeKahootPoints(elapsedMs){
  // 500-1000 pts for a correct answer: full marks for an instant answer,
  // decaying linearly down to a 500pt floor right at the buzzer.
  const remainingRatio = Math.max(0, Math.min(1, 1 - elapsedMs / (KAHOOT_SECONDS * 1000)));
  return Math.round(500 + 500 * remainingRatio);
}

function getSpeedGrade(avgPoints){
  if (avgPoints >= 900) return { grade: 'S', label: 'Lightning Reflexes', emoji: '⚡' };
  if (avgPoints >= 750) return { grade: 'A', label: 'Rapid Fire',         emoji: '🔥' };
  if (avgPoints >= 550) return { grade: 'B', label: 'Sharp Reactions',    emoji: '🎯' };
  if (avgPoints >= 350) return { grade: 'C', label: 'Steady Pace',        emoji: '🙂' };
  if (avgPoints >= 150) return { grade: 'D', label: 'Taking It Slow',     emoji: '🐢' };
  return { grade: 'F', label: 'Ice Cold', emoji: '🧊' };
}

function handleTimeout(){
  const driver = roundDrivers[currentRound];
  const allCards = answerGrid.querySelectorAll('.answer-card');
  allCards.forEach(c => {
    c.disabled = true;
    if (c.textContent === driver.name){
      c.classList.add('correct');
    } else {
      c.classList.add('dim');
    }
  });

  photoRevealName.textContent = driver.name;
  photoReveal.classList.add('shown');
  timerRing.classList.add('wrong');
  timerRingInner.textContent = '⏱';

  roundFeedback.textContent = `Time's up! It was ${driver.name}.`;
  roundFeedback.className = 'round-feedback wrong';

  nextBtn.textContent = (currentRound === roundDrivers.length - 1) ? 'See Results →' : 'Next →';
  nextBtn.style.display = '';
}

function selectAnswer(card, chosenDriver, correctDriver){
  if (gameMode === 'kahoot'){
    clearInterval(kahootTickHandle);
    kahootTickHandle = null;
  }

  const isCorrect = chosenDriver.id === correctDriver.id;
  const allCards = answerGrid.querySelectorAll('.answer-card');

  allCards.forEach(c => { c.disabled = true; c.classList.add('dim'); });
  card.classList.remove('dim');
  card.classList.add(isCorrect ? 'correct' : 'wrong');

  if (!isCorrect){
    allCards.forEach(c => {
      if (c.textContent === correctDriver.name){
        c.classList.remove('dim');
        c.classList.add('correct');
      }
    });
  }

  photoRevealName.textContent = correctDriver.name;
  photoReveal.classList.add('shown');

  if (gameMode === 'kahoot'){
    if (isCorrect){
      timerRing.classList.add('done');
      timerRingInner.textContent = '✓';
    } else {
      timerRing.classList.add('wrong');
      timerRingInner.textContent = '✗';
    }

    const elapsed = Date.now() - kahootRoundStartTime;
    const points = isCorrect ? computeKahootPoints(elapsed) : 0;
    kahootPoints += points;
    if (isCorrect) kahootCorrect++;
    scoreBadge.textContent = `Score: ${kahootPoints} pts`;

    roundFeedback.textContent = isCorrect
      ? `Correct! +${points} pts`
      : `Wrong. It was ${correctDriver.name}.`;
    roundFeedback.className = 'round-feedback ' + (isCorrect ? 'correct' : 'wrong');
  } else {
    if (isCorrect) score++;
    scoreBadge.textContent = `Score: ${score}`;

    roundFeedback.textContent = isCorrect ? 'Correct!' : `Wrong. It was ${correctDriver.name}.`;
    roundFeedback.className = 'round-feedback ' + (isCorrect ? 'correct' : 'wrong');
  }

  nextBtn.textContent = (currentRound === roundDrivers.length - 1) ? 'See Results →' : 'Next →';
  nextBtn.style.display = '';
}

nextBtn.addEventListener('click', () => {
  currentRound++;
  if (currentRound >= roundDrivers.length){
    showFinal();
  } else {
    renderRound();
  }
});

function showFinal(){
  screenPlay.style.display = 'none';
  screenFinal.style.display = '';
  clearInterval(kahootTickHandle);
  kahootTickHandle = null;

  if (gameMode === 'kahoot'){
    finalScoreEl.textContent = kahootPoints;
    finalTotalSuffixEl.style.display = 'none';
    finalPtsSuffixEl.style.display = '';

    const avgPoints = roundDrivers.length ? kahootPoints / roundDrivers.length : 0;
    const g = getSpeedGrade(avgPoints);
    kahootGradeEl.style.display = '';
    kahootGradeEl.textContent = `${g.emoji} Speed Grade ${g.grade}: ${g.label}`;

    finalMsg.textContent = `${kahootCorrect}/${roundDrivers.length} correct · avg ${Math.round(avgPoints)} pts/question.`;
  } else {
    finalScoreEl.textContent = score;
    finalTotalEl.textContent = roundDrivers.length;
    finalTotalSuffixEl.style.display = '';
    finalPtsSuffixEl.style.display = 'none';
    kahootGradeEl.style.display = 'none';

    const pct = roundDrivers.length ? score / roundDrivers.length : 0;
    let msg = 'Room to improve. Try another round.';
    if (pct === 1) msg = 'Perfect score. Every driver, nailed.';
    else if (pct >= 0.8) msg = 'Strong run. You know your grid.';
    else if (pct >= 0.5) msg = 'Solid effort. A bit more study and you\'ve got it.';
    finalMsg.textContent = msg;
  }
}

playAgainBtn.addEventListener('click', () => {
  const pool = getDriversByCategory(selectedThemeId);
  const effectiveRounds = Math.min(selectedRounds, pool.length);
  roundDrivers = shuffle(pool).slice(0, effectiveRounds);
  currentRound = 0;
  score = 0;
  kahootPoints = 0;
  kahootCorrect = 0;
  screenFinal.style.display = 'none';
  screenPlay.style.display = '';
  renderRound();
});

changeSettingsBtn.addEventListener('click', () => {
  clearInterval(kahootTickHandle);
  kahootTickHandle = null;
  screenFinal.style.display = 'none';
  screenPlay.style.display = 'none';
  screenSetup.style.display = '';
});

buildThemeGrid();
