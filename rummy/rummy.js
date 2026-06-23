const STORAGE_KEY = "rummy-scorecard-current-game";

const scoreWorkspace = document.getElementById("scoreWorkspace");
const scoreTable = document.getElementById("scoreTable");
const tableScroller = document.getElementById("tableScroller");

const addPlayerButton = document.getElementById("addPlayerButton");
const addRoundButton = document.getElementById("addRoundButton");
const newGameButton = document.getElementById("newGameButton");

let game = loadGame();

function createId() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function createInitialGame() {
  return {
    players: [
      { id: createId(), name: "Player 1" },
      { id: createId(), name: "Player 2" }
    ],
    rounds: [
      {
        id: createId(),
        scores: {}
      }
    ]
  };
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

function loadGame() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);

    if (!saved) {
      const freshGame = createInitialGame();
      freshGame.rounds[0] = createBlankRound();
      return freshGame;
    }

    const parsed = JSON.parse(saved);

    if (
      !parsed ||
      !Array.isArray(parsed.players) ||
      !Array.isArray(parsed.rounds) ||
      parsed.players.length === 0
    ) {
      const freshGame = createInitialGame();
      freshGame.rounds[0] = createBlankRound();
      return freshGame;
    }

    parsed.players.forEach((player, index) => {
      if (!player.id) {
        player.id = createId();
      }

      if (!player.name) {
        player.name = `Player ${index + 1}`;
      }
    });

    parsed.rounds.forEach((round) => {
      if (!round.id) {
        round.id = createId();
      }

      if (!round.scores) {
        round.scores = {};
      }

      parsed.players.forEach((player) => {
        if (!(player.id in round.scores)) {
          round.scores[player.id] = "";
        }
      });
    });

    return parsed;
  } catch {
    const freshGame = createInitialGame();
    freshGame.rounds[0] = createBlankRound();
    return freshGame;
  }
}

function saveGame() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(game));
}

function normalizePlayerNames() {
  game.players.forEach((player, index) => {
    const name = player.name.trim();
    player.name = name || `Player ${index + 1}`;
  });
}

function getNextPlayerName() {
  return `Player ${game.players.length + 1}`;
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

function render() {
  normalizePlayerNames();
  saveGame();
  renderScoreTable();

  requestAnimationFrame(positionAddRoundButton);
}

function renderScoreTable() {
  scoreTable.innerHTML = "";

  const playerCount = game.players.length;
  const scrollerWidth = tableScroller.clientWidth || window.innerWidth - 110;
  const roundColumnWidth = 62;

  let playerColumnWidth;

  if (playerCount <= 4) {
    playerColumnWidth = Math.max(
      74,
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

    header.append(headerWrap);
    headerRow.append(header);
  });

  thead.append(headerRow);
  scoreTable.append(thead);

  const tbody = document.createElement("tbody");

  game.rounds.forEach((round, roundIndex) => {
    const row = document.createElement("tr");
    row.dataset.roundId = round.id;

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

function positionAddRoundButton() {
  const workspaceRect = scoreWorkspace.getBoundingClientRect();
  const latestRoundRow = scoreTable.querySelector("tbody tr:last-child");

  if (!latestRoundRow) {
    const header = scoreTable.querySelector("thead");
    const headerRect = header.getBoundingClientRect();

    addRoundButton.style.top = `${
      headerRect.bottom - workspaceRect.top + 10
    }px`;

    return;
  }

  const latestRoundRect = latestRoundRow.getBoundingClientRect();

  addRoundButton.style.top = `${
    latestRoundRect.top -
    workspaceRect.top +
    latestRoundRect.height / 2 -
    addRoundButton.offsetHeight / 2
  }px`;
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

addPlayerButton.addEventListener("click", () => {
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
    const playerInputs = document.querySelectorAll(".header-name-input");
    const newestInput = playerInputs[playerInputs.length - 1];

    if (newestInput) {
      newestInput.focus();
      newestInput.select();
    }
  });
});

addRoundButton.addEventListener("click", () => {
  game.rounds.push(createBlankRound());
  render();

  requestAnimationFrame(() => {
    const scoreInputs = document.querySelectorAll(".score-input");

    const firstInputInNewestRound =
      scoreInputs[scoreInputs.length - game.players.length];

    if (firstInputInNewestRound) {
      firstInputInNewestRound.focus();
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
  game.rounds[0] = createBlankRound();
  render();
});

tableScroller.addEventListener("scroll", positionAddRoundButton);

window.addEventListener("resize", () => {
  renderScoreTable();

  requestAnimationFrame(positionAddRoundButton);
});

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./service-worker.js");
  });
}

render();