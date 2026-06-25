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

  return {
    noteName,
    intervalInfo,
    intervalShort,
    intervalLong
  };
})();