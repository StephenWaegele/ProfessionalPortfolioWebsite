const STORAGE_KEY = "rummy-scorecard-current-game";

const scoreWorkspace = document.getElementById("scoreWorkspace");
const scoreTable = document.getElementById("scoreTable");
const tableScroller = document.getElementById("tableScroller");

const addPlayerButton = document.getElementById("addPlayerButton");
const addRoundButton = document.getElementById("addRoundButton");
const newGameButton = document.getElementById("newGameButton");

const actionModal = document.getElementById("actionModal");
const actionModalType = document.getElementById("actionModalType");
const actionModalTitle = document.getElementById("actionModalTitle");
const renameActionButton = document.getElementById("renameActionButton");
const deleteActionButton = document.getElementById("deleteActionButton");
const cancelActionButton = document.getElementById("cancelActionButton");

let game = loadGame();
let actionTarget = null;

function createId() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function createInitialGame() {
  const players = [
    { id: createId(), name: "Player 1" },
    { id: createId(), name: "Player 2" }
  ];

  return {
    players,
    rounds: [
      {
        id: createId(),
        label: "1",
        scores: {
          [players[0].id]: "",
          [players[1].id]: ""
        }
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
    label: String(game.rounds.length + 1),
    scores
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
      !Array.isArray(parsed.rounds) ||
      parsed.players.length === 0
    ) {
      return createInitialGame();
    }

    parsed.players.forEach((player, index) => {
      if (!player.id) {
        player.id = createId();
      }

      if (!player.name) {
        player.name = `Player ${index + 1}`;
      }
    });

    if (parsed.rounds.length === 0) {
      parsed.rounds.push({
        id: createId(),
        label: "1",
        scores: {}
      });
    }

    parsed.rounds.forEach((round, index) => {
      if (!round.id) {
        round.id = createId();
      }

      if (!round.label) {
        round.label = String(index + 1);
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
    return createInitialGame();
  }
}

function saveGame() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(game));
}

function normalizePlayerNames() {
  game.players.forEach((player, index) => {
    const cleanName = String(player.name || "").trim();
    player.name = cleanName || `Player ${index + 1}`;
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

    const value = Number(rawValue);
    return Number.isFinite(value) ? sum + value : sum;
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
  const scrollerWidth = tableScroller.clientWidth || window.innerWidth - 80;
  const roundColumnWidth = 52;

  let playerColumnWidth;

  if (playerCount <= 4) {
    playerColumnWidth = Math.max(
      58,
      Math.floor((scrollerWidth - roundColumnWidth) / playerCount)
    );
  } else {
    playerColumnWidth = Math.max(
      62,
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

  game.players.forEach((player) => {
    const header = document.createElement("th");

    const playerButton = document.createElement("button");
    playerButton.className = "player-name-button";
    playerButton.type = "button";
    playerButton.textContent = player.name;
    playerButton.title = `Manage ${player.name}`;

    playerButton.addEventListener("click", () => {
      openActionModal({
        type: "player",
        id: player.id,
        title: player.name
      });
    });

    header.append(playerButton);
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

    const roundButton = document.createElement("button");
    roundButton.className = "round-name-button";
    roundButton.type = "button";
    roundButton.textContent = round.label;
    roundButton.title = `Manage round ${round.label}`;

    roundButton.addEventListener("click", () => {
      openActionModal({
        type: "round",
        id: round.id,
        title: `Round ${round.label}`,
        index: roundIndex
      });
    });

    roundCell.append(roundButton);
    row.append(roundCell);

    game.players.forEach((player) => {
      const cell = document.createElement("td");
      cell.className = "score-cell";

      const scoreInput = document.createElement("input");
      scoreInput.className = "score-input";
      scoreInput.type = "text";
      scoreInput.inputMode = "text";
      scoreInput.autocomplete = "off";
      scoreInput.placeholder = "0";
      scoreInput.value = round.scores[player.id] ?? "";
      scoreInput.setAttribute(
        "aria-label",
        `${player.name} score for round ${round.label}`
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
  totalLabel.textContent = "Total";
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
    addRoundButton.style.top = "100px";
    return;
  }

  const latestRoundRect = latestRoundRow.getBoundingClientRect();

  addRoundButton.style.top = `${
    latestRoundRect.top
    - workspaceRect.top
    + latestRoundRect.height / 2
    - addRoundButton.offsetHeight / 2
  }px`;
}

function openActionModal(target) {
  actionTarget = target;

  actionModalType.textContent = target.type === "player" ? "PLAYER" : "ROUND";
  actionModalTitle.textContent = target.title;

  actionModal.classList.remove("hidden");
}

function closeActionModal() {
  actionTarget = null;
  actionModal.classList.add("hidden");
}

function renameTarget() {
  if (!actionTarget) {
    return;
  }

  const isPlayer = actionTarget.type === "player";
  const currentItem = isPlayer
    ? game.players.find((player) => player.id === actionTarget.id)
    : game.rounds.find((round) => round.id === actionTarget.id);

  if (!currentItem) {
    closeActionModal();
    return;
  }

  const currentName = isPlayer ? currentItem.name : currentItem.label;

  const nextName = window.prompt(
    isPlayer ? "Enter player name:" : "Enter round name:",
    currentName
  );

  if (nextName === null) {
    return;
  }

  const cleanName = nextName.trim();

  if (cleanName === "") {
    return;
  }

  if (isPlayer) {
    currentItem.name = cleanName;
  } else {
    currentItem.label = cleanName;
  }

  closeActionModal();
  render();
}

function deleteTarget() {
  if (!actionTarget) {
    return;
  }

  const isPlayer = actionTarget.type === "player";

  const confirmed = window.confirm(
    isPlayer
      ? `Delete ${actionTarget.title}?`
      : `Delete ${actionTarget.title}?`
  );

  if (!confirmed) {
    return;
  }

  if (isPlayer) {
    if (game.players.length <= 1) {
      window.alert("At least one player must remain.");
      return;
    }

    game.players = game.players.filter(
      (player) => player.id !== actionTarget.id
    );

    game.rounds.forEach((round) => {
      delete round.scores[actionTarget.id];
    });
  } else {
    game.rounds = game.rounds.filter(
      (round) => round.id !== actionTarget.id
    );

    if (game.rounds.length === 0) {
      game.rounds.push(createBlankRound());
    }
  }

  closeActionModal();
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
    openActionModal({
      type: "player",
      id: newPlayer.id,
      title: newPlayer.name
    });
  });
});

addRoundButton.addEventListener("click", () => {
  game.rounds.push(createBlankRound());
  render();

  requestAnimationFrame(() => {
    const scoreInputs = document.querySelectorAll(".score-input");
    const firstNewestScoreInput =
      scoreInputs[scoreInputs.length - game.players.length];

    if (firstNewestScoreInput) {
      firstNewestScoreInput.focus();
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

renameActionButton.addEventListener("click", renameTarget);
deleteActionButton.addEventListener("click", deleteTarget);
cancelActionButton.addEventListener("click", closeActionModal);

actionModal.addEventListener("click", (event) => {
  if (event.target.matches("[data-close-modal]")) {
    closeActionModal();
  }
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