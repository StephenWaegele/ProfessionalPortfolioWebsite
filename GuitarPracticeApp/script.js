const state = {
  screen: 'home',
  module: 'Intervals',
  mode: 'explore',
  maxFret: 12,
  showNotes: false,
  showIntervals: false,
  soundOn: true,
  selected: [],
  quiz: {
    active: false,
    questionNumber: 0,
    totalQuestions: 10,
    secondsPerQuestion: 10,
    timeRemaining: 10,
    timerId: null,
    advanceTimerId: null,
    root: null,
    targetMidi: null,
    interval: null,
    feedback: '',
    answerMode: 'draw',
    answerSelection: null,
    target: null,
    options: [],
    reviewDelaySeconds: 3,
    correctAnswers: 0,
    incorrectAnswers: 0,
    timedOutAnswers: 0,
    awaitingNextQuestion: false,
    completed: false
  }
};

const strings = [
  { name: 'E', midi: 64 },
  { name: 'B', midi: 59 },
  { name: 'G', midi: 55 },
  { name: 'D', midi: 50 },
  { name: 'A', midi: 45 },
  { name: 'E', midi: 40 }
];

const inlays = new Set([3, 5, 7, 9, 12, 15, 17, 19, 21, 24]);

const $ = (id) => document.getElementById(id);

function switchScreen(name) {
  document.querySelectorAll('.screen').forEach((element) => {
    element.classList.remove('active-screen');
  });

  $(`${name}-screen`).classList.add('active-screen');
  state.screen = name;
}

function updateQuizStatus() {
  const total = state.quiz.totalQuestions;
  const seconds = state.quiz.secondsPerQuestion;

  $('quiz-status').textContent =
    `${total} ${total === 1 ? 'question' : 'questions'} · ${seconds} seconds`;
}

function setQuizAnswerMode(mode) {
  state.quiz.answerMode = mode;

  document.querySelectorAll('.quiz-answer-mode-button').forEach((button) => {
    button.classList.toggle(
      'active-quiz-answer-mode',
      button.dataset.quizAnswerMode === mode
    );
  });

  if (state.quiz.active) {
    resetQuiz();
    state.selected = [];
    safeUpdateResults();
    renderFretboard();
  } else {
    renderQuizChoices();
  }
}

function syncQuizButton() {
  const button = $('quiz-begin-button');

  button.textContent = state.quiz.active ? 'Stop' : 'Begin';
  button.classList.toggle('quiz-stop', state.quiz.active);
}

function createMultipleChoiceOptions(correctInterval) {
  const candidates = [
    -12, -11, -10, -9, -8, -7, -6, -5, -4, -3, -2, -1,
    1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12
  ].filter((interval) => interval !== correctInterval);

  const options = [correctInterval];

  while (options.length < 4) {
    const index = Math.floor(Math.random() * candidates.length);
    const candidate = candidates.splice(index, 1)[0];
    options.push(candidate);
  }

  return options.sort(() => Math.random() - 0.5);
}

function renderQuizChoices() {
  const grid = $('quiz-choice-grid');

  const showChoices =
    state.quiz.active &&
    state.quiz.answerMode === 'multiple-choice';

  grid.hidden = !showChoices;
  grid.innerHTML = '';

  if (!showChoices) return;

  state.quiz.options.forEach((interval) => {
    const button = document.createElement('button');

    button.type = 'button';
    button.className = 'quiz-choice-button';
    button.dataset.interval = interval;
    button.textContent = Theory.intervalShort(interval);
    button.disabled = state.quiz.awaitingNextQuestion;

    grid.appendChild(button);
  });
}

function stopQuizTimer() {
  if (state.quiz.timerId) {
    clearInterval(state.quiz.timerId);
    state.quiz.timerId = null;
  }
}

function stopQuizAdvanceTimer() {
  if (state.quiz.advanceTimerId) {
    clearTimeout(state.quiz.advanceTimerId);
    state.quiz.advanceTimerId = null;
  }
}

function resetQuiz() {
  stopQuizTimer();
  stopQuizAdvanceTimer();

  state.quiz.active = false;
  state.quiz.questionNumber = 0;
  state.quiz.timeRemaining = state.quiz.secondsPerQuestion;
  state.quiz.root = null;
  state.quiz.targetMidi = null;
  state.quiz.interval = null;
  state.quiz.feedback = '';
  state.quiz.answerSelection = null;
  state.quiz.target = null;
  state.quiz.options = [];
  state.quiz.correctAnswers = 0;
  state.quiz.incorrectAnswers = 0;
  state.quiz.timedOutAnswers = 0;
  state.quiz.awaitingNextQuestion = false;
  state.quiz.completed = false;

  syncQuizButton();
}

function resetSelection() {
  state.selected = [];
  safeUpdateResults();
  renderFretboard();
}

function safeUpdateResults() {
  const output = $('result-text');

  if (state.module !== 'Intervals') {
    output.textContent =
      `${state.module} workspace is ready. Module-specific study tools will populate this same fretboard shell.`;
    return;
  }

  if (state.mode === 'quiz') {
    updateQuizResults();
    return;
  }

  if (!state.selected.length) {
    output.textContent = 'Tap notes on the fretboard to begin.';
    return;
  }

  if (state.selected.length === 1) {
    output.textContent =
      `Root: ${Theory.noteName(state.selected[0].midi)}`;
    return;
  }

  const [root, target] = state.selected;
  const semitones = target.midi - root.midi;

  output.innerHTML =
    `<span class="result-strong">Interval: ${Theory.intervalLong(semitones)}</span>`;
}

function updateQuizResults() {
  const output = $('result-text');

  if (state.quiz.completed) {
    const total = state.quiz.totalQuestions;
    const correct = state.quiz.correctAnswers;
    const accuracy = Math.round((correct / total) * 100);

    output.innerHTML = `
      <span class="result-strong">Quiz Complete</span>
      <span class="quiz-feedback">
        Score: ${correct} / ${total} · ${accuracy}% accuracy ·
        Correct: ${correct} · Incorrect: ${state.quiz.incorrectAnswers} ·
        Timed out: ${state.quiz.timedOutAnswers}
      </span>
    `;
    renderQuizChoices();
    return;
  }

  if (!state.quiz.active) {
    const total = state.quiz.totalQuestions;

    output.textContent =
      `Press Begin to start a ${total}-question interval quiz.`;
    renderQuizChoices();
    return;
  }

  const rootName = Theory.noteName(state.quiz.root.midi);
  const intervalLabel = Theory.intervalShort(state.quiz.interval);
  const direction = state.quiz.interval < 0 ? 'below' : 'above';

  output.innerHTML = `
    <span class="result-strong">
      Question ${state.quiz.questionNumber} of ${state.quiz.totalQuestions}
      · Find ${intervalLabel} ${direction} ${rootName}
    </span>
    <span class="quiz-timer">Time: ${state.quiz.timeRemaining}s</span>
    <span class="quiz-feedback">
      Score: ${state.quiz.correctAnswers} / ${
        state.quiz.correctAnswers +
        state.quiz.incorrectAnswers +
        state.quiz.timedOutAnswers
      } answered
    </span>
    ${state.quiz.feedback ? `<span class="quiz-feedback">${state.quiz.feedback}</span>` : ''}
  `;
  renderQuizChoices();
}

function finishQuestion(outcome) {
  if (!state.quiz.active || state.quiz.awaitingNextQuestion) return;

  stopQuizTimer();
  state.quiz.awaitingNextQuestion = true;

  if (outcome === 'correct') {
    state.quiz.correctAnswers += 1;
    state.quiz.feedback = 'Correct.';
  } else if (outcome === 'incorrect') {
    state.quiz.incorrectAnswers += 1;
    state.quiz.feedback = 'Incorrect.';
  } else {
    state.quiz.timedOutAnswers += 1;
    state.quiz.feedback =
      `Time expired. The answer was ${Theory.noteName(state.quiz.targetMidi)}.`;
  }

  updateQuizResults();
  renderFretboard();

  state.quiz.advanceTimerId = setTimeout(() => {
    state.quiz.advanceTimerId = null;
    advanceQuiz();
  }, state.quiz.reviewDelaySeconds * 1000);
}

function playMidi(midi) {
  if (!state.soundOn) return;

  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    const ctx = new Ctx();

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.value = 440 * Math.pow(2, (midi - 69) / 12);

    gain.gain.setValueAtTime(.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(.12, ctx.currentTime + .015);
    gain.gain.exponentialRampToValueAtTime(.0001, ctx.currentTime + .8);

    osc.connect(gain).connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + .82);

    setTimeout(() => ctx.close(), 1000);
  } catch (error) {
    // Audio can fail silently in some browser privacy modes.
  }
}

function getPlayableCells() {
  const cells = [];

  strings.forEach((string, stringIndex) => {
    for (let fret = 0; fret <= state.maxFret; fret++) {
      cells.push({
        stringIndex,
        fret,
        midi: string.midi + fret
      });
    }
  });

  return cells;
}

function createQuizQuestion() {
  const playableCells = getPlayableCells();

  const candidateIntervals = [
    -12, -11, -10, -9, -8, -7, -6, -5, -4, -3, -2, -1,
    1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12
  ];

  const validQuestions = [];

  playableCells.forEach((root) => {
    candidateIntervals.forEach((interval) => {
      const targetMidi = root.midi + interval;

      const validTargets = playableCells.filter(
        (cell) => cell.midi === targetMidi
      );

      if (validTargets.length) {
        validQuestions.push({
          root,
          interval,
          targetMidi,
          target: validTargets[
            Math.floor(Math.random() * validTargets.length)
          ]
        });
      }
    });
  });

  const question =
    validQuestions[Math.floor(Math.random() * validQuestions.length)];

  state.quiz.root = question.root;
  state.quiz.interval = question.interval;
  state.quiz.targetMidi = question.targetMidi;
  state.quiz.target = question.target;
  state.quiz.timeRemaining = state.quiz.secondsPerQuestion;
  state.quiz.feedback = '';
  state.quiz.answerSelection = null;
  state.quiz.options =
    state.quiz.answerMode === 'multiple-choice'
      ? createMultipleChoiceOptions(question.interval)
      : [];
  state.quiz.awaitingNextQuestion = false;

  updateQuizResults();
  renderQuizChoices();
  renderFretboard();
  playMidi(state.quiz.root.midi);
}

function startQuizTimer() {
  stopQuizTimer();

  state.quiz.timerId = setInterval(() => {
    state.quiz.timeRemaining -= 1;
    updateQuizResults();

    if (state.quiz.timeRemaining <= 0) {
      finishQuestion('timeout');
    }
  }, 1000);
}

function startQuiz() {
  state.selected = [];
  state.quiz.active = true;
  state.quiz.completed = false;
  state.quiz.questionNumber = 1;
  state.quiz.correctAnswers = 0;
  state.quiz.incorrectAnswers = 0;
  state.quiz.timedOutAnswers = 0;
  state.quiz.awaitingNextQuestion = false;

  syncQuizButton();

  createQuizQuestion();
  startQuizTimer();
}

function advanceQuiz() {
  stopQuizTimer();
  stopQuizAdvanceTimer();

  if (state.quiz.questionNumber >= state.quiz.totalQuestions) {
    state.quiz.active = false;
    state.quiz.completed = true;
    state.quiz.awaitingNextQuestion = false;

    syncQuizButton();
    updateQuizResults();
    renderFretboard();
    return;
  }

  state.quiz.questionNumber += 1;
  createQuizQuestion();
  startQuizTimer();
}

function handleQuizAnswer(stringIndex, fret, midi) {
  if (
    !state.quiz.active ||
    state.quiz.answerMode !== 'draw' ||
    state.quiz.awaitingNextQuestion
  ) {
    return;
  }

  playMidi(midi);

  state.quiz.answerSelection = {
    stringIndex,
    fret,
    midi
  };

  finishQuestion(
    midi === state.quiz.targetMidi ? 'correct' : 'incorrect'
  );
}

function createNoteLabel(dot, topText, bottomText) {
  const noteLine = document.createElement('span');
  noteLine.className = 'note-dot-note';
  noteLine.textContent = topText;

  const intervalLine = document.createElement('span');
  intervalLine.className = 'note-dot-interval';
  intervalLine.textContent = bottomText;

  dot.append(noteLine, intervalLine);
}

function renderFretboard() {
  const board = $('fretboard');

  board.innerHTML = '';
  board.style.setProperty('--fret-count', state.maxFret + 1);
  board.style.setProperty('--fretted-count', state.maxFret);

  strings.forEach((string, stringIndex) => {
    const label = document.createElement('div');
    label.className = 'string-label';
    label.textContent = string.name;
    board.appendChild(label);

    for (let fret = 0; fret <= state.maxFret; fret++) {
      const midi = string.midi + fret;

      const cell = document.createElement('button');
      cell.type = 'button';
      cell.className = 'fret-cell';
      cell.dataset.fret = fret;
      cell.setAttribute(
        'aria-label',
        `${string.name} string, fret ${fret}, ${Theory.noteName(midi)}`
      );

      if (inlays.has(fret)) {
        if (fret === 12 || fret === 24) {
          if (stringIndex === 2) {
            const topMarker = document.createElement('span');
            topMarker.className = 'fret-inlay double-top';
            cell.appendChild(topMarker);
          }

          if (stringIndex === 4) {
            const bottomMarker = document.createElement('span');
            bottomMarker.className = 'fret-inlay double-bottom';
            cell.appendChild(bottomMarker);
          }
        } else if (stringIndex === 3) {
          const marker = document.createElement('span');
          marker.className = 'fret-inlay single';
          cell.appendChild(marker);
        }
      }

      const dot = document.createElement('span');
      dot.className = 'note-dot';

      if (state.mode === 'quiz' && state.quiz.active) {
        if (
          midi === state.quiz.root.midi &&
          stringIndex === state.quiz.root.stringIndex &&
          fret === state.quiz.root.fret
        ) {
          dot.classList.add('root');

          if (state.showNotes || state.showIntervals) {
            createNoteLabel(
              dot,
              state.showNotes ? Theory.noteName(midi) : '',
              state.showIntervals ? 'I' : ''
            );
          }
        }

        if (
          state.quiz.answerMode === 'multiple-choice' &&
          state.quiz.target &&
          stringIndex === state.quiz.target.stringIndex &&
          fret === state.quiz.target.fret
        ) {
          dot.classList.add('target');

          if (state.showNotes || state.showIntervals) {
            createNoteLabel(
              dot,
              state.showNotes ? Theory.noteName(midi) : '',
              state.showIntervals
                ? Theory.intervalShort(state.quiz.interval)
                : ''
            );
          }
        }

        if (
          state.quiz.answerMode === 'draw' &&
          state.quiz.answerSelection &&
          stringIndex === state.quiz.answerSelection.stringIndex &&
          fret === state.quiz.answerSelection.fret
        ) {
          dot.classList.add('target');

          if (state.showNotes || state.showIntervals) {
            createNoteLabel(
              dot,
              state.showNotes ? Theory.noteName(midi) : '',
              state.showIntervals
                ? Theory.intervalShort(midi - state.quiz.root.midi)
                : ''
            );
          }
        }
      } else {
        const selectedPosition = state.selected.findIndex(
          (note) =>
            note.stringIndex === stringIndex &&
            note.fret === fret
        );

        if (selectedPosition === 0) {
          dot.classList.add('root');

          if (state.showNotes || state.showIntervals) {
            createNoteLabel(
              dot,
              state.showNotes ? Theory.noteName(midi) : '',
              state.showIntervals ? 'I' : ''
            );
          }
        }

        if (selectedPosition === 1) {
          dot.classList.add('target');

          if (state.showNotes || state.showIntervals) {
            const semitones = midi - state.selected[0].midi;

            createNoteLabel(
              dot,
              state.showNotes ? Theory.noteName(midi) : '',
              state.showIntervals
                ? Theory.intervalShort(semitones)
                : ''
            );
          }
        }
      }

      cell.appendChild(dot);

      cell.addEventListener('click', () => {
        if (state.module !== 'Intervals') {
          $('result-text').textContent =
            `${state.module}: selected ${Theory.noteName(midi)} at fret ${fret}.`;

          playMidi(midi);
          return;
        }

        if (state.mode === 'quiz') {
          handleQuizAnswer(stringIndex, fret, midi);
          return;
        }

        if (state.selected.length === 2) {
          state.selected = [];
        }

        state.selected.push({
          stringIndex,
          fret,
          midi
        });

        safeUpdateResults();
        renderFretboard();
        playMidi(midi);
      });

      board.appendChild(cell);
    }
  });
}

function setModule(name) {
  state.module = name;

  $('module-title').textContent = name;
  $('module-menu').hidden = true;
  $('module-picker-button').setAttribute('aria-expanded', 'false');

  resetQuiz();
  resetSelection();
}

function setMode(mode) {
  state.mode = mode;

  document.querySelectorAll('.mode-button').forEach((button) => {
    button.classList.toggle(
      'active-mode',
      button.dataset.mode === mode
    );
  });

  const workspace = document.querySelector('.study-workspace');
  workspace.classList.toggle('quiz-mode', mode === 'quiz');

  resetQuiz();
  state.selected = [];

  safeUpdateResults();
  renderFretboard();
}

function syncSound(on) {
  state.soundOn = on;

  const soundButton = $('sound-toggle');

  soundButton.classList.toggle('active-toggle', on);
  soundButton.classList.toggle('sound-muted', !on);

  soundButton.setAttribute('aria-pressed', String(on));
  soundButton.setAttribute('title', on ? 'Sound on' : 'Sound off');
  soundButton.setAttribute(
    'aria-label',
    on ? 'Turn sound off' : 'Turn sound on'
  );

  $('settings-sound-checkbox').checked = on;
}

$('study-button').addEventListener('click', () => {
  switchScreen('study');
  renderFretboard();
  safeUpdateResults();
});

$('play-button').addEventListener('click', () => {
  switchScreen('play');
});

$('back-home-button').addEventListener('click', () => {
  resetQuiz();
  switchScreen('home');
});

$('back-from-play-button').addEventListener('click', () => {
  switchScreen('home');
});

$('module-picker-button').addEventListener('click', () => {
  const menu = $('module-menu');

  menu.hidden = !menu.hidden;

  $('module-picker-button').setAttribute(
    'aria-expanded',
    String(!menu.hidden)
  );
});

document.querySelectorAll('#module-menu button').forEach((button) => {
  button.addEventListener('click', () => {
    setModule(button.dataset.module);
  });
});

document.querySelectorAll('.mode-button').forEach((button) => {
  button.addEventListener('click', () => {
    setMode(button.dataset.mode);
  });
});

document.querySelectorAll('.quiz-answer-mode-button').forEach((button) => {
  button.addEventListener('click', () => {
    setQuizAnswerMode(button.dataset.quizAnswerMode);
  });
});

$('quiz-choice-grid').addEventListener('click', (event) => {
  const button = event.target.closest('.quiz-choice-button');

  if (
    !button ||
    !state.quiz.active ||
    state.quiz.answerMode !== 'multiple-choice' ||
    state.quiz.awaitingNextQuestion
  ) {
    return;
  }

  const selectedInterval = Number(button.dataset.interval);

  finishQuestion(
    selectedInterval === state.quiz.interval ? 'correct' : 'incorrect'
  );
});

$('quiz-question-count').addEventListener('change', (event) => {
  const requestedCount = Number(event.target.value);

  state.quiz.totalQuestions = Math.max(
    1,
    Number.isFinite(requestedCount) ? Math.floor(requestedCount) : 10
  );

  event.target.value = state.quiz.totalQuestions;

  if (state.quiz.active) {
    resetQuiz();
    state.selected = [];
    renderFretboard();
  }

  updateQuizStatus();
  safeUpdateResults();
});

$('quiz-question-timer-select').addEventListener('change', (event) => {
  state.quiz.secondsPerQuestion = Number(event.target.value);

  if (state.quiz.active) {
    resetQuiz();
    state.selected = [];
    renderFretboard();
  }

  updateQuizStatus();
  safeUpdateResults();
});

$('decrease-frets').addEventListener('click', () => {
  state.maxFret = Math.max(12, state.maxFret - 1);

  $('fret-label').textContent = `Frets: 0–${state.maxFret}`;

  resetQuiz();
  renderFretboard();
});

$('increase-frets').addEventListener('click', () => {
  state.maxFret = Math.min(24, state.maxFret + 1);

  $('fret-label').textContent = `Frets: 0–${state.maxFret}`;

  resetQuiz();
  renderFretboard();
});

$('notes-toggle').addEventListener('click', () => {
  state.showNotes = !state.showNotes;

  $('notes-toggle').classList.toggle(
    'active-toggle',
    state.showNotes
  );

  $('notes-toggle').setAttribute(
    'aria-pressed',
    String(state.showNotes)
  );

  renderFretboard();
});

$('interval-toggle').addEventListener('click', () => {
  state.showIntervals = !state.showIntervals;

  $('interval-toggle').classList.toggle(
    'active-toggle',
    state.showIntervals
  );

  $('interval-toggle').setAttribute(
    'aria-pressed',
    String(state.showIntervals)
  );

  renderFretboard();
});

$('sound-toggle').addEventListener('click', () => {
  syncSound(!state.soundOn);
});

$('quiz-begin-button').addEventListener('click', () => {
  if (state.quiz.active) {
    resetQuiz();
    state.selected = [];
    safeUpdateResults();
    renderFretboard();
    return;
  }

  if (state.mode !== 'quiz') {
    setMode('quiz');
  }

  startQuiz();
});

function openSettings() {
  $('settings-overlay').hidden = false;
}

function closeSettings() {
  $('settings-overlay').hidden = true;
}

$('home-settings-button').addEventListener('click', openSettings);
$('study-settings-button').addEventListener('click', openSettings);
$('close-settings-button').addEventListener('click', closeSettings);
$('close-settings-done').addEventListener('click', closeSettings);

$('settings-fret-select').addEventListener('change', (event) => {
  state.maxFret = Number(event.target.value);

  $('fret-label').textContent = `Frets: 0–${state.maxFret}`;

  resetQuiz();
  renderFretboard();
});

$('quiz-review-delay-select').addEventListener('change', (event) => {
  state.quiz.reviewDelaySeconds = Number(event.target.value);
});

$('settings-sound-checkbox').addEventListener('change', (event) => {
  syncSound(event.target.checked);
});

$('settings-overlay').addEventListener('click', (event) => {
  if (event.target === $('settings-overlay')) {
    closeSettings();
  }
});

setQuizAnswerMode(state.quiz.answerMode);
updateQuizStatus();
setMode('explore');
renderFretboard();
safeUpdateResults();