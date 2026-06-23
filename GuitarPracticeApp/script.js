(() => {
  'use strict';

  const NOTE_NAMES = ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B'];
  const INTERVALS = [
    { semitones: 0, short: 'P1', long: 'Perfect unison' },
    { semitones: 1, short: 'm2', long: 'Minor 2nd' },
    { semitones: 2, short: 'M2', long: 'Major 2nd' },
    { semitones: 3, short: 'm3', long: 'Minor 3rd' },
    { semitones: 4, short: 'M3', long: 'Major 3rd' },
    { semitones: 5, short: 'P4', long: 'Perfect 4th' },
    { semitones: 6, short: 'TT', long: 'Tritone' },
    { semitones: 7, short: 'P5', long: 'Perfect 5th' },
    { semitones: 8, short: 'm6', long: 'Minor 6th' },
    { semitones: 9, short: 'M6', long: 'Major 6th' },
    { semitones: 10, short: 'm7', long: 'Minor 7th' },
    { semitones: 11, short: 'M7', long: 'Major 7th' },
    { semitones: 12, short: 'P8', long: 'Perfect octave' }
  ];

  const STANDARD_TUNING = [64, 59, 55, 50, 45, 40]; // high E to low E

  const state = {
    mode: 'explore',
    fretCount: 12,
    selected: [],
    audioEnabled: false,
    audioContext: null,
    quiz: {
      questionNumber: 1,
      score: 0,
      streak: 0,
      answerLocked: false,
      notes: []
    }
  };

  const els = {
    audioButton: document.querySelector('#audio-button'),
    audioLabel: document.querySelector('#audio-button-label'),
    modeButtons: [...document.querySelectorAll('.mode-button')],
    moduleDescription: document.querySelector('#module-description'),
    intervalName: document.querySelector('#interval-name'),
    intervalBadge: document.querySelector('#interval-badge'),
    intervalDetail: document.querySelector('#interval-detail'),
    firstNote: document.querySelector('#first-note'),
    secondNote: document.querySelector('#second-note'),
    playButton: document.querySelector('#play-interval-button'),
    clearButton: document.querySelector('#clear-button'),
    fretboard: document.querySelector('#fretboard'),
    fretCount: document.querySelector('#fret-count'),
    fretboardHint: document.querySelector('#fretboard-hint'),
    quizCard: document.querySelector('#quiz-card'),
    quizPrompt: document.querySelector('#quiz-prompt'),
    quizNotes: document.querySelector('#quiz-notes'),
    quizChoices: document.querySelector('#quiz-choices'),
    quizProgress: document.querySelector('#quiz-progress'),
    quizScore: document.querySelector('#quiz-score'),
    quizStreak: document.querySelector('#quiz-streak'),
    choiceTemplate: document.querySelector('#choice-template')
  };

  function midiToNote(midi) {
    return NOTE_NAMES[midi % 12];
  }

  function midiToFrequency(midi) {
    return 440 * Math.pow(2, (midi - 69) / 12);
  }

  function normalizeInterval(firstMidi, secondMidi) {
    const diff = Math.abs(secondMidi - firstMidi) % 12;
    const octave = Math.abs(secondMidi - firstMidi) === 12;
    return INTERVALS[octave ? 12 : diff];
  }

  function getCellData(stringIndex, fret) {
    const midi = STANDARD_TUNING[stringIndex] + fret;
    return { stringIndex, fret, midi, note: midiToNote(midi) };
  }

  function createFretboard() {
    const columns = state.fretCount + 1;
    els.fretboard.innerHTML = '';
    els.fretboard.style.gridTemplateColumns = `repeat(${columns}, minmax(0, 1fr))`;

    STANDARD_TUNING.forEach((_, stringIndex) => {
      for (let fret = 0; fret <= state.fretCount; fret += 1) {
        const data = getCellData(stringIndex, fret);
        const cell = document.createElement('button');
        cell.type = 'button';
        cell.className = `fret-cell ${fret === 0 ? 'is-open' : ''}`;
        cell.dataset.stringIndex = String(stringIndex);
        cell.dataset.fret = String(fret);
        cell.setAttribute('aria-label', `${data.note} on string ${6 - stringIndex}, fret ${fret}`);
        cell.innerHTML = `<span class="fret-note">${data.note}</span>`;
        cell.addEventListener('click', () => handleFretClick(data));
        els.fretboard.appendChild(cell);
      }
    });

    paintSelections();
  }

  function paintSelections() {
    document.querySelectorAll('.fret-cell').forEach((cell) => {
      cell.classList.remove('is-first', 'is-second', 'is-quiz-target');
      const stringIndex = Number(cell.dataset.stringIndex);
      const fret = Number(cell.dataset.fret);
      const matchIndex = state.selected.findIndex(item => item.stringIndex === stringIndex && item.fret === fret);
      if (matchIndex === 0) cell.classList.add('is-first');
      if (matchIndex === 1) cell.classList.add('is-second');

      if (state.mode === 'quiz' && state.quiz.notes.some(item => item.stringIndex === stringIndex && item.fret === fret)) {
        cell.classList.add('is-quiz-target');
      }
    });
  }

  function handleFretClick(data) {
    if (state.mode === 'quiz') return;

    if (state.selected.length >= 2) state.selected = [];
    state.selected.push(data);
    playNote(data.midi, state.selected.length === 2 ? .16 : 0);
    paintSelections();
    updateExploreResult();
  }

  function updateExploreResult() {
    const [first, second] = state.selected;
    els.firstNote.textContent = first ? first.note : '—';
    els.secondNote.textContent = second ? second.note : '—';

    if (!first || !second) {
      els.intervalName.textContent = 'Pick two notes';
      els.intervalBadge.textContent = '—';
      els.intervalDetail.textContent = 'Tap any fret, then choose a second note to reveal the interval.';
      els.playButton.disabled = true;
      return;
    }

    const interval = normalizeInterval(first.midi, second.midi);
    const direction = second.midi >= first.midi ? 'ascending' : 'descending';
    els.intervalName.textContent = interval.long;
    els.intervalBadge.textContent = interval.short;
    els.intervalDetail.textContent = `${first.note} to ${second.note} is a ${direction} ${interval.long.toLowerCase()}.`;
    els.playButton.disabled = false;
  }

  function clearSelections() {
    state.selected = [];
    paintSelections();
    updateExploreResult();
  }

  async function enableAudio() {
    const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextCtor) {
      els.audioLabel.textContent = 'Audio unavailable';
      return;
    }

    if (!state.audioContext) state.audioContext = new AudioContextCtor();
    if (state.audioContext.state === 'suspended') await state.audioContext.resume();

    state.audioEnabled = true;
    els.audioButton.classList.add('is-enabled');
    els.audioButton.setAttribute('aria-pressed', 'true');
    els.audioLabel.textContent = 'Audio enabled';
    playNote(64);
  }

  function playNote(midi, delay = 0) {
    if (!state.audioEnabled || !state.audioContext) return;
    const context = state.audioContext;
    const now = context.currentTime + delay;
    const oscillator = context.createOscillator();
    const gain = context.createGain();

    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(midiToFrequency(midi), now);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.18, now + 0.025);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.78);

    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start(now);
    oscillator.stop(now + 0.82);
  }

  function playSelectedInterval() {
    if (state.selected.length !== 2) return;
    playNote(state.selected[0].midi);
    playNote(state.selected[1].midi, .42);
  }

  function switchMode(mode) {
    state.mode = mode;
    els.modeButtons.forEach(button => button.classList.toggle('is-active', button.dataset.mode === mode));

    if (mode === 'quiz') {
      els.moduleDescription.textContent = 'Identify the interval between the highlighted notes. Build speed, recognition, and musical instinct.';
      els.quizCard.classList.remove('is-hidden');
      els.fretboardHint.textContent = 'The two highlighted notes form the quiz question. Choose the interval below.';
      clearSelections();
      createQuizQuestion();
    } else {
      els.moduleDescription.textContent = 'Choose any two notes on the fretboard. Hear them, see them, and learn the distance between them.';
      els.quizCard.classList.add('is-hidden');
      els.fretboardHint.textContent = 'Tap two frets. The first note is gold, the second is violet.';
      state.quiz.notes = [];
      paintSelections();
    }
  }

  function makeQuizNotePair() {
    const stringA = Math.floor(Math.random() * STANDARD_TUNING.length);
    const stringB = Math.floor(Math.random() * STANDARD_TUNING.length);
    const fretA = Math.floor(Math.random() * (state.fretCount + 1));
    const fretB = Math.floor(Math.random() * (state.fretCount + 1));
    const first = getCellData(stringA, fretA);
    const second = getCellData(stringB, fretB);
    const interval = normalizeInterval(first.midi, second.midi);
    return { first, second, interval };
  }

  function createQuizQuestion() {
    const question = makeQuizNotePair();
    state.quiz.notes = [question.first, question.second];
    state.quiz.answerLocked = false;
    state.quiz.correct = question.interval;

    els.quizProgress.textContent = `Question ${state.quiz.questionNumber}`;
    els.quizNotes.textContent = `${question.first.note} → ${question.second.note}`;
    els.quizPrompt.textContent = 'Which interval do these notes create?';
    els.quizChoices.innerHTML = '';

    const pool = INTERVALS.filter(item => item.semitones <= 11 && item.short !== question.interval.short);
    const distractors = shuffle(pool).slice(0, 3);
    const choices = shuffle([question.interval, ...distractors]);

    choices.forEach(choice => {
      const button = els.choiceTemplate.content.firstElementChild.cloneNode(true);
      button.textContent = `${choice.short} · ${choice.long}`;
      button.addEventListener('click', () => answerQuiz(choice, button));
      els.quizChoices.appendChild(button);
    });

    paintSelections();
    playNote(question.first.midi);
    playNote(question.second.midi, .38);
  }

  function answerQuiz(choice, selectedButton) {
    if (state.quiz.answerLocked) return;
    state.quiz.answerLocked = true;

    const correct = choice.short === state.quiz.correct.short;
    const allButtons = [...els.quizChoices.querySelectorAll('.quiz-choice')];
    allButtons.forEach(button => {
      if (button.textContent.startsWith(state.quiz.correct.short)) button.classList.add('is-correct');
    });

    if (correct) {
      state.quiz.score += 1;
      state.quiz.streak += 1;
      els.quizPrompt.textContent = `Correct — ${state.quiz.correct.long}.`;
    } else {
      state.quiz.streak = 0;
      selectedButton.classList.add('is-wrong');
      els.quizPrompt.textContent = `Not quite — it is a ${state.quiz.correct.long}.`;
    }

    els.quizScore.textContent = String(state.quiz.score);
    els.quizStreak.textContent = String(state.quiz.streak);

    window.setTimeout(() => {
      state.quiz.questionNumber += 1;
      createQuizQuestion();
    }, 1150);
  }

  function shuffle(items) {
    return [...items].sort(() => Math.random() - .5);
  }

  els.audioButton.addEventListener('click', enableAudio);
  els.playButton.addEventListener('click', playSelectedInterval);
  els.clearButton.addEventListener('click', clearSelections);
  els.modeButtons.forEach(button => button.addEventListener('click', () => switchMode(button.dataset.mode)));
  els.fretCount.addEventListener('change', (event) => {
    state.fretCount = Number(event.target.value);
    if (state.mode === 'quiz') createQuizQuestion();
    createFretboard();
  });

  createFretboard();
  updateExploreResult();
})();
