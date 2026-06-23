const state = { screen: 'home', module: 'Intervals', mode: 'explore', maxFret: 12, showNotes: false, showIntervals: false, soundOn: true, selected: [] };
const strings = [
  { name: 'E', midi: 64 }, { name: 'B', midi: 59 }, { name: 'G', midi: 55 },
  { name: 'D', midi: 50 }, { name: 'A', midi: 45 }, { name: 'E', midi: 40 }
];
const noteNames = ['C','C♯','D','D♯','E','F','F♯','G','G♯','A','A♯','B'];
const intervalNames = ['Unison','Minor 2nd','Major 2nd','Minor 3rd','Major 3rd','Perfect 4th','Tritone','Perfect 5th','Minor 6th','Major 6th','Minor 7th','Major 7th','Octave','Minor 9th','Major 9th','Minor 10th','Major 10th','Perfect 11th','Tritone','Perfect 12th','Minor 13th','Major 13th','Minor 14th','Major 14th','Double Octave'];
const inlays = new Set([3,5,7,9,12,15,17,19,21,24]);
const $ = (id) => document.getElementById(id);

function switchScreen(name) {
  document.querySelectorAll('.screen').forEach(el => el.classList.remove('active-screen'));
  $(`${name}-screen`).classList.add('active-screen');
  state.screen = name;
}
function noteName(midi){ return noteNames[((midi % 12) + 12) % 12]; }
function intervalLabel(semitones){ return intervalNames[Math.min(Math.abs(semitones),24)] || `${Math.abs(semitones)} semitones`; }
function resetSelection(){ state.selected = []; updateResults(); renderFretboard(); }
function updateResults(){
  const output = $('result-text');
  if (state.module !== 'Intervals') { output.textContent = `${state.module} workspace is ready. Module-specific study tools will populate this same fretboard shell.`; return; }
  if (state.selected.length === 0) output.textContent = 'Tap notes on the fretboard to begin.';
  if (state.selected.length === 1) output.textContent = `Root: ${noteName(state.selected[0].midi)}`;
  if (state.selected.length === 2) {
    const [root,target] = state.selected; const diff = target.midi - root.midi; const direction = diff >= 0 ? 'ascending' : 'descending';
    output.innerHTML = `<span class="result-strong">Interval: ${intervalLabel(diff)} (${direction})</span>`;
  }
}
function safeUpdateResults(){
  const output = $('result-text');
  if (state.module !== 'Intervals') { output.textContent = `${state.module} workspace is ready. Module-specific study tools will populate this same fretboard shell.`; return; }
  if (!state.selected.length) { output.textContent = 'Tap notes on the fretboard to begin.'; return; }
  if (state.selected.length === 1) { output.textContent = `Root: ${noteName(state.selected[0].midi)}`; return; }
  const [root,target] = state.selected; const diff = target.midi-root.midi; const direction = diff >= 0 ? 'ascending' : 'descending';
  output.innerHTML = `<span class="result-strong">Interval: ${intervalLabel(diff)} (${direction})</span>`;
}
function playMidi(midi) {
  if (!state.soundOn) return;
  try { const Ctx = window.AudioContext || window.webkitAudioContext; const ctx = new Ctx(); const osc = ctx.createOscillator(); const gain = ctx.createGain(); osc.type = 'triangle'; osc.frequency.value = 440 * Math.pow(2,(midi-69)/12); gain.gain.setValueAtTime(.0001,ctx.currentTime); gain.gain.exponentialRampToValueAtTime(.12,ctx.currentTime+.015); gain.gain.exponentialRampToValueAtTime(.0001,ctx.currentTime+.8); osc.connect(gain).connect(ctx.destination); osc.start(); osc.stop(ctx.currentTime+.82); setTimeout(()=>ctx.close(),1000); } catch(e) {}
}
function renderFretboard(){
  const board = $('fretboard'); board.innerHTML = ''; board.style.setProperty('--fret-count', state.maxFret + 1);
  strings.forEach((string, stringIndex) => {
    const label = document.createElement('div'); label.className='string-label'; label.textContent=string.name; board.appendChild(label);
    for(let fret=0; fret<=state.maxFret; fret++){
      const midi=string.midi+fret; const cell=document.createElement('button'); cell.type='button'; cell.className='fret-cell'; cell.dataset.fret=fret; if(inlays.has(fret)) cell.classList.add('inlay');
      const dot=document.createElement('span'); dot.className='note-dot';
      const pos=state.selected.findIndex(n=>n.stringIndex===stringIndex && n.fret===fret);
      if(pos===0) dot.classList.add('root'); if(pos===1) dot.classList.add('target');
      if(pos>=0 && (state.showNotes || state.showIntervals)) { if(pos===0) dot.textContent = state.showIntervals ? 'I' : noteName(midi); else { const diff=midi-state.selected[0].midi; dot.textContent = state.showIntervals ? Math.abs(diff) : noteName(midi); } }
      cell.appendChild(dot);
      cell.addEventListener('click',()=>{
        if(state.module !== 'Intervals') { $('result-text').textContent = `${state.module}: selected ${noteName(midi)} at fret ${fret}.`; playMidi(midi); return; }
        if(state.selected.length===2) state.selected=[];
        state.selected.push({stringIndex,fret,midi}); safeUpdateResults(); renderFretboard(); playMidi(midi);
      });
      board.appendChild(cell);
    }
  });
}
function setModule(name){ state.module=name; $('module-title').textContent=name; $('module-menu').hidden=true; $('module-picker-button').setAttribute('aria-expanded','false'); resetSelection(); }
function setMode(mode){ state.mode=mode; document.querySelectorAll('.mode-button').forEach(btn=>btn.classList.toggle('active-mode',btn.dataset.mode===mode)); $('quiz-controls').hidden=mode!=='quiz'; if(mode==='quiz') $('result-text').textContent='Choose Quiz when you are ready, then press Begin.'; else safeUpdateResults(); }
function syncSound(on){ state.soundOn=on; $('sound-toggle').classList.toggle('active-toggle',on); $('sound-toggle').setAttribute('aria-pressed',String(on)); $('settings-sound-checkbox').checked=on; }

$('study-button').addEventListener('click',()=>{ switchScreen('study'); renderFretboard(); safeUpdateResults(); });
$('play-button').addEventListener('click',()=>switchScreen('play'));
$('back-home-button').addEventListener('click',()=>switchScreen('home'));
$('back-from-play-button').addEventListener('click',()=>switchScreen('home'));
$('module-picker-button').addEventListener('click',()=>{ const menu=$('module-menu'); menu.hidden=!menu.hidden; $('module-picker-button').setAttribute('aria-expanded',String(!menu.hidden)); });
document.querySelectorAll('#module-menu button').forEach(btn=>btn.addEventListener('click',()=>setModule(btn.dataset.module)));
document.querySelectorAll('.mode-button').forEach(btn=>btn.addEventListener('click',()=>setMode(btn.dataset.mode)));
$('decrease-frets').addEventListener('click',()=>{ state.maxFret=Math.max(12,state.maxFret-1); $('fret-label').textContent=`Frets: 0–${state.maxFret}`; renderFretboard(); });
$('increase-frets').addEventListener('click',()=>{ state.maxFret=Math.min(24,state.maxFret+1); $('fret-label').textContent=`Frets: 0–${state.maxFret}`; renderFretboard(); });
$('notes-toggle').addEventListener('click',()=>{ state.showNotes=!state.showNotes; $('notes-toggle').classList.toggle('active-toggle',state.showNotes); $('notes-toggle').setAttribute('aria-pressed',String(state.showNotes)); renderFretboard(); });
$('interval-toggle').addEventListener('click',()=>{ state.showIntervals=!state.showIntervals; $('interval-toggle').classList.toggle('active-toggle',state.showIntervals); $('interval-toggle').setAttribute('aria-pressed',String(state.showIntervals)); renderFretboard(); });
$('sound-toggle').addEventListener('click',()=>syncSound(!state.soundOn));
$('quiz-begin-button').addEventListener('click',()=>{ resetSelection(); $('result-text').textContent='Quiz shell enabled. Interval question generation is the next functional layer.'; });
function openSettings(){ $('settings-overlay').hidden=false; }
function closeSettings(){ $('settings-overlay').hidden=true; }
$('home-settings-button').addEventListener('click',openSettings); $('study-settings-button').addEventListener('click',openSettings); $('close-settings-button').addEventListener('click',closeSettings); $('close-settings-done').addEventListener('click',closeSettings);
$('settings-fret-select').addEventListener('change',(e)=>{ state.maxFret=Number(e.target.value); $('fret-label').textContent=`Frets: 0–${state.maxFret}`; renderFretboard(); });
$('settings-sound-checkbox').addEventListener('change',(e)=>syncSound(e.target.checked));
$('settings-overlay').addEventListener('click',(e)=>{ if(e.target===$('settings-overlay')) closeSettings(); });
renderFretboard(); safeUpdateResults();
