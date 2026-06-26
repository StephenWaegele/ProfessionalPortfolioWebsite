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
    dominant7: { label: 'Dominant 7', symbol: '7', intervals: [0, 4, 7, 10] },
    major7: { label: 'Major 7', symbol: 'maj7', intervals: [0, 4, 7, 11] },
    minor7: { label: 'Minor 7', symbol: 'm7', intervals: [0, 3, 7, 10] }
  };

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
      10: '♭7',
      11: '7'
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
    chordTypes: CHORD_TYPES
  };
})();