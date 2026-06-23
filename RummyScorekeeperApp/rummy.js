const STORAGE_KEY = "rummy-scorecard-current-game";

const setupScreen = document.getElementById("setupScreen");
const scoreScreen = document.getElementById("scoreScreen");

const setupPlayersGrid = document.getElementById("setupPlayersGrid");
const addPlayerSetupButton = document.getElementById("addPlayerSetupButton");
const applyPlayersButton = document.getElementById("applyPlayersButton");

const scoreTable = document.getElementById("scoreTable");
const tableScroller = document.getElementById("tableScroller");
const addRoundButton = document.getElementById("addRoundButton");
const newGameButton = document.getElementById("newGameButton");

let game = loadGame();

function createId() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function createInitialGame() {
  return {
    phase: "setup",
    players: [
      { id: createId(), name: "Player 1" },
      { id: createId(), name: "Player 2" }
    ],
    rounds: []
  };
}

function loadGame() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);

    if (!saved) {
      return createInitialGame();
    }

    const parsed = JSON.parse(saved);

    if (
      !parsed ||
      !Array.isArray(parsed.players) ||
      !Array.isArray(parsed.rounds)
    ) {
      return createInitialGame();
    }

    return parsed;
  } catch {
    return createInitialGame();
  }
}

function saveGame() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(game));
}

function getNextPlayerName() {
  return `Player ${game.players.length + 1}`;
}

function normalizePlayerNames() {
  game.players.forEach((player, index) => {
    const cleanName = player.name.trim();

    player.name = cleanName || `Player ${index + 1}`;
  });
}

function createBlankRound() {
  const scores = {};

  game.players.forEach((player) => {
    scores[player.id] = "";
  });

  return {
    id: createId(),
    scores
  };
}

function render() {
  normalizePlayerNames();
  saveGame();

  const isSetup = game.phase === "setup";

  setupScreen.classList.toggle("hidden", !isSetup);
  scoreScreen.classList.toggle("hidden", isSetup);

  if (isSetup) {
    renderSetup();
  } else {
    renderScoreTable();
  }
}

function renderSetup() {
  setupPlayersGrid.innerHTML = "";

  game.players.forEach((player, index) => {
    const card = document.createElement("div");
    card.className = "setup-player-card";

    const input = document.createElement("input");
    input.className = "player-name-input";
    input.type = "text";
    input.value = player.name;
    input.autocomplete = "off";
    input.spellcheck = false;
    input.setAttribute("aria-label", `Player ${index + 1} name`);

    input.addEventListener("input", (event) => {
      player.name = event.target.value;
      saveGame();
    });

    const removeButton = document.createElement("button");
    removeButton.className = "remove-player-setup";
    removeButton.type = "button";
    removeButton.innerHTML = "&times;";
    removeButton.setAttribute("aria-label", `Remove ${player.name}`);

    removeButton.addEventListener("click", () => {
      removePlayer(player.id);
    });

    card.append(input);

    if (game.players.length > 1) {
      card.append(removeButton);
    }

    setupPlayersGrid.append(card);
  });
}

function renderScoreTable() {
  if (game.rounds.length === 0) {
    game.rounds.push(createBlankRound());
  }

  scoreTable.innerHTML = "";

  const playerCount = game.players.length;
  const scrollerWidth = tableScroller.clientWidth || window.innerWidth - 32;
  const roundColumnWidth = 58;

  let playerColumnWidth;

  if (playerCount <= 4) {
    playerColumnWidth = Math.max(
      72,
      Math.floor((scrollerWidth - roundColumnWidth) / playerCount)
    );
  } else {
    playerColumnWidth = Math.max(
      76,
      Math.floor((scrollerWidth - roundColumnWidth) / 4.22)
    );
  }

  const tableWidth =
    playerCount <= 4
      ? scrollerWidth
      : roundColumnWidth + playerColumnWidth * playerCount;

  scoreTable.style.width = `${tableWidth}px`;

  const colgroup = document.createElement("colgroup");

  const roundColumn = document.createElement("col");
  roundColumn.style.width = `${roundColumnWidth}px`;
  colgroup.append(roundColumn);

  game.players.forEach(() => {
    const playerColumn = document.createElement("col");
    playerColumn.style.width = `${playerColumnWidth}px`;
    colgroup.append(playerColumn);
  });

  scoreTable.append(colgroup);

  const thead = document.createElement("thead");
  const headerRow = document.createElement("tr");

  const roundHeading = document.createElement("th");
  roundHeading.className = "round-heading";
  roundHeading.textContent = "Round";
  headerRow.append(roundHeading);

  game.players.forEach((player, index) => {
    const header = document.createElement("th");
    header.className = "player-header";

    const headerWrap = document.createElement("div");
    headerWrap.className = "player-header-wrap";

    const playerNameInput = document.createElement("input");
    playerNameInput.className = "header-name-input";
    playerNameInput.type = "text";
    playerNameInput.value = player.name;
    playerNameInput.autocomplete = "off";
    playerNameInput.spellcheck = false;
    playerNameInput.setAttribute("aria-label", `Player ${index + 1} name`);

    playerNameInput.addEventListener("input", (event) => {
      player.name = event.target.value;
      saveGame();
    });

    playerNameInput.addEventListener("blur", () => {
      normalizePlayerNames();
      render();
    });

    const removePlayerButton = document.createElement("button");
    removePlayerButton.className = "remove-button";
    removePlayerButton.type = "button";
    removePlayerButton.innerHTML = "&times;";
    removePlayerButton.setAttribute("aria-label", `Remove ${player.name}`);

    removePlayerButton.addEventListener("click", () => {
      removePlayer(player.id);
    });

    headerWrap.append(playerNameInput);

    if (game.players.length > 1) {
      headerWrap.append(removePlayerButton);
    }

    header.append(headerWrap);
    headerRow.append(header);
  });

  thead.append(headerRow);
  scoreTable.append(thead);

  const tbody = document.createElement("tbody");

  game.rounds.forEach((round, roundIndex) => {
    const row = document.createElement("tr");

    const roundCell = document.createElement("td");
    roundCell.className = "round-cell";

    const roundNumberWrap = document.createElement("div");
    roundNumberWrap.className = "round-number-wrap";

    const roundLabel = document.createElement("span");
    roundLabel.textContent = roundIndex + 1;

    const deleteRoundButton = document.createElement("button");
    deleteRoundButton.className = "round-delete-button";
    deleteRoundButton.type = "button";
    deleteRoundButton.innerHTML = "&times;";
    deleteRoundButton.setAttribute(
      "aria-label",
      `Remove round ${roundIndex + 1}`
    );

    deleteRoundButton.addEventListener("click", () => {
      game.rounds.splice(roundIndex, 1);

      if (game.rounds.length === 0) {
        game.rounds.push(createBlankRound());
      }

      render();
    });

    roundNumberWrap.append(roundLabel);
    roundNumberWrap.append(deleteRoundButton);
    roundCell.append(roundNumberWrap);
    row.append(roundCell);

    game.players.forEach((player) => {
      const cell = document.createElement("td");
      cell.className = "score-cell";

      const scoreInput = document.createElement("input");
      scoreInput.className = "score-input";
      scoreInput.type = "text";
      scoreInput.inputMode = "decimal";
      scoreInput.autocomplete = "off";
      scoreInput.placeholder = "0";
      scoreInput.value = round.scores[player.id] ?? "";
      scoreInput.setAttribute(
        "aria-label",
        `${player.name} score for round ${roundIndex + 1}`
      );

      scoreInput.addEventListener("input", (event) => {
        round.scores[player.id] = event.target.value;
        saveGame();
        updateTotalCells();
      });

      cell.append(scoreInput);
      row.append(cell);
    });

    tbody.append(row);
  });

  scoreTable.append(tbody);

  const tfoot = document.createElement("tfoot");
  const totalRow = document.createElement("tr");

  const totalLabel = document.createElement("td");
  totalLabel.className = "total-label";
  totalLabel.textContent = "TOTAL";
  totalRow.append(totalLabel);

  game.players.forEach((player) => {
    const totalCell = document.createElement("td");
    totalCell.dataset.totalFor = player.id;
    totalCell.textContent = formatTotal(getPlayerTotal(player.id));
    totalRow.append(totalCell);
  });

  tfoot.append(totalRow);
  scoreTable.append(tfoot);
}

function getPlayerTotal(playerId) {
  return game.rounds.reduce((sum, round) => {
    const rawValue = String(round.scores[playerId] ?? "").trim();

    if (rawValue === "") {
      return sum;
    }

    const parsedValue = Number(rawValue);

    return Number.isFinite(parsedValue) ? sum + parsedValue : sum;
  }, 0);
}

function formatTotal(total) {
  return Number.isInteger(total) ? String(total) : total.toFixed(1);
}

function updateTotalCells() {
  game.players.forEach((player) => {
    const cell = document.querySelector(`[data-total-for="${player.id}"]`);

    if (cell) {
      cell.textContent = formatTotal(getPlayerTotal(player.id));
    }
  });
}

function removePlayer(playerId) {
  if (game.players.length <= 1) {
    return;
  }

  game.players = game.players.filter((player) => player.id !== playerId);

  game.rounds.forEach((round) => {
    delete round.scores[playerId];
  });

  render();
}

addPlayerSetupButton.addEventListener("click", () => {
  const player = {
    id: createId(),
    name: getNextPlayerName()
  };

  game.players.push(player);
  render();

  requestAnimationFrame(() => {
    const playerInputs = document.querySelectorAll(".player-name-input");
    const newestInput = playerInputs[playerInputs.length - 1];

    if (newestInput) {
      newestInput.focus();
      newestInput.select();
    }
  });
});

applyPlayersButton.addEventListener("click", () => {
  normalizePlayerNames();
  game.phase = "scoring";

  if (game.rounds.length === 0) {
    game.rounds.push(createBlankRound());
  }

  render();
});

addRoundButton.addEventListener("click", () => {
  game.rounds.push(createBlankRound());
  render();

  requestAnimationFrame(() => {
    const inputs = document.querySelectorAll(".score-input");
    const firstInputInNewRound =
      inputs[inputs.length - game.players.length];

    if (firstInputInNewRound) {
      firstInputInNewRound.focus();
    }
  });
});

newGameButton.addEventListener("click", () => {
  const confirmed = window.confirm(
    "Start a new game? This will erase the current scorecard."
  );

  if (!confirmed) {
    return;
  }

  game = createInitialGame();
  render();
});

window.addEventListener("resize", () => {
  if (game.phase === "scoring") {
    renderScoreTable();
  }
});

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("service-worker.js");
  });
}

render();