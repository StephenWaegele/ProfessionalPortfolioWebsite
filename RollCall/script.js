const categories = [
  "Green vegetables", "Muscle cars", "Animated movies", "Things in a backpack", "Animals with stripes",
  "Breakfast foods", "Countries in Europe", "Ocean animals", "Types of candy", "Board games",
  "Things at a playground", "Pizza toppings", "Sports with balls", "Things that are cold", "Farm animals",
  "Things at the beach", "Kitchen tools", "Kinds of flowers", "Famous superheroes", "School subjects",
  "Things in a garage", "Dog breeds", "Ice cream flavors", "Musical instruments", "Rainy day activities",
  "Things that fly", "Things with wheels", "Kinds of hats", "Disney characters", "Things in a lunchbox",
  "Fruits", "Things in a hospital", "Things at a zoo", "Things you wear", "Things that are round",
  "Insects", "Things in a bedroom", "Types of pasta", "Things in a toolbox", "Things at a carnival",
  "Things at a wedding", "Things on a map", "Things that glow", "Kinds of trees", "Things in a refrigerator",
  "Cartoon characters", "Things at a birthday party", "Colors", "Things in a bathroom", "Kinds of birds",
  "Things in outer space", "Fast food restaurants", "Things in a classroom", "Things you can recycle", "Things at a campsite",
  "Things that are loud", "Things that are soft", "Things on a desk", "Types of fish", "Things in a suitcase",
  "Things in a grocery store", "Weather words", "Things you can build", "Video game characters", "Things with buttons",
  "Things at a movie theater", "Things in a garden", "Things that smell good", "Things with keys", "Things in a park",
  "Things in a closet", "Things made of wood", "Things in a sandwich", "Things that are sticky", "Things at a restaurant",
  "Things in a library", "Things that are yellow", "Things you can climb", "Things that bounce", "Things in a car",
  "Things at an airport", "Things you can draw", "Things in a music band", "Things you can fold", "Things in a castle",
  "Things that are tiny", "Things that are huge", "Things in a bakery", "Things that are sweet", "Things at a pool",
  "Things in a forest", "Things that are shiny", "Things you can collect", "Things in a kitchen", "Things in a museum",
  "Things that can be opened", "Things that have tails", "Things in a pizza shop", "Things that are blue", "Things at a pet store"
];

const state = {
  players: [],
  usedCategoryIndexes: [],
  currentRound: null,
  timerSeconds: 60,
  timerId: null,
  phase: "setup"
};

const $ = (selector) => document.querySelector(selector);
const newGameScreen = $("#new-game-screen");
const gameScreen = $("#game-screen");
const winnerScreen = $("#winner-screen");
const newGamePlayerList = $("#new-game-player-list");
const settingsPlayerList = $("#settings-player-list");
const startGameButton = $("#start-game-button");
const addPlayerButton = $("#add-player-button");
const settingsAddPlayerButton = $("#settings-add-player-button");
const playersBar = $("#players-bar");
const rollingDice = $("#rolling-dice");
const bigDieOne = $("#big-die-one");
const bigDieTwo = $("#big-die-two");
const miniDieOne = $("#mini-die-one");
const miniDieTwo = $("#mini-die-two");
const diceSummary = $("#dice-summary");
const diceTotal = $("#dice-total");
const categoryDisplay = $("#category-display");
const roundStatus = $("#round-status");
const roundAction = $("#round-action");
const settingsDialog = $("#settings-dialog");
const settingsButton = $("#settings-button");
const timerDurationSelect = $("#timer-duration-select");
const winnerName = $("#winner-name");
const winnerScore = $("#winner-score");
const playAgainButton = $("#play-again-button");

function makePlayer(name = "") {
  return { id: crypto.randomUUID?.() || `${Date.now()}-${Math.random()}`, name, score: 0 };
}

function initials(name) {
  const compact = name.trim().replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
  return (compact.slice(0, 2) || "??");
}

function displayName(player, number) {
  return player.name.trim() || `Player ${number + 1}`;
}

function renderNameList(target, isSettings = false) {
  target.innerHTML = "";
  state.players.forEach((player, index) => {
    const row = document.createElement("div");
    row.className = "name-row";

    const input = document.createElement("input");
    input.type = "text";
    input.value = player.name;
    input.placeholder = `Player ${index + 1}`;
    input.maxLength = 24;
    input.setAttribute("aria-label", `Player ${index + 1} name`);
    input.addEventListener("input", (event) => {
      player.name = event.target.value;
      if (isSettings) renderPlayersBar();
    });

    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "remove-player-button";
    remove.textContent = "×";
    remove.title = "Remove player";
    remove.disabled = state.players.length === 1;
    remove.addEventListener("click", () => {
      if (state.players.length <= 1) return;
      state.players.splice(index, 1);
      renderAllPlayerLists();
      renderPlayersBar();
    });

    row.append(input, remove);
    target.append(row);
  });
}

function renderAllPlayerLists() {
  renderNameList(newGamePlayerList, false);
  renderNameList(settingsPlayerList, true);
}

function renderPlayersBar() {
  playersBar.innerHTML = "";
  state.players.forEach((player, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "player-button";
    button.dataset.playerId = player.id;
    button.disabled = state.phase !== "active" && state.phase !== "expired";
    button.setAttribute("aria-label", `${displayName(player, index)} has ${player.score} points. Award this round.`);

    const initialsEl = document.createElement("span");
    initialsEl.className = "player-initials";
    initialsEl.textContent = initials(player.name || `P${index + 1}`);

    const scoreEl = document.createElement("span");
    scoreEl.className = "player-score";
    scoreEl.textContent = `${player.score} pts`;

    button.append(initialsEl, scoreEl);
    button.addEventListener("click", () => awardRound(player.id));
    playersBar.append(button);
  });
}

function renderDie(element, value) {
  element.innerHTML = "";
  const maps = {
    1: ["pip-1"],
    2: ["pip-2", "pip-3"],
    3: ["pip-2", "pip-1", "pip-3"],
    4: ["pip-2", "pip-4", "pip-5", "pip-3"],
    5: ["pip-2", "pip-4", "pip-1", "pip-5", "pip-3"],
    6: ["pip-2", "pip-4", "pip-6", "pip-7", "pip-5", "pip-3"]
  };
  maps[value].forEach((className) => {
    const pip = document.createElement("span");
    pip.className = `pip ${className}`;
    element.append(pip);
  });
}

function randomDie() {
  return Math.floor(Math.random() * 6) + 1;
}

function nextCategory() {
  if (state.usedCategoryIndexes.length >= categories.length) state.usedCategoryIndexes = [];
  const eligible = categories.map((_, i) => i).filter((i) => !state.usedCategoryIndexes.includes(i));
  const selectedIndex = eligible[Math.floor(Math.random() * eligible.length)];
  state.usedCategoryIndexes.push(selectedIndex);
  return categories[selectedIndex];
}

function clearTimer() {
  window.clearInterval(state.timerId);
  state.timerId = null;
}

function setRoundAction(text, { disabled = false, rollReady = false } = {}) {
  roundAction.textContent = text;
  roundAction.disabled = disabled;
  roundAction.classList.toggle("roll-ready", rollReady);
}

function playRollSound() {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    const context = new AudioContext();
    const now = context.currentTime;
    [0, .16, .33, .5, .68].forEach((offset, index) => {
      const osc = context.createOscillator();
      const gain = context.createGain();
      osc.type = "square";
      osc.frequency.value = 170 + index * 22;
      gain.gain.setValueAtTime(.045, now + offset);
      gain.gain.exponentialRampToValueAtTime(.001, now + offset + .09);
      osc.connect(gain).connect(context.destination);
      osc.start(now + offset);
      osc.stop(now + offset + .1);
    });
    setTimeout(() => context.close(), 1100);
  } catch (_) {
    // Audio is optional; browsers may block it before a user gesture.
  }
}

function startRound() {
  clearTimer();
  state.phase = "rolling";
  state.currentRound = {
    dieOne: randomDie(),
    dieTwo: randomDie(),
    category: nextCategory(),
    winnerId: null
  };

  categoryDisplay.textContent = state.currentRound.category;
  categoryDisplay.classList.remove("revealed");
  diceSummary.classList.remove("visible");
  rollingDice.classList.remove("settled", "rolling");
  void rollingDice.offsetWidth;
  rollingDice.classList.add("rolling");
  roundStatus.textContent = "Rolling the dice...";
  setRoundAction("…", { disabled: true });
  renderPlayersBar();
  playRollSound();

  window.setTimeout(() => {
    const { dieOne, dieTwo } = state.currentRound;
    const total = dieOne + dieTwo;
    renderDie(bigDieOne, dieOne);
    renderDie(bigDieTwo, dieTwo);
    renderDie(miniDieOne, dieOne);
    renderDie(miniDieTwo, dieTwo);
    diceTotal.textContent = total;
    rollingDice.classList.add("settled");
    diceSummary.classList.add("visible");
    roundStatus.textContent = "Category";
    categoryDisplay.classList.add("revealed");
  }, 1900);

  window.setTimeout(() => {
    state.phase = "active";
    roundStatus.textContent = "Find a word with exactly this many letters";
    startTimer();
    renderPlayersBar();
  }, 3900);
}

function startTimer() {
  let remaining = state.timerSeconds;
  setRoundAction(String(remaining), { disabled: true });
  clearTimer();
  state.timerId = window.setInterval(() => {
    remaining -= 1;
    setRoundAction(String(Math.max(remaining, 0)), { disabled: true });
    if (remaining <= 0) {
      clearTimer();
      state.phase = "expired";
      roundStatus.textContent = "Time is up — select the round winner or roll again";
      setRoundAction("ROLL", { disabled: false, rollReady: true });
      renderPlayersBar();
    }
  }, 1000);
}

function awardRound(playerId) {
  if (!state.currentRound || !["active", "expired"].includes(state.phase)) return;
  const player = state.players.find((item) => item.id === playerId);
  if (!player) return;

  clearTimer();
  const points = state.currentRound.dieOne + state.currentRound.dieTwo;
  player.score += points;
  state.currentRound.winnerId = player.id;
  state.phase = "round-over";
  roundStatus.textContent = "Round complete";
  setRoundAction("ROLL", { disabled: false, rollReady: true });
  renderPlayersBar();

  const playerButton = playersBar.querySelector(`[data-player-id="${CSS.escape(player.id)}"]`);
  if (playerButton) {
    const pop = document.createElement("span");
    pop.className = "point-pop";
    pop.textContent = `+${points}`;
    playerButton.append(pop);
    window.setTimeout(() => pop.remove(), 2100);
  }

  if (player.score >= 100) {
    window.setTimeout(() => showWinner(player), 800);
  }
}

function showWinner(player) {
  clearTimer();
  winnerName.textContent = player.name.trim() || "Player";
  winnerScore.textContent = `${player.score} points`;
  gameScreen.classList.add("hidden");
  winnerScreen.classList.remove("hidden");
  state.phase = "winner";
}

function startGame() {
  const namedPlayers = state.players.filter((player) => player.name.trim());
  if (namedPlayers.length === 0) {
    const firstInput = newGamePlayerList.querySelector("input");
    firstInput?.focus();
    return;
  }
  state.players = namedPlayers;
  state.usedCategoryIndexes = [];
  state.players.forEach((player) => { player.score = 0; });
  newGameScreen.classList.add("hidden");
  winnerScreen.classList.add("hidden");
  gameScreen.classList.remove("hidden");
  renderAllPlayerLists();
  renderPlayersBar();
  startRound();
}

function openSettings() {
  timerDurationSelect.value = String(state.timerSeconds);
  renderNameList(settingsPlayerList, true);
  settingsDialog.showModal();
}

function saveSettings() {
  state.timerSeconds = Number(timerDurationSelect.value);
  renderAllPlayerLists();
  renderPlayersBar();
}

function resetToNewGame() {
  clearTimer();
  state.players.forEach((player) => { player.score = 0; });
  state.usedCategoryIndexes = [];
  state.currentRound = null;
  state.phase = "setup";
  categoryDisplay.classList.remove("revealed");
  diceSummary.classList.remove("visible");
  gameScreen.classList.add("hidden");
  winnerScreen.classList.add("hidden");
  newGameScreen.classList.remove("hidden");
  renderAllPlayerLists();
}

addPlayerButton.addEventListener("click", () => {
  state.players.push(makePlayer(""));
  renderAllPlayerLists();
  newGamePlayerList.querySelector(".name-row:last-child input")?.focus();
});

settingsAddPlayerButton.addEventListener("click", () => {
  state.players.push(makePlayer(""));
  renderAllPlayerLists();
  settingsPlayerList.querySelector(".name-row:last-child input")?.focus();
});

startGameButton.addEventListener("click", startGame);
roundAction.addEventListener("click", () => {
  if (!roundAction.disabled && state.phase !== "winner") startRound();
});
settingsButton.addEventListener("click", openSettings);
settingsDialog.addEventListener("close", saveSettings);
playAgainButton.addEventListener("click", resetToNewGame);

state.players = [makePlayer(""), makePlayer("")];
renderAllPlayerLists();
