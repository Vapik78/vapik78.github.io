const QUIZ = {

  title: "F1 quiz",

  question: "Guess the top 10 F1 drivers by podiums since 2000.",

  subtitle: "Type names into the box below",

  items: [

    {
      answers: ["Lewis Hamilton", "Hamilton"],
      reveal: "Lewis Hamilton",
      fact: "207+ podiums",
      hint: "Holds the record for the most F1 podium finishes."
    },

    {
      answers: ["Max Verstappen", "Verstappen"],
      reveal: "Max Verstappen",
      fact: "131+ podiums",
      hint: "Four-time world champion from the Netherlands."
    },

    {
      answers: ["Sebastian Vettel", "Vettel"],
      reveal: "Sebastian Vettel",
      fact: "122 podiums",
      hint: "Won four titles between 2010 and 2013."
    },

    {
      answers: ["Fernando Alonso", "Alonso"],
      reveal: "Fernando Alonso",
      fact: "106+ podiums",
      hint: "Two-time world champion who is still racing in 2026."
    },

    {
      answers: ["Kimi Raikkonen", "Kimi Räikkönen", "Raikkonen", "Räikkönen"],
      reveal: "Kimi Räikkönen",
      fact: "103 podiums",
      hint: "The 2007 world champion."
    },

    {
      answers: ["Michael Schumacher", "Schumacher"],
      reveal: "Michael Schumacher",
      fact: "91 podiums",
      hint: "Won five titles with Ferrari during the 2000s."
    },

    {
      answers: ["Rubens Barrichello", "Barrichello"],
      reveal: "Rubens Barrichello",
      fact: "68 podiums",
      hint: "Michael Schumacher's Ferrari teammate for many years."
    },

    {
      answers: ["Valtteri Bottas", "Bottas"],
      reveal: "Valtteri Bottas",
      fact: "67 podiums",
      hint: "Won 10 races during his Mercedes career."
    },

    {
      answers: ["Charles Leclerc", "Leclerc"],
      reveal: "Charles Leclerc",
      fact: "54+ podiums",
      hint: "Monegasque Ferrari driver."
    },

    {
      answers: ["Jenson Button", "Button"],
      reveal: "Jenson Button",
      fact: "50 podiums",
      hint: "Won the 2009 championship with Brawn GP."
    },

    

  ]

};

function normalize(str){
  return str
    .toString()
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ');
}

const solved = QUIZ.items.map(() => false);

const shelfStack = document.getElementById('shelf-stack');
const progressFill = document.getElementById('progress-fill');
const progressCount = document.getElementById('progress-count');
const progressTotal = document.getElementById('progress-total');
const lightsEl = document.getElementById('lights');
const finishBanner = document.getElementById('finish-banner');
const answerPanel = document.getElementById('answer-panel');
const answerInput = document.getElementById('answer-input');
const answerSubmit = document.getElementById('answer-submit');
const answerFeedback = document.getElementById('answer-feedback');

document.getElementById('quiz-title').innerHTML = QUIZ.title.replace(/(\S+)$/, '<span>$1</span>');
document.getElementById('question-text').textContent = QUIZ.question;
document.getElementById('question-sub').textContent = QUIZ.subtitle || '';
progressTotal.textContent = QUIZ.items.length;

const lightDivs = Array.from(lightsEl.querySelectorAll('.light'));
const perLight = Math.max(1, Math.ceil(QUIZ.items.length / lightDivs.length));

function buildShelves(){
  shelfStack.innerHTML = '';
  QUIZ.items.forEach((item, i) => {
    const shelf = document.createElement('div');
    shelf.className = 'shelf';
    shelf.id = 'shelf-' + i;
    shelfStack.appendChild(shelf);
    renderShelf(i);
  });
}

function renderShelf(i){
  const shelf = document.getElementById('shelf-' + i);
  const item = QUIZ.items[i];
  shelf.classList.toggle('solved', solved[i]);

  if (solved[i]){
    shelf.innerHTML = `
      <span class="shelf-pos">${i+1}</span>
      <div class="shelf-body">
        <span class="shelf-name">✓ ${item.reveal}</span>
        ${item.fact ? `<span class="shelf-fact">${item.fact}</span>` : ''}
      </div>`;
  } else {
    shelf.innerHTML = `
      <span class="shelf-pos">${i+1}</span>
      <div class="shelf-body">
        <div class="shelf-covered">
          <span class="shelf-covered-label">??????</span>
          ${item.hint ? `<button class="hint-toggle" id="hint-btn-${i}">Hint</button>` : ''}
        </div>
        ${item.hint ? `<div class="hint-text" id="hint-text-${i}">${item.hint}</div>` : ''}
      </div>`;

    if (item.hint){
      document.getElementById('hint-btn-' + i).addEventListener('click', () => {
        document.getElementById('hint-text-' + i).classList.toggle('shown');
      });
    }
  }
}

function updateProgress(){
  const total = QUIZ.items.length;
  const solvedCount = solved.filter(Boolean).length;
  progressCount.textContent = solvedCount;
  progressFill.style.width = (solvedCount / total * 100) + '%';

  lightDivs.forEach((light, idx) => {
    const threshold = (idx + 1) * perLight;
    const prevThreshold = idx * perLight;
    light.classList.remove('on', 'half');
    if (solvedCount >= threshold) light.classList.add('on');
    else if (solvedCount > prevThreshold) light.classList.add('half');
  });

  lightsEl.classList.toggle('finished', solvedCount === total);

  if (solvedCount === total){
    finishBanner.classList.add('shown');
    answerPanel.classList.add('hidden');
    document.querySelector('.answer-label').style.display = 'none';
  } else {
    finishBanner.classList.remove('shown');
    answerPanel.classList.remove('hidden');
    document.querySelector('.answer-label').style.display = '';
  }
}

function submitAnswer(){
  const value = normalize(answerInput.value);
  if (!value) return;

  const matchIndex = QUIZ.items.findIndex((item, i) =>
    !solved[i] && item.answers.some(a => normalize(a) === value));

  if (matchIndex !== -1){
    solved[matchIndex] = true;
    renderShelf(matchIndex);
    updateProgress();
    answerFeedback.textContent = '';
    answerInput.value = '';
    answerInput.focus();
    return;
  }

  const alreadyGuessed = QUIZ.items.some((item, i) =>
    solved[i] && item.answers.some(a => normalize(a) === value));

  if (alreadyGuessed){
    answerFeedback.textContent = 'You already got that one.';
    answerFeedback.className = 'feedback info';
  } else {
    answerFeedback.textContent = 'Not quite — try again.';
    answerFeedback.className = 'feedback';
    answerPanel.classList.remove('wrong-flash');
    void answerPanel.offsetWidth;
    answerPanel.classList.add('wrong-flash');
  }
}

answerSubmit.addEventListener('click', submitAnswer);
answerInput.addEventListener('keydown', e => { if (e.key === 'Enter') submitAnswer(); });

function resetQuiz(){
  solved.forEach((_, i) => solved[i] = false);
  answerInput.value = '';
  answerFeedback.textContent = '';
  buildShelves();
  updateProgress();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}
document.getElementById('reset-btn').addEventListener('click', resetQuiz);
document.getElementById('reset-btn-2').addEventListener('click', resetQuiz);

buildShelves();
updateProgress();

