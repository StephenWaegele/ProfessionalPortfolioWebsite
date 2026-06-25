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
    root: null,
    targetMidi: null,
    interval: null,
    feedback: ''
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

function syncQuizButton() {
  const button = $('quiz-begin-button');

  button.textContent = state.quiz.active ? 'Stop' : 'Begin';
  button.classList.toggle('quiz-stop', state.quiz.active);
}

function stopQuizTimer() {
  if (state.quiz.timerId) {
    clearInterval(state.quiz.timerId);
    state.quiz.timerId = null;
  }
}

function resetQuiz() {
  stopQuizTimer();

  state.quiz.active = false;
  state.quiz.questionNumber = 0;
  state.quiz.timeRemaining = state.quiz.secondsPerQuestion;
  state.quiz.root = null;
  state.quiz.targetMidi = null;
  state.quiz.interval = null;
  state.quiz.feedback = '';
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

  if (!state.quiz.active) {
    output.textContent =
      'Press Begin to start a 10-question interval quiz.';
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
    ${state.quiz.feedback ? `<span class="quiz-feedback">${state.quiz.feedback}</span>` : ''}
  `;
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
          targetMidi
        });
      }
    });
  });

  const question =
    validQuestions[Math.floor(Math.random() * validQuestions.length)];

  state.quiz.root = question.root;
  state.quiz.interval = question.interval;
  state.quiz.targetMidi = question.targetMidi;
  state.quiz.timeRemaining = state.quiz.secondsPerQuestion;
  state.quiz.feedback = '';

  updateQuizResults();
  renderFretboard();
  playMidi(state.quiz.root.midi);
}

function startQuizTimer() {
  stopQuizTimer();

  state.quiz.timerId = setInterval(() => {
    state.quiz.timeRemaining -= 1;
    updateQuizResults();

    if (state.quiz.timeRemaining <= 0) {
      stopQuizTimer();

      state.quiz.feedback =
        `Time expired. The answer was ${Theory.noteName(state.quiz.targetMidi)}.`;

      updateQuizResults();

      setTimeout(() => {
        advanceQuiz();
      }, 1200);
    }
  }, 1000);
}

function startQuiz() {
  state.selected = [];
  state.quiz.active = true;
  state.quiz.questionNumber = 1;
  syncQuizButton();

  createQuizQuestion();
  startQuizTimer();
}

function advanceQuiz() {
  stopQuizTimer();

  if (state.quiz.questionNumber >= state.quiz.totalQuestions) {
    state.quiz.active = false;
    state.quiz.feedback = 'Quiz complete.';
    updateQuizResults();
    renderFretboard();
    return;
  }

  state.quiz.questionNumber += 1;
  createQuizQuestion();
  startQuizTimer();
}

function handleQuizAnswer(midi) {
  if (!state.quiz.active) return;

  playMidi(midi);

  if (midi === state.quiz.targetMidi) {
    stopQuizTimer();

    state.quiz.feedback = 'Correct.';
    updateQuizResults();

    setTimeout(() => {
      advanceQuiz();
    }, 700);

    return;
  }

  state.quiz.feedback = 'Try again.';
  updateQuizResults();
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
          if (stringIndex === 1) {
            const topMarker = document.createElement('span');
            topMarker.className = 'fret-inlay double-top';
            cell.appendChild(topMarker);
          }

          if (stringIndex === 4) {
            const bottomMarker = document.createElement('span');
            bottomMarker.className = 'fret-inlay double-bottom';
            cell.appendChild(bottomMarker);
          }
        } else if (stringIndex === 2) {
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
          createNoteLabel(dot, Theory.noteName(midi), 'I');
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
          handleQuizAnswer(midi);
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

  $('quiz-controls').hidden = mode !== 'quiz';

  resetQuiz();
  state.selected = [];

  safeUpdateResults();
  renderFretboard();
}

function syncSound(on) {
  state.soundOn = on;

  $('sound-toggle').classList.toggle('active-toggle', on);
  $('sound-toggle').setAttribute('aria-pressed', String(on));
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

$('settings-sound-checkbox').addEventListener('change', (event) => {
  syncSound(event.target.checked);
});

$('settings-overlay').addEventListener('click', (event) => {
  if (event.target === $('settings-overlay')) {
    closeSettings();
  }
});

setMode('explore');
renderFretboard();
safeUpdateResults();