const STORAGE_KEY = "rummy-scorecard-current-game-v2";

const scoreTable = document.getElementById("scoreTable");
const tableScroller = document.getElementById("tableScroller");
const addPlayerButton = document.getElementById("addPlayerButton");
const addRoundButton = document.getElementById("addRoundButton");
const newGameButton = document.getElementById("newGameButton");

let game = loadGame();

function createId() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function createNewGame() {
  const players = [
    { id: createId(), name: "Player 1" },
    { id: createId(), name: "Player 2" }
  ];

  return {
    players,
    rounds: [createBlankRound(players)]
  };
}

function createBlankRound(players = game.players) {
  const scores = {};

  players.forEach((player) => {
    scores[player.id] = "";
  });

  return {
    id: createId(),
    scores
  };
}

function loadGame() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);

    if (!saved) {
      return createNewGame();
    }

    const parsed = JSON.parse(saved);

    if (
      !parsed ||
      !Array.isArray(parsed.players) ||
      parsed.players.length < 1 ||
      !Array.isArray(parsed.rounds)
    ) {
      return createNewGame();
    }

    if (parsed.rounds.length === 0) {
      parsed.rounds = [createBlankRound(parsed.players)];
    }

    return parsed;
  } catch {
    return createNewGame();
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
    const cleanedName = String(player.name || "").trim();
    player.name = cleanedName || `Player ${index + 1}`;
  });
}

function getPlayerTotal(playerId) {
  return game.rounds.reduce((sum, round) => {
    const raw = String(round.scores[playerId] ?? "").trim();

    if (raw === "") {
      return sum;
    }

    const value = Number(raw);
    return Number.isFinite(value) ? sum + value : sum;
  }, 0);
}

function formatTotal(total) {
  return Number.isInteger(total) ? String(total) : total.toFixed(1);
}

function updateTotalCells() {
  game.players.forEach((player) => {
    const totalCell = document.querySelector(
      `[data-total-for="${player.id}"]`
    );

    if (totalCell) {
      totalCell.textContent = formatTotal(getPlayerTotal(player.id));
    }
  });
}

function render() {
  normalizePlayerNames();
  saveGame();

  scoreTable.innerHTML = "";

  const playerCount = game.players.length;
  const tableViewportWidth = tableScroller.clientWidth || window.innerWidth - 32;
  const roundColumnWidth = 58;

  let playerColumnWidth;

  if (playerCount <= 4) {
    playerColumnWidth = Math.max(
      72,
      Math.floor((tableViewportWidth - roundColumnWidth) / playerCount)
    );
  } else {
    playerColumnWidth = Math.max(
      76,
      Math.floor((tableViewportWidth - roundColumnWidth) / 4.22)
    );
  }

  const tableWidth =
    playerCount <= 4
      ? tableViewportWidth
      : roundColumnWidth + playerColumnWidth * playerCount;

  scoreTable.style.width = `${tableWidth}px`;

  const colgroup = document.createElement("colgroup");

  const roundCol = document.createElement("col");
  roundCol.style.width = `${roundColumnWidth}px`;
  colgroup.append(roundCol);

  game.players.forEach(() => {
    const playerCol = document.createElement("col");
    playerCol.style.width = `${playerColumnWidth}px`;
    colgroup.append(playerCol);
  });

  scoreTable.append(colgroup);

  const thead = document.createElement("thead");
  const headerRow = document.createElement("tr");

  const roundHeading = document.createElement("th");
  roundHeading.className = "round-heading";
  roundHeading.textContent = "Round";
  headerRow.append(roundHeading);

  game.players.forEach((player, index) => {
    const playerHeader = document.createElement("th");
    playerHeader.className = "player-header";

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
      saveGame();
    });

    headerWrap.append(playerNameInput);

    if (game.players.length > 1) {
      const removePlayerButton = document.createElement("button");
      removePlayerButton.className = "remove-button";
      removePlayerButton.type = "button";
      removePlayerButton.innerHTML = "&times;";
      removePlayerButton.setAttribute("aria-label", `Remove ${player.name}`);

      removePlayerButton.addEventListener("click", () => {
        removePlayer(player.id);
      });

      headerWrap.append(removePlayerButton);
    }

    playerHeader.append(headerWrap);
    headerRow.append(playerHeader);
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

    const roundNumber = document.createElement("span");
    roundNumber.textContent = roundIndex + 1;

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

    roundNumberWrap.append(roundNumber);
    roundNumberWrap.append(deleteRoundButton);
    roundCell.append(roundNumberWrap);
    row.append(roundCell);

    game.players.forEach((player) => {
      const scoreCell = document.createElement("td");
      scoreCell.className = "score-cell";

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

      scoreCell.append(scoreInput);
      row.append(scoreCell);
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

function addPlayer() {
  const newPlayer = {
    id: createId(),
    name: getNextPlayerName()
  };

  game.players.push(newPlayer);

  game.rounds.forEach((round) => {
    round.scores[newPlayer.id] = "";
  });

  render();

  requestAnimationFrame(() => {
    const nameInputs = document.querySelectorAll(".header-name-input");
    const newestNameInput = nameInputs[nameInputs.length - 1];

    if (newestNameInput) {
      newestNameInput.focus();
      newestNameInput.select();
    }

    tableScroller.scrollLeft = tableScroller.scrollWidth;
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

function addRound() {
  game.rounds.push(createBlankRound());
  render();

  requestAnimationFrame(() => {
    const scoreInputs = document.querySelectorAll(".score-input");
    const firstNewScoreInput =
      scoreInputs[scoreInputs.length - game.players.length];

    if (firstNewScoreInput) {
      firstNewScoreInput.focus();
    }
  });
}

addPlayerButton.addEventListener("click", addPlayer);

addRoundButton.addEventListener("click", addRound);

newGameButton.addEventListener("click", () => {
  const confirmed = window.confirm(
    "Start a new game? This will erase the current scorecard."
  );

  if (!confirmed) {
    return;
  }

  game = createNewGame();
  render();
});

window.addEventListener("resize", render);

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./service-worker.js");
  });
}

render();