const QUIZ = {

  title: "F1 quiz",

  question: "Guess the top 10 F1 drivers by number of different teams raced for since 2000.",

  subtitle: "Type names into the box below",

  items: [

  
    {
      answers: ["Nico Hulkenberg", "Nico Hülkenberg", "Hulkenberg", "Hülkenberg"],
      reveal: "Nico Hülkenberg - Force India, Racing Point, Aston Martin, Williams, Sauber (twice), Renault, Haas, Audi",
      fact: "8 teams",
      hint: "Force India, Racing Point, Aston Martin, Williams, Sauber (twice), Renault, Haas and now Audi"
    },

    {
      answers: ["Giancarlo Fisichella", "Fisichella"],
      reveal: "Giancarlo Fisichella - Minardi, Jordan, Benetton, Jordan (again), Sauber, Renault",
      fact: "7 teams",
      hint: "Minardi, Jordan, Benetton, Jordan (again), Sauber, and then Renault. Comes from a noble italian family"
    },

    {
      answers: ["Jenson Button", "Button"],
      reveal: "Jenson Button - Williams, Benetton, BAR, Honda, Brawn, McLaren and Renault.",
      fact: "7 teams",
      hint: "Williams, Benetton, BAR, Honda, Brawn, McLaren and Renault."
    },

    {
      answers: ["Daniel Ricciardo", "Ricciardo"],
      reveal: "Daniel Ricciardo - Toro Rosso, AlphaTauri, Racing Bulls, HRT, Red Bull, Renault, McLaren",
      fact: "7 teams",
      hint: "Toro Rosso, AlphaTauri, Racing Bulls, HRT, Red Bull, Renault and McLaren. Has something to do with honey"
    },

   

    {
      answers: ["Jos Verstappen" , "Verstappen"],
      reveal: "Jos Verstappen - Benetton, Simtek, Footwork, Tyrrell, Stewart, Arrows, Minardi",
      fact: "7 teams",
      hint: "Benetton, Simtek, Footwork, Tyrrell, Stewart, Arrows, and Minardi. His son races in F1."
    },

     {
      answers: ["Johnny Herbert", "Herbert"],
      reveal: "Johnny Herbert - Stewart, Lotus, Benetton, Sauber, Jaguar, Jordan, Ligier",
      fact: "7 teams",
      hint: "Stewart, Lotus, Benetton, Sauber, Jaguar, Jordan and Ligier. He raced from 1989 to 2000."
    },

    {
      answers: ["Jarno Trulli", "Trulli"],
      reveal: "Jarno Trulli - Jordan, Renault, Toyota, Team Lotus, Minardi, Prost",
      fact: "6 teams",
      hint: "Jordan, Renault, Toyota, Team Lotus, Minardi and Prost."
    },

    {
      answers: ["Nick Heidfeld", "Heidfeld"],
      reveal: "Nick Heidfeld - Prost, Sauber, Jordan, BMW Sauber, Williams, Renault",
      fact: "6 teams",
      hint: "Prost, Sauber, Jordan, BMW Sauber, Williams and Renault."

    },

    

    {
      answers: ["Sergio Perez", "Perez", "Checo"],
      reveal: "Sergio Perez - Sauber, Mclaren, Force India, Racing Point, Red Bull, Cadillac ",
      fact: "6 teams",
      hint: "Sauber, Mclaren, Force India, Racing Point, Red Bull, Cadillac "
    },

   {
      answers: ["Fernando Alonso", "Alonso"],
      reveal: "Fernando Alonso - Minardi, Renault, McLaren, Ferrari, Alpine, Aston Martin",
      fact: "6 teams",
      hint: "Minardi, Renault, McLaren, Ferrari, Alpine and Aston Martin."
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

