const QUIZ = {

  title: "F1 quiz",

  question: "Guess the top 10 F1 drivers by race wins since 2000.",

  subtitle: "Type names into the box below",

  items: [

    {
      answers: ["Lewis Hamilton", "Hamilton"],
      reveal: "Lewis Hamilton",
      fact: "106 wins since 2000",
      hint: "Seven-time world champion who now drives for Ferrari."
    },

    {
      answers: ["Max Verstappen", "Verstappen"],
      reveal: "Max Verstappen",
      fact: "71 wins since 2000",
      hint: "Four-time world champion and Red Bull driver."
    },

    {
      answers: ["Michael Schumacher", "Schumacher"],
      reveal: "Michael Schumacher",
      fact: "56 wins since 2000",
      hint: "Won five consecutive championships with Ferrari."
    },


    {
      answers: ["Sebastian Vettel", "Vettel"],
      reveal: "Sebastian Vettel",
      fact: "53 wins since 2000",
      hint: "Won four consecutive championships with Red Bull."
    },

    {
      answers: ["Fernando Alonso", "Alonso"],
      reveal: "Fernando Alonso",
      fact: "32 wins since 2000",
      hint: "Two-time world champion who debuted in 2001."
    },

    {
      answers: ["Nico Rosberg", "Rosberg"],
      reveal: "Nico Rosberg",
      fact: "23 wins since 2000",
      hint: "2016 world champion who beat Hamilton to the title."
    },

    {
      answers: ["Kimi Raikkonen", "Kimi Räikkönen", "Raikkonen", "Räikkönen"],
      reveal: "Kimi Räikkönen",
      fact: "21 wins since 2000",
      hint: "2007 world champion and famous Ferrari driver."
    },

    {
      answers: ["Jenson Button", "Button"],
      reveal: "Jenson Button",
      fact: "15 wins since 2000",
      hint: "2009 world champion with Brawn GP."
    },

    {
      answers: ["Felipe Massa", "Massa"],
      reveal: "Felipe Massa",
      fact: "11 wins since 2000",
      hint: "Brazilian Ferrari driver who narrowly missed the 2008 title."
    },

    {
      answers: ["Mark Webber", "Webber"],
      reveal: "Mark Webber",
      fact: "9 wins since 2000",
      hint: "Australian driver who raced for Red Bull."
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

