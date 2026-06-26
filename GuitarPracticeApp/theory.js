window.Theory = (() => {
  const NOTE_NAMES = [
    'C', 'C♯', 'D', 'D♯', 'E', 'F',
    'F♯', 'G', 'G♯', 'A', 'A♯', 'B'
  ];

  const INTERVALS = {
    0:  { short: 'I',   long: 'Unison' },
    1:  { short: 'm2',  long: 'Minor 2nd' },
    2:  { short: 'M2',  long: 'Major 2nd' },
    3:  { short: 'm3',  long: 'Minor 3rd' },
    4:  { short: 'M3',  long: 'Major 3rd' },
    5:  { short: 'P4',  long: 'Perfect 4th' },
    6:  { short: 'TT',  long: 'Tritone' },
    7:  { short: 'P5',  long: 'Perfect 5th' },
    8:  { short: 'm6',  long: 'Minor 6th' },
    9:  { short: 'M6',  long: 'Major 6th' },
    10: { short: 'm7',  long: 'Minor 7th' },
    11: { short: 'M7',  long: 'Major 7th' },
    12: { short: 'O',   long: 'Octave' },

    13: { short: 'm9',  long: 'Minor 9th' },
    14: { short: 'M9',  long: 'Major 9th' },
    15: { short: 'm10', long: 'Minor 10th' },
    16: { short: 'M10', long: 'Major 10th' },
    17: { short: 'P11', long: 'Perfect 11th' },
    18: { short: 'TT',  long: 'Tritone' },
    19: { short: 'P12', long: 'Perfect 12th' },
    20: { short: 'm13', long: 'Minor 13th' },
    21: { short: 'M13', long: 'Major 13th' },
    22: { short: 'm14', long: 'Minor 14th' },
    23: { short: 'M14', long: 'Major 14th' },
    24: { short: 'O2',  long: 'Double Octave' }
  };

  function noteName(midi) {
    return NOTE_NAMES[((midi % 12) + 12) % 12];
  }

  function intervalInfo(semitones) {
    const distance = Math.abs(semitones);

    return INTERVALS[distance] || {
      short: `${distance}`,
      long: `${distance} semitones`
    };
  }

  function intervalShort(semitones) {
    const info = intervalInfo(semitones);

    if (semitones < 0) {
      return `-${info.short}`;
    }

    return info.short;
  }

  function intervalLong(semitones) {
    const info = intervalInfo(semitones);

    if (semitones < 0) {
      return `${info.long} (descending)`;
    }

    return `${info.long} (ascending)`;
  }

  const CHORD_TYPES = {
    major: { label: 'Major', symbol: '', intervals: [0, 4, 7] },
    minor: { label: 'Minor', symbol: 'm', intervals: [0, 3, 7] },
    diminished: { label: 'Diminished', symbol: 'dim', intervals: [0, 3, 6] },
    augmented: { label: 'Augmented', symbol: 'aug', intervals: [0, 4, 8] },
    sus2: { label: 'Sus2', symbol: 'sus2', intervals: [0, 2, 7] },
    sus4: { label: 'Sus4', symbol: 'sus4', intervals: [0, 5, 7] },

    sixth: { label: '6', symbol: '6', intervals: [0, 4, 7, 9] },
    minor6: { label: 'Minor 6', symbol: 'm6', intervals: [0, 3, 7, 9] },

    sixNine: { label: '6/9', symbol: '6/9', intervals: [0, 4, 7, 9, 14] },

    add9: { label: 'Add 9', symbol: 'add9', intervals: [0, 4, 7, 14] },

    dominant7: { label: 'Dominant 7', symbol: '7', intervals: [0, 4, 7, 10] },
    major7: { label: 'Major 7', symbol: 'maj7', intervals: [0, 4, 7, 11] },
    minor7: { label: 'Minor 7', symbol: 'm7', intervals: [0, 3, 7, 10] },

    major7Sharp11: {
      label: 'Major 7 ♯11',
      symbol: 'maj7♯11',
      intervals: [0, 4, 7, 11, 18]
    },

    dominant9: { label: 'Dominant 9', symbol: '9', intervals: [0, 4, 7, 10, 14] },
    major9: { label: 'Major 9', symbol: 'maj9', intervals: [0, 4, 7, 11, 14] },
    minor9: { label: 'Minor 9', symbol: 'm9', intervals: [0, 3, 7, 10, 14] },

    dominant11: { label: 'Dominant 11', symbol: '11', intervals: [0, 4, 7, 10, 14, 17] },
    dominant13: { label: 'Dominant 13', symbol: '13', intervals: [0, 4, 7, 10, 14, 17, 21] }
  };

  const CAGED_SHAPES = {
    'C shape': {
      major: {
        rootOpenPitchClass: 0,
        frets: [0, 1, 0, 2, 3, null]
      },
      minor: null,
      dominant7: {
        rootOpenPitchClass: 0,
        frets: [0, 1, 3, 2, 3, null]
      }
    },

    'A shape': {
      major: {
        rootOpenPitchClass: 9,
        frets: [0, 2, 2, 2, 0, null]
      },
      minor: {
        rootOpenPitchClass: 9,
        frets: [0, 1, 2, 2, 0, null]
      },
      dominant7: {
        rootOpenPitchClass: 9,
        frets: [0, 2, 0, 2, 0, null]
      }
    },

    'G shape': {
      major: {
        rootOpenPitchClass: 7,
        frets: [3, 0, 0, 0, 2, 3]
      },
      minor: null,
      dominant7: {
        rootOpenPitchClass: 7,
        frets: [1, 0, 0, 0, 2, 3]
      }
    },

    'E shape': {
      major: {
        rootOpenPitchClass: 4,
        frets: [0, 0, 1, 2, 2, 0]
      },
      minor: {
        rootOpenPitchClass: 4,
        frets: [0, 0, 0, 2, 2, 0]
      },
      dominant7: {
        rootOpenPitchClass: 4,
        frets: [0, 0, 1, 0, 2, 0]
      }
    },

    'D shape': {
      major: {
        rootOpenPitchClass: 2,
        frets: [2, 3, 2, 0, null, null]
      },
      minor: {
        rootOpenPitchClass: 2,
        frets: [1, 3, 2, 0, null, null]
      },
      dominant7: {
        rootOpenPitchClass: 2,
        frets: [2, 1, 2, 0, null, null]
      }
    }
  };

  const STRING_OPEN_PITCH_CLASSES = [4, 11, 7, 2, 9, 4];

  function pitchClass(midi) {
    return ((midi % 12) + 12) % 12;
  }

  function chordInfo(type) {
    return CHORD_TYPES[type] || null;
  }

  function chordPitchClasses(rootMidi, type) {
    const chord = chordInfo(type);

    if (!chord) return [];

    return chord.intervals.map((interval) => pitchClass(rootMidi + interval));
  }

  function chordName(rootMidi, type) {
    const chord = chordInfo(type);

    if (!chord) return '';

    return `${noteName(rootMidi)}${chord.symbol}`;
  }

  function chordFormula(type) {
    const chord = chordInfo(type);

    if (!chord) return '';

    const labels = {
      0: '1',
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
      23: '7',
      24: '15'
    };
  

    return chord.intervals.map((interval) => labels[interval] || `${interval}`).join(' · ');
  }

  function identifyChord(selectedMidis) {
    const pitchClasses = [...new Set(selectedMidis.map(pitchClass))];

    if (pitchClasses.length < 3) return null;

    for (let root = 0; root < 12; root += 1) {
      for (const [type, chord] of Object.entries(CHORD_TYPES)) {
        const expected = chord.intervals
          .map((interval) => pitchClass(root + interval))
          .sort((a, b) => a - b);

        const actual = [...pitchClasses].sort((a, b) => a - b);

        if (
          expected.length === actual.length &&
          expected.every((value, index) => value === actual[index])
        ) {
          return {
            rootMidi: root,
            type,
            name: chordName(root, type),
            notes: expected.map(noteName),
            formula: chordFormula(type)
          };
        }
      }
    }

    return null;
  }

  function cageShapeNames() {
    return Object.keys(CAGED_SHAPES);
  }

  function cagePositionsForShape(shapeName) {
    const shape = CAGED_SHAPES[shapeName];
    if (!shape) return [];
    return ['Open'];
  }

  function generateCagedVoicing(
    rootPosition,
    quality,
    shapeName,
    positionName,
    maxFret = 24
  ) {
    const shape = CAGED_SHAPES[shapeName];
    const template = shape && shape[quality];

    if (!template || positionName !== 'Open') {
      return null;
    }

    const shapeOffset =
      (12 - template.rootOpenPitchClass) % 12;

    const shift = rootPosition + shapeOffset;

    const frets = template.frets.map((fret) => {
      if (fret === null) {
        return null;
      }

      return fret + shift;
    });

    const exceedsFretboard = frets.some(
      (fret) => fret !== null && fret > maxFret
    );

    return exceedsFretboard ? null : frets;
  }

const FREE_BUILD_PRESETS = {
  major: [
    {
      id: 'open-c',
      label: 'Open C',
      rootOpenPitchClass: 0,
      frets: [0, 1, 0, 2, 3, null]
    },
    {
      id: 'a-shape-barre',
      label: 'A-shape barre',
      rootOpenPitchClass: 9,
      frets: [0, 2, 2, 2, 0, null]
    },
    {
      id: 'e-shape-barre',
      label: 'E-shape barre',
      rootOpenPitchClass: 4,
      frets: [0, 0, 1, 2, 2, 0]
    }
  ],

  minor: [
    {
      id: 'a-shape-minor-barre',
      label: 'A-shape minor barre',
      rootOpenPitchClass: 9,
      frets: [0, 1, 2, 2, 0, null]
    },
    {
      id: 'e-shape-minor-barre',
      label: 'E-shape minor barre',
      rootOpenPitchClass: 4,
      frets: [0, 0, 0, 2, 2, 0]
    }
  ],

  dominant7: [
    {
      id: 'a-shape-7',
      label: 'A-shape dominant 7',
      rootOpenPitchClass: 9,
      frets: [0, 2, 0, 2, 0, null]
    },
    {
      id: 'e-shape-7',
      label: 'E-shape dominant 7',
      rootOpenPitchClass: 4,
      frets: [0, 0, 1, 0, 2, 0]
    }
  ],

  major7: [
    {
      id: 'drop2-root-1-4',
      label: 'Drop 2 · Root position · Strings 1–4',
      family: 'drop2',
      inversion: 'root',
      stringSet: '1-4'
    },
    {
      id: 'drop2-first-1-4',
      label: 'Drop 2 · 1st inversion · Strings 1–4',
      family: 'drop2',
      inversion: 'first',
      stringSet: '1-4'
    },
    {
      id: 'drop2-second-2-5',
      label: 'Drop 2 · 2nd inversion · Strings 2–5',
      family: 'drop2',
      inversion: 'second',
      stringSet: '2-5'
    },
    {
      id: 'drop2-third-3-6',
      label: 'Drop 2 · 3rd inversion · Strings 3–6',
      family: 'drop2',
      inversion: 'third',
      stringSet: '3-6'
    }
  ]
};

function freeBuildPresets(type) {
  return FREE_BUILD_PRESETS[type] || [];
}

function generateFreeBuildPreset(rootMidi, type, presetId, maxFret = 24) {
  const preset = freeBuildPresets(type).find(
    (item) => item.id === presetId
  );

  if (!preset) {
    return null;
  }

  if (preset.family === 'drop2') {
    return generateDrop2Voicing(
      rootMidi,
      type,
      preset.inversion,
      preset.stringSet,
      maxFret
    );
  }

  const rootPitchClass = pitchClass(rootMidi);

  const shift =
    (rootPitchClass - preset.rootOpenPitchClass + 12) % 12;

  const frets = preset.frets.map((fret) => {
    if (fret === null) {
      return null;
    }

    return fret + shift;
  });

  const exceedsFretboard = frets.some(
    (fret) => fret !== null && fret > maxFret
  );

  return exceedsFretboard ? null : frets;
}

  const TRIAD_STRING_SETS = {
  '1-3': {
    label: 'Strings 1–3',
    stringIndexes: [0, 1, 2]
  },
  '2-4': {
    label: 'Strings 2–4',
    stringIndexes: [1, 2, 3]
  },
  '3-5': {
    label: 'Strings 3–5',
    stringIndexes: [2, 3, 4]
  },
  '4-6': {
    label: 'Strings 4–6',
    stringIndexes: [3, 4, 5]
  }
};

function triadStringSets() {
  return Object.entries(TRIAD_STRING_SETS).map(([id, set]) => ({
    id,
    label: set.label
  }));
}

function generateTriadVoicing(
  rootMidi,
  type,
  inversion,
  stringSetId,
  maxFret = 24
) {
  const chord = chordInfo(type);

  if (!chord || chord.intervals.length !== 3) {
    return null;
  }

  const stringSet = TRIAD_STRING_SETS[stringSetId];

  if (!stringSet) {
    return null;
  }

  const triadIntervals = chord.intervals;

  const inversionOrders = {
    root: [
      triadIntervals[0],
      triadIntervals[1],
      triadIntervals[2]
    ],
    first: [
      triadIntervals[1],
      triadIntervals[2],
      triadIntervals[0]
    ],
    second: [
      triadIntervals[2],
      triadIntervals[0],
      triadIntervals[1]
    ]
  };

  const intervalOrder = inversionOrders[inversion];

  if (!intervalOrder) {
    return null;
  }

  const openStringMidis = [64, 59, 55, 50, 45, 40];

  const lowToHighStringIndexes =
    [...stringSet.stringIndexes].reverse();

  const candidatesByString = lowToHighStringIndexes.map(
    (stringIndex, noteIndex) => {
      const openMidi = openStringMidis[stringIndex];
      const targetPitchClass = pitchClass(
        rootMidi + intervalOrder[noteIndex]
      );

      const candidates = [];

      for (let fret = 0; fret <= maxFret; fret += 1) {
        const midi = openMidi + fret;

        if (pitchClass(midi) === targetPitchClass) {
          candidates.push({ fret, midi });
        }
      }

      return candidates;
    }
  );

  let bestVoicing = null;

  function search(stringPosition, chosenNotes) {
    if (stringPosition === candidatesByString.length) {
      const frets = [null, null, null, null, null, null];

      chosenNotes.forEach((note, noteIndex) => {
        frets[lowToHighStringIndexes[noteIndex]] = note.fret;
      });

      const frettedNotes = chosenNotes.filter(
        (note) => note.fret > 0
      );

      const lowestFret = Math.min(
        ...frettedNotes.map((note) => note.fret)
      );

      const highestFret = Math.max(
        ...frettedNotes.map((note) => note.fret)
      );

      if (highestFret - lowestFret > 5) {
        return;
      }

      const candidate = {
        frets,
        highestFret,
        lowestFret
      };

      if (
        !bestVoicing ||
        candidate.highestFret < bestVoicing.highestFret ||
        (
          candidate.highestFret === bestVoicing.highestFret &&
          candidate.lowestFret < bestVoicing.lowestFret
        )
      ) {
        bestVoicing = candidate;
      }

      return;
    }

    const previousMidi = chosenNotes.length
      ? chosenNotes[chosenNotes.length - 1].midi
      : -Infinity;

    candidatesByString[stringPosition].forEach((candidate) => {
      if (candidate.midi > previousMidi) {
        search(stringPosition + 1, [...chosenNotes, candidate]);
      }
    });
  }

  search(0, []);

  return bestVoicing ? bestVoicing.frets : null;
}

  const DROP2_STRING_SETS = {
  '1-4': {
    label: 'Strings 1–4',
    stringIndexes: [0, 1, 2, 3]
  },
  '2-5': {
    label: 'Strings 2–5',
    stringIndexes: [1, 2, 3, 4]
  },
  '3-6': {
    label: 'Strings 3–6',
    stringIndexes: [2, 3, 4, 5]
  }
};

const DROP2_INTERVAL_ORDERS = {
  root: [0, 7, 11, 4],
  first: [4, 11, 0, 7],
  second: [7, 0, 4, 11],
  third: [11, 4, 7, 0]
};

function drop2StringSets() {
  return Object.entries(DROP2_STRING_SETS).map(([id, set]) => ({
    id,
    label: set.label
  }));
}

function generateDrop2Voicing(
  rootMidi,
  type,
  inversion,
  stringSetId,
  maxFret = 24
) {
  if (type !== 'major7') {
    return null;
  }

  const stringSet = DROP2_STRING_SETS[stringSetId];
  const intervalOrder = DROP2_INTERVAL_ORDERS[inversion];

  if (!stringSet || !intervalOrder) {
    return null;
  }

  const openStringMidis = [64, 59, 55, 50, 45, 40];

  // The visual string indexes are high-to-low.
  // Reverse them so the voicing is calculated bass-to-top-note.
  const lowToHighStringIndexes = [...stringSet.stringIndexes].reverse();

  const candidateNotesByString = lowToHighStringIndexes.map(
    (stringIndex, noteIndex) => {
      const openMidi = openStringMidis[stringIndex];
      const targetPitchClass = pitchClass(
        rootMidi + intervalOrder[noteIndex]
      );

      const candidates = [];

      for (let fret = 0; fret <= maxFret; fret += 1) {
        const midi = openMidi + fret;

        if (pitchClass(midi) === targetPitchClass) {
          candidates.push({ fret, midi });
        }
      }

      return candidates;
    }
  );

  let bestVoicing = null;

  function search(stringPosition, chosenNotes) {
    if (stringPosition === candidateNotesByString.length) {
      const frets = [null, null, null, null, null, null];

      chosenNotes.forEach((note, noteIndex) => {
        frets[lowToHighStringIndexes[noteIndex]] = note.fret;
      });

      const frettedNotes = chosenNotes.filter((note) => note.fret > 0);
      const lowestFret = Math.min(...frettedNotes.map((note) => note.fret));
      const highestFret = Math.max(...frettedNotes.map((note) => note.fret));
      const fretSpan = highestFret - lowestFret;

      // Keep the generated voicing compact and guitar-playable.
      if (fretSpan > 5) {
        return;
      }

      const candidate = {
        frets,
        highestFret,
        lowestFret,
        fretSpan
      };

      if (
        !bestVoicing ||
        candidate.highestFret < bestVoicing.highestFret ||
        (
          candidate.highestFret === bestVoicing.highestFret &&
          candidate.lowestFret < bestVoicing.lowestFret
        )
      ) {
        bestVoicing = candidate;
      }

      return;
    }

    const previousMidi = chosenNotes.length
      ? chosenNotes[chosenNotes.length - 1].midi
      : -Infinity;

    candidateNotesByString[stringPosition].forEach((candidate) => {
      if (candidate.midi > previousMidi) {
        search(stringPosition + 1, [...chosenNotes, candidate]);
      }
    });
  }

  search(0, []);

  return bestVoicing ? bestVoicing.frets : null;
}

  return {
    noteName,
    intervalInfo,
    intervalShort,
    intervalLong,
    pitchClass,
    chordInfo,
    chordPitchClasses,
    chordName,
    chordFormula,
    identifyChord,
    cageShapeNames,
    cagePositionsForShape,
    generateCagedVoicing,
    generateDrop2Voicing,
    drop2StringSets,
    generateTriadVoicing,
    triadStringSets,
    freeBuildPresets,
    generateFreeBuildPreset,
    chordTypes: CHORD_TYPES
  };
})();