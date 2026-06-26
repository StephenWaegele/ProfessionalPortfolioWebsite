const state = {
  screen: 'home',
  module: 'Intervals',
  mode: 'explore',
  maxFret: 12,
  showNotes: false,
  showIntervals: false,
  soundOn: true,
  selected: [],
  chords: {
    exploreMode: 'build',
    rootMidi: 0,
    type: 'major',
    extension: 'none',
    voicingFamily: 'CAGED',
    drop2Inversion: 'root',
    drop2StringSet: '1-4',
    cagedShape: 'C shape',
    position: 'Open',
    generatedVoicing: [0, 1, 0, 2, 3, null],
    mutedStrings: [false, false, false, false, false, false],
    selected: []
  },
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
    chordQuestionType: 'identify',
    chordQuestion: null,
    chordSelection: [],
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

  document
    .querySelectorAll('[data-quiz-answer-mode]')
    .forEach((button) => {
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

function setChordQuizType(type) {
  state.quiz.chordQuestionType = type;

  document.querySelectorAll('.chord-quiz-type-button').forEach((button) => {
    button.classList.toggle(
      'active-chord-quiz-type',
      button.dataset.chordQuizType === type
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

function syncModuleQuizControls() {
  const intervalControl = $('quiz-answer-mode-switch');
  const chordControl = $('chord-explore-mode-switch');

  intervalControl.hidden = state.module === 'Chords';
  chordControl.hidden = state.module !== 'Chords';
}

function syncChordExploreControls() {
  const isChordsExplore =
    state.module === 'Chords' &&
    state.mode === 'explore';

  const isBuild = state.chords.exploreMode === 'build';

  $('chord-explore-mode-switch').hidden = !isChordsExplore;
  $('chord-build-controls').hidden = !isChordsExplore || !isBuild;
  $('quiz-analyze-button').hidden = !isChordsExplore || isBuild;

  $('chord-identify-actions').hidden =
    !isChordsExplore || isBuild;

  document.querySelectorAll('[data-chord-explore-mode]').forEach((button) => {
    button.classList.toggle(
      'active-quiz-answer-mode',
      button.dataset.chordExploreMode === state.chords.exploreMode
    );
  });
}

function getChordExploreTonePitchClasses() {
  return Theory.chordPitchClasses(
    state.chords.rootMidi,
    state.chords.type
  );
}

function isChordBuildMode() {
  return state.module === 'Chords' && state.mode === 'explore' && state.chords.exploreMode === 'build';
}

function syncChordBuildVoicing() {
  if (!isChordBuildMode()) return false;

  if (
    state.chords.type !== 'major' &&
    state.chords.type !== 'minor' &&
    state.chords.type !== 'dominant7'
  ) {
    state.chords.generatedVoicing = [null, null, null, null, null, null];
    return false;
  }

  const voicing = Theory.generateCagedVoicing(
    state.chords.rootMidi,
    state.chords.type,
    state.chords.cagedShape,
    state.chords.position
  );

  if (!voicing) {
    state.chords.generatedVoicing = [null, null, null, null, null, null];
    return false;
  }

  state.chords.generatedVoicing = voicing.map((fret, index) => (
    state.chords.mutedStrings[index] ? null : fret
  ));

  return true;
}

function populateChordBuildControls() {
  const rootSelect = $('chord-root-select');
  const typeSelect = $('chord-type-select');
  const voicingSelect = $('chord-voicing-select');
  const shapeSelect = $('chord-shape-select');
  const positionSelect = $('chord-position-select');

  rootSelect.innerHTML = '';
  typeSelect.innerHTML = '';
  voicingSelect.innerHTML = '';
  shapeSelect.innerHTML = '';
  positionSelect.innerHTML = '';

  for (let midi = 0; midi < 12; midi += 1) {
    const option = document.createElement('option');
    option.value = midi;
    option.textContent = Theory.noteName(midi);
    rootSelect.appendChild(option);
  }

  Object.entries(Theory.chordTypes).forEach(([type, chord]) => {
    const option = document.createElement('option');
    option.value = type;
    option.textContent = chord.label;
    typeSelect.appendChild(option);
  });

  const voicingOption = document.createElement('option');
  voicingOption.value = 'CAGED';
  voicingOption.textContent = 'CAGED';
  voicingSelect.appendChild(voicingOption);

  Theory.cageShapeNames().forEach((shapeName) => {
    const option = document.createElement('option');
    option.value = shapeName;
    option.textContent = shapeName;
    shapeSelect.appendChild(option);
  });

  Theory.cagePositionsForShape(state.chords.cagedShape).forEach((positionName) => {
    const option = document.createElement('option');
    option.value = positionName;
    option.textContent = positionName;
    positionSelect.appendChild(option);
  });

  rootSelect.value = state.chords.rootMidi;
  typeSelect.value = state.chords.type;
  $('chord-extension-select').value = state.chords.extension;
  voicingSelect.value = state.chords.voicingFamily;
  shapeSelect.value = state.chords.cagedShape;

  if (!Theory.cagePositionsForShape(state.chords.cagedShape).includes(state.chords.position)) {
    state.chords.position = Theory.cagePositionsForShape(state.chords.cagedShape)[0] || 'Open';
  }

  positionSelect.value = state.chords.position;
}

function getChordIdentifyNotesInPitchOrder() {
  return [...state.chords.selected].sort(
    (left, right) => left.midi - right.midi
  );
}

function getSelectedChordIntervalLabels(result) {
  const rootMidi = result.rootMidi;
  const chordIntervals = Theory.chordInfo(result.type).intervals;

  const chordLabels = {
    0: '1',
    1: '♭2',
    2: '2',
    3: '♭3',
    4: '3',
    5: '4',
    6: '♭5',
    7: '5',
    8: '♯5',
    9: '6',
    10: '♭7',
    11: '7',
    12: '8',
    13: '♭9',
    14: '9',
    15: '♭10',
    16: '10',
    17: '11',
    18: '♯11',
    19: '12',
    20: '♭13',
    21: '13',
    22: '♯13',
    23: '14',
    24: '15'
  };

  return getChordIdentifyNotesInPitchOrder()
    .map((note) => {
      const semitones = note.midi - rootMidi;
      const pitchClass = Theory.pitchClass(note.midi);

      const chordInterval = chordIntervals.find(
        (interval) =>
          Theory.pitchClass(rootMidi + interval) === pitchClass
      );

      if (chordInterval === 18) {
        return '♯11';
      }

      if (semitones >= 0 && chordLabels[semitones]) {
        return chordLabels[semitones];
      }

      if (chordInterval !== undefined) {
        return chordLabels[chordInterval] || String(chordInterval);
      }

      return Theory.intervalShort(semitones);
    })
    .join(' · ');
}

function getChordIdentifyDisplayName(result) {
  const chordName = Theory.chordName(result.rootMidi, result.type);
  const notesInPitchOrder = getChordIdentifyNotesInPitchOrder();

  if (!notesInPitchOrder.length) {
    return chordName;
  }

  const bassMidi = notesInPitchOrder[0].midi;
  const bassPitchClass = Theory.pitchClass(bassMidi);
  const rootPitchClass = Theory.pitchClass(result.rootMidi);

  if (bassPitchClass === rootPitchClass) {
    return chordName;
  }

  return `${chordName}/${Theory.noteName(bassMidi)}`;
}

function renderChordExploreResults() {
  const output = $('result-text');

  if (state.chords.exploreMode === 'build') {
    if (
      state.chords.type !== 'major' &&
      state.chords.type !== 'minor' &&
      state.chords.type !== 'dominant7'
    ) {
      output.innerHTML = `
        <span class="result-strong">
          CAGED shapes are currently available for major, minor, and dominant 7 chords only.
        </span>
      `;
      return;
    }

    const supported = syncChordBuildVoicing();

    if (!supported) {
      const qualityLabel = state.chords.type === 'minor' ? 'minor' : 'major';
      const unsupportedMinorShape = state.chords.type === 'minor' && ['C shape', 'G shape'].includes(state.chords.cagedShape);

      output.innerHTML = `
        <span class="result-strong">
          ${unsupportedMinorShape
            ? 'That minor CAGED shape is not available yet.'
            : (Theory.cagePositionsForShape(state.chords.cagedShape).includes(state.chords.position)
              ? `CAGED shapes are currently available for ${qualityLabel} and minor chords only.`
              : 'That CAGED shape is not available at this position yet.')}
        </span>
      `;
      return;
    }

    const chordTones = Theory.chordPitchClasses(
      state.chords.rootMidi,
      state.chords.type
    )
      .map((pitchClass) => Theory.noteName(pitchClass))
      .join(' · ');

    output.innerHTML = `
      <span class="result-strong">
        ${Theory.noteName(state.chords.rootMidi)} ${Theory.chordInfo(state.chords.type).label} · CAGED ${state.chords.cagedShape} · ${state.chords.position}
      </span>
      <span class="quiz-feedback">
        ${chordTones} · ${Theory.chordFormula(state.chords.type)}
      </span>
    `;
    return;
  }

  if (!state.chords.selected.length) {
    output.innerHTML = `
      <span class="result-strong">
        Select chord tones on the fretboard. The first note is the root.
      </span>
    `;
    return;
  }

  const selectedPitchClasses = [
    ...new Set(state.chords.selected.map((note) => Theory.pitchClass(note.midi)))
  ];

  if (selectedPitchClasses.length < 3) {
    const rootNote = Theory.noteName(state.chords.selected[0].midi);

    output.innerHTML = `
      <span class="result-strong">
        Root: ${rootNote}
      </span>
      <span class="quiz-feedback">
        Add at least three unique pitch classes to identify a chord.
      </span>
    `;
    return;
  }

  const result = identifySelectedChord();

  if (!result) {
    const rootNote = Theory.noteName(state.chords.selected[0].midi);

    output.innerHTML = `
      <span class="result-strong">
        No exact chord match
      </span>
      <span class="quiz-feedback">
        Selected root: ${rootNote}
      </span>
    `;
    return;
  }

  const selectedNotes = getChordIdentifyNotesInPitchOrder()
    .map((note) => Theory.noteName(note.midi))
    .join(' · ');

  const selectedIntervals = getSelectedChordIntervalLabels(result);

  output.innerHTML = `
    <span class="identified-chord-name">
      ${getChordIdentifyDisplayName(result)}
    </span>
    <span class="identified-chord-notes">
      ${selectedNotes}
    </span>
    <span class="identified-chord-intervals">
      ${selectedIntervals}
    </span>
  `;
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

function createChordIdentifyOptions(correctName) {
  const chordEntries = Object.entries(Theory.chordTypes);
  const options = new Set([correctName]);

  while (options.size < 4) {
    const [rootOffset, chord] = chordEntries[
      Math.floor(Math.random() * chordEntries.length)
    ];

    const root = Math.floor(Math.random() * 12);
    options.add(Theory.chordName(root, rootOffset));
  }

  return [...options].sort(() => Math.random() - 0.5);
}

function renderQuizChoices() {
  const grid = $('quiz-choice-grid');
  const analyzeButton = $('quiz-analyze-button');

  const showIntervalChoices =
    state.quiz.active &&
    state.module === 'Intervals' &&
    state.quiz.answerMode === 'multiple-choice';

  const showChordIdentifyChoices =
    state.quiz.active &&
    state.module === 'Chords' &&
    state.quiz.chordQuestionType === 'identify';

  const showChordBuildAnalyze =
    state.quiz.active &&
    state.module === 'Chords' &&
    state.quiz.chordQuestionType === 'build';

  const showChoices = showIntervalChoices || showChordIdentifyChoices;

  grid.hidden = !showChoices;
  grid.innerHTML = '';
  analyzeButton.hidden = !showChordBuildAnalyze;
  analyzeButton.disabled = state.quiz.awaitingNextQuestion;

  if (!showChoices) return;

  state.quiz.options.forEach((option) => {
    const button = document.createElement('button');

    button.type = 'button';
    button.className = 'quiz-choice-button';

    if (showIntervalChoices) {
      button.dataset.interval = option;
      button.textContent = Theory.intervalShort(option);
    } else {
      button.dataset.chordAnswer = option;
      button.textContent = option;
    }

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
  state.quiz.chordQuestion = null;
  state.quiz.chordSelection = [];
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

  if (state.module === 'Chords' && state.mode === 'explore') {
    renderChordExploreResults();
    return;
  }

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
    const quizName = state.module === 'Chords' ? 'chord quiz' : 'interval quiz';

    output.textContent =
      `Press Begin to start a ${total}-question ${quizName}.`;
    renderQuizChoices();
    return;
  }

  if (state.module === 'Chords') {
    const chordQuestion = state.quiz.chordQuestion;
    const chordLabel = chordQuestion ? chordQuestion.name : 'a chord';
    const isBuild = state.quiz.chordQuestionType === 'build';
    const promptText = isBuild
      ? `Build ${chordLabel} by selecting its chord tones.`
      : `Identify the chord shown on the fretboard.`;

    output.innerHTML = `
      <span class="result-strong">
        Question ${state.quiz.questionNumber} of ${state.quiz.totalQuestions}
        · ${promptText}
      </span>
      <span class="quiz-timer">Time: ${state.quiz.timeRemaining}s</span>
      <span class="quiz-feedback">
        Score: ${state.quiz.correctAnswers} / ${
          state.quiz.correctAnswers +
          state.quiz.incorrectAnswers +
          state.quiz.timedOutAnswers
        }
      </span>
      ${state.quiz.feedback ? `<span class="quiz-feedback">${state.quiz.feedback}</span>` : ''}
    `;
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
      }
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

    if (state.module === 'Chords' && state.quiz.chordQuestion) {
      state.quiz.feedback =
        `Time expired. The answer was ${state.quiz.chordQuestion.name}.`;
    } else {
      state.quiz.feedback =
        `Time expired. The answer was ${Theory.noteName(state.quiz.targetMidi)}.`;
    }
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

function createChordQuizQuestion() {
  const playableCells = getPlayableCells();
  const chordEntries = Object.entries(Theory.chordTypes);
  const root = Math.floor(Math.random() * 12);
  const [type] = chordEntries[Math.floor(Math.random() * chordEntries.length)];

  const pitchClasses = Theory.chordPitchClasses(root, type);

  const chordTargetCells = pitchClasses.map((pitchClass) => {
    const candidates = playableCells.filter(
      (cell) => Theory.pitchClass(cell.midi) === pitchClass
    );

    return candidates[Math.floor(Math.random() * candidates.length)];
  });

  state.quiz.chordQuestion = {
    rootMidi: root,
    type,
    name: Theory.chordName(root, type),
    pitchClasses,
    targetCells: chordTargetCells
  };
  state.quiz.chordSelection = [];
  state.quiz.timeRemaining = state.quiz.secondsPerQuestion;
  state.quiz.feedback = '';
  state.quiz.answerSelection = null;
  state.quiz.options =
    state.quiz.chordQuestionType === 'identify'
      ? createChordIdentifyOptions(state.quiz.chordQuestion.name)
      : [];
  state.quiz.awaitingNextQuestion = false;

  updateQuizResults();
  renderQuizChoices();
  renderFretboard();
  playMidi(state.quiz.chordQuestion.rootMidi);
}

function createQuizQuestion() {
  if (state.module === 'Chords') {
    createChordQuizQuestion();
    return;
  }

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
  if (!state.quiz.active || state.quiz.awaitingNextQuestion) return;

  if (state.module === 'Chords' && state.quiz.chordQuestionType === 'build') {
    const key = `${stringIndex}:${fret}`;
    const existingIndex = state.quiz.chordSelection.findIndex(
      (item) => item.key === key
    );

    if (existingIndex >= 0) {
      state.quiz.chordSelection.splice(existingIndex, 1);
    } else {
      state.quiz.chordSelection.push({ stringIndex, fret, midi, key });
    }

    playMidi(midi);
    safeUpdateResults();
    renderFretboard();
    return;
  }

  if (state.quiz.answerMode !== 'draw') return;

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

function toggleStringMute(stringIndex) {
  if (!isChordBuildMode()) return;

  state.chords.mutedStrings[stringIndex] = !state.chords.mutedStrings[stringIndex];
  syncChordBuildVoicing();
  safeUpdateResults();
  renderFretboard();
}

function getChordBuildRootLocation() {
  const rootPitchClass = Theory.pitchClass(state.chords.rootMidi);
  const voicing = state.chords.generatedVoicing || [];

  let lowestRoot = null;

  voicing.forEach((fret, stringIndex) => {
    if (fret === null || fret === undefined) return;

    const midi = strings[stringIndex].midi + fret;

    if (Theory.pitchClass(midi) !== rootPitchClass) return;

    if (!lowestRoot || midi < lowestRoot.midi) {
      lowestRoot = {
        stringIndex,
        fret,
        midi
      };
    }
  });

  return lowestRoot;
}

function identifySelectedChord() {
  if (!state.chords.selected.length) return null;

  const actualPitchClasses = [
    ...new Set(
      state.chords.selected.map((note) => Theory.pitchClass(note.midi))
    )
  ].sort((a, b) => a - b);

  if (actualPitchClasses.length < 3) return null;

  const rootMidi = state.chords.selected[0].midi;
  const rootPitchClass = Theory.pitchClass(rootMidi);

  function buildResult(type, matchKind, omittedPitchClasses = []) {
    const chord = Theory.chordInfo(type);
    const expectedPitchClasses = chord.intervals
      .map((interval) => Theory.pitchClass(rootPitchClass + interval));

    return {
      rootMidi,
      type,
      name: `${Theory.noteName(rootMidi)} ${chord.label}`,
      notes: expectedPitchClasses.map((pitchClass) => Theory.noteName(pitchClass)),
      formula: Theory.chordFormula(type),
      matchKind,
      omittedNotes: omittedPitchClasses.map((pitchClass) =>
        Theory.noteName(pitchClass)
      )
    };
  }

  // Stage 1: exact pitch-class matching always takes priority.
  for (const [type, chord] of Object.entries(Theory.chordTypes)) {
    const expectedPitchClasses = chord.intervals
      .map((interval) => Theory.pitchClass(rootPitchClass + interval))
      .sort((a, b) => a - b);

    if (
      expectedPitchClasses.length === actualPitchClasses.length &&
      expectedPitchClasses.every(
        (pitchClass, index) => pitchClass === actualPitchClasses[index]
      )
    ) {
      return buildResult(type, 'exact');
    }
  }

  // Stage 2: practical guitar voicings.
  // Required tones preserve the chord identity.
  // Other chord tones may be omitted.
  const practicalRules = {
    sixth: [0, 4, 9],
    minor6: [0, 3, 9],

    sixNine: [0, 4, 9, 14],

    add9: [0, 4, 14],

    dominant7: [0, 4, 10],
    major7: [0, 4, 11],
    minor7: [0, 3, 10],

    dominant9: [0, 4, 10, 14],
    major9: [0, 4, 11, 14],
    minor9: [0, 3, 10, 14],

    dominant13: [0, 4, 10, 21]
  };

  for (const [type, requiredIntervals] of Object.entries(practicalRules)) {
    const chord = Theory.chordInfo(type);

    if (!chord) continue;

    const expectedPitchClasses = chord.intervals.map((interval) =>
      Theory.pitchClass(rootPitchClass + interval)
    );

    const requiredPitchClasses = requiredIntervals.map((interval) =>
      Theory.pitchClass(rootPitchClass + interval)
    );

    const includesRequiredTones = requiredPitchClasses.every(
      (pitchClass) => actualPitchClasses.includes(pitchClass)
    );

    const containsOnlyChordTones = actualPitchClasses.every(
      (pitchClass) => expectedPitchClasses.includes(pitchClass)
    );

    if (!includesRequiredTones || !containsOnlyChordTones) continue;

    const omittedPitchClasses = expectedPitchClasses.filter(
      (pitchClass) => !actualPitchClasses.includes(pitchClass)
    );

    if (!omittedPitchClasses.length) continue;

    return buildResult(type, 'practical', omittedPitchClasses);
  }

  return null;
}

function promoteChordIdentifyRoot(stringIndex, fret) {
  const selectedIndex = state.chords.selected.findIndex(
    (note) => note.stringIndex === stringIndex && note.fret === fret
  );

  if (selectedIndex < 0) return false;

  const [selectedNote] = state.chords.selected.splice(selectedIndex, 1);

  state.chords.selected.unshift(selectedNote);
  safeUpdateResults();
  renderFretboard();
  return true;
}

function renderFretboard() {
  const board = $('fretboard');

  board.innerHTML = '';
  board.style.setProperty('--fret-count', state.maxFret + 1);
  board.style.setProperty('--fretted-count', state.maxFret);

  strings.forEach((string, stringIndex) => {
    const label = document.createElement('div');
    label.className = 'string-label';

    if (isChordBuildMode()) {
      const muteButton = document.createElement('button');
      const shapeMuted =
        state.chords.generatedVoicing?.[stringIndex] === null;

      const userMuted =
        state.chords.mutedStrings[stringIndex];

      const isMuted = shapeMuted || userMuted;

      muteButton.type = 'button';
      muteButton.className = 'mute-toggle';
      muteButton.setAttribute('aria-pressed', String(isMuted));
      muteButton.title = isMuted ? 'Unmute string' : 'Mute string';
      muteButton.textContent = isMuted ? '×' : '•';

      muteButton.addEventListener('click', (event) => {
        event.stopPropagation();
        toggleStringMute(stringIndex);
      });

      label.appendChild(muteButton);
    }

    const labelText = document.createElement('span');
    labelText.className = 'string-label-text';
    labelText.textContent = string.name;
    label.appendChild(labelText);
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

      if (
        state.module === 'Chords' &&
        state.mode === 'explore' &&
        state.chords.exploreMode === 'build'
      ) {
        const voicingFret = state.chords.generatedVoicing?.[stringIndex];
        const rootLocation = getChordBuildRootLocation();

        if (
          fret === voicingFret &&
          voicingFret !== null &&
          voicingFret !== undefined
        ) {
          const noteMidi = string.midi + voicingFret;
          const pitchClass = Theory.pitchClass(noteMidi);
          const rootPitchClass = Theory.pitchClass(state.chords.rootMidi);

          const isDesignatedRoot =
            rootLocation &&
            stringIndex === rootLocation.stringIndex &&
            fret === rootLocation.fret;

          dot.classList.add(isDesignatedRoot ? 'root' : 'target');

          if (state.showNotes || state.showIntervals) {
            const interval = (pitchClass - rootPitchClass + 12) % 12;

            createNoteLabel(
              dot,
              state.showNotes ? Theory.noteName(noteMidi) : '',
              state.showIntervals
                ? Theory.intervalShort(interval)
                : ''
            );
          }
        }
      }

      if (
        state.module === 'Chords' &&
        state.mode === 'explore' &&
        state.chords.exploreMode === 'identify'
      ) {
        const selectedIndex = state.chords.selected.findIndex(
          (note) => note.stringIndex === stringIndex && note.fret === fret
        );

        if (selectedIndex >= 0) {
          dot.classList.add(selectedIndex === 0 ? 'root' : 'target');

          if (state.showNotes || state.showIntervals) {
            const rootMidi = state.chords.selected[0]?.midi;
            const semitones = rootMidi === undefined ? 0 : midi - rootMidi;

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

      if (state.module === 'Chords' && state.mode === 'explore') {
        cell.addEventListener('click', () => {
          if (state.chords.exploreMode !== 'identify') {
            playMidi(midi);
            return;
          }

          const selectedIndex = state.chords.selected.findIndex(
            (note) =>
              note.stringIndex === stringIndex &&
              note.fret === fret
          );

          if (selectedIndex >= 0) {
            state.chords.selected.splice(selectedIndex, 1);
          } else {
            const existingStringIndex = state.chords.selected.findIndex(
              (note) => note.stringIndex === stringIndex
            );

            const newNote = { stringIndex, fret, midi };

            if (existingStringIndex >= 0) {
              const replacingRoot = existingStringIndex === 0;

              state.chords.selected.splice(existingStringIndex, 1);

              if (replacingRoot) {
                state.chords.selected.unshift(newNote);
              } else {
                state.chords.selected.push(newNote);
              }
            } else {
              state.chords.selected.push(newNote);
            }
          }

          safeUpdateResults();
          renderFretboard();
          playMidi(midi);
        });

        cell.addEventListener('contextmenu', (event) => {
          if (state.chords.exploreMode !== 'identify') return;

          const selectedIndex = state.chords.selected.findIndex(
            (note) => note.stringIndex === stringIndex && note.fret === fret
          );

          if (selectedIndex < 0) return;

          event.preventDefault();
          promoteChordIdentifyRoot(stringIndex, fret);
        });

        board.appendChild(cell);
        continue;
      }

      cell.addEventListener('click', () => {
        if (state.module === 'Chords' && state.mode === 'quiz') {
          handleQuizAnswer(stringIndex, fret, midi);
          return;
        }

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

function clearModuleInteractionState() {
  state.selected = [];
  state.chords.selected = [];
  state.chords.generatedVoicing = [null, null, null, null, null, null];
  state.chords.mutedStrings = [false, false, false, false, false, false];

  state.quiz.answerSelection = null;
  state.quiz.chordSelection = [];
  state.quiz.root = null;
  state.quiz.target = null;
  state.quiz.targetMidi = null;
  state.quiz.interval = null;
  state.quiz.chordQuestion = null;
  state.quiz.options = [];

  resetQuiz();
}

function setModule(name) {
  clearModuleInteractionState();

  state.module = name;
  state.mode = 'explore';

  $('module-title').textContent = name;
  $('module-menu').hidden = true;
  $('module-picker-button').setAttribute('aria-expanded', 'false');

  document.querySelectorAll('.mode-button').forEach((button) => {
    button.classList.toggle(
      'active-mode',
      button.dataset.mode === 'explore'
    );
  });

  document.querySelector('.study-workspace')
    .classList.remove('quiz-mode');

  if (name === 'Chords') {
    state.chords.exploreMode = 'build';
    state.chords.rootMidi = 0;
    state.chords.type = 'major';
    state.chords.extension = 'none';
    state.chords.voicingFamily = 'CAGED';
    state.chords.cagedShape = 'C shape';
    state.chords.position = 'Open';
    state.chords.mutedStrings = [false, false, false, false, false, false];

    populateChordBuildControls();
    syncChordBuildVoicing();
  }

  syncModuleQuizControls();
  syncChordExploreControls();
  safeUpdateResults();
  renderFretboard();
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

  syncModuleQuizControls();
  syncChordExploreControls();

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

document.querySelectorAll('[data-quiz-answer-mode]').forEach((button) => {
  button.addEventListener('click', () => {
    setQuizAnswerMode(button.dataset.quizAnswerMode);
  });
});

document.querySelectorAll('.chord-quiz-type-button').forEach((button) => {
  button.addEventListener('click', () => {
    setChordQuizType(button.dataset.chordQuizType);
  });
});

document.querySelectorAll('[data-chord-explore-mode]').forEach((button) => {
  button.addEventListener('click', () => {
    state.chords.exploreMode = button.dataset.chordExploreMode;
    state.chords.selected = [];

    syncChordExploreControls();
    safeUpdateResults();
    renderFretboard();
  });
});

$('chord-identify-play-button').addEventListener('click', () => {
  if (
    state.module !== 'Chords' ||
    state.mode !== 'explore' ||
    state.chords.exploreMode !== 'identify'
  ) {
    return;
  }

  const notes = getChordIdentifyNotesInPitchOrder();

  notes.forEach((note, index) => {
    setTimeout(() => {
      playMidi(note.midi);
    }, index * 40);
  });
});

$('chord-identify-clear-button').addEventListener('click', () => {
  if (
    state.module !== 'Chords' ||
    state.mode !== 'explore' ||
    state.chords.exploreMode !== 'identify'
  ) {
    return;
  }

  state.chords.selected = [];
  safeUpdateResults();
  renderFretboard();
});

$('chord-root-select').addEventListener('change', (event) => {
  state.chords.rootMidi = Number(event.target.value);
  syncChordBuildVoicing();
  safeUpdateResults();
  renderFretboard();
});

$('chord-type-select').addEventListener('change', (event) => {
  state.chords.type = event.target.value;
  syncChordBuildVoicing();
  safeUpdateResults();
  renderFretboard();
});

$('chord-extension-select').addEventListener('change', (event) => {
  state.chords.extension = event.target.value;
  safeUpdateResults();
  renderFretboard();
});

$('chord-voicing-select').addEventListener('change', (event) => {
  state.chords.voicingFamily = event.target.value;
  syncChordBuildVoicing();
  safeUpdateResults();
  renderFretboard();
});

$('chord-shape-select').addEventListener('change', (event) => {
  state.chords.cagedShape = event.target.value;
  populateChordBuildControls();
  syncChordBuildVoicing();
  safeUpdateResults();
  renderFretboard();
});

$('chord-position-select').addEventListener('change', (event) => {
  state.chords.position = event.target.value;
  syncChordBuildVoicing();
  safeUpdateResults();
  renderFretboard();
});

$('quiz-choice-grid').addEventListener('click', (event) => {
  const button = event.target.closest('.quiz-choice-button');

  if (!button || !state.quiz.active || state.quiz.awaitingNextQuestion) {
    return;
  }

  if (state.module === 'Intervals') {
    if (state.quiz.answerMode !== 'multiple-choice') return;

    const selectedInterval = Number(button.dataset.interval);

    finishQuestion(
      selectedInterval === state.quiz.interval ? 'correct' : 'incorrect'
    );
    return;
  }

  if (state.module === 'Chords' && state.quiz.chordQuestionType === 'identify') {
    const selectedChord = button.dataset.chordAnswer;
    finishQuestion(
      selectedChord === state.quiz.chordQuestion.name ? 'correct' : 'incorrect'
    );
  }
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

$('quiz-analyze-button').addEventListener('click', () => {
  if (
    state.module === 'Chords' &&
    state.mode === 'explore' &&
    state.chords.exploreMode === 'identify'
  ) {
    const output = $('result-text');
    const selectedPitchClasses = [
      ...new Set(state.chords.selected.map((note) => Theory.pitchClass(note.midi)))
    ];

    if (selectedPitchClasses.length < 3) {
      output.innerHTML = `
        <span class="result-strong">
          Root: ${Theory.noteName(state.chords.selected[0]?.midi ?? 0)}
        </span>
        <span class="quiz-feedback">
          Add at least three unique pitch classes to identify a chord.
        </span>
      `;
      return;
    }

    const result = identifySelectedChord();

    if (!result) {
      output.innerHTML = `
        <span class="result-strong">
          No exact chord match
        </span>
        <span class="quiz-feedback">
          Selected root: ${Theory.noteName(state.chords.selected[0].midi)}
        </span>
      `;
      return;
    }

    const selectedNotes = getChordIdentifyNotesInPitchOrder()
      .map((note) => Theory.noteName(note.midi))
      .join(' · ');

    const selectedIntervals = getSelectedChordIntervalLabels(result);

    output.innerHTML = `
      <span class="identified-chord-name">${getChordIdentifyDisplayName(result)}</span>
      <span class="identified-chord-notes">${selectedNotes}</span>
      <span class="identified-chord-intervals">${selectedIntervals}</span>
    `;
  }

  if (
    !state.quiz.active ||
    state.quiz.awaitingNextQuestion ||
    state.module !== 'Chords' ||
    state.quiz.chordQuestionType !== 'build'
  ) {
    return;
  }

  const selectedPitchClasses = [
    ...new Set(state.quiz.chordSelection.map((note) => Theory.pitchClass(note.midi)))
  ].sort((a, b) => a - b);

  const expectedPitchClasses = [...state.quiz.chordQuestion.pitchClasses].sort(
    (a, b) => a - b
  );

  const correct =
    selectedPitchClasses.length === expectedPitchClasses.length &&
    selectedPitchClasses.every((value, index) => value === expectedPitchClasses[index]);

  finishQuestion(correct ? 'correct' : 'incorrect');
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