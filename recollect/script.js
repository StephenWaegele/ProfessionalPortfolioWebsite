(() => {
  'use strict';

  const STORAGE_KEY = 'recollect-v1-data';
  const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const uid = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  const clone = (value) => JSON.parse(JSON.stringify(value));

  const state = {
    data: { decks: [] },
    currentDeckId: null,
    editingDeckId: null,
    editingCardId: null,
    studyIndex: 0,
    studyDirection: 'front-back',
    matching: null,
    crop: null,
    confirmAction: null,
  };

  const els = {
    homeView: $('#home-view'), deckView: $('#deck-view'), studyView: $('#study-view'), matchingView: $('#matching-view'),
    deckList: $('#deck-list'), emptyLibrary: $('#empty-library'), deckTotal: $('#deck-total'), deckSearch: $('#deck-search'),
    deckTitle: $('#deck-title'), deckTags: $('#deck-tags'), cardCountLabel: $('#card-count-label'), cardList: $('#card-list'), emptyDeck: $('#empty-deck'),
    flashcard: $('#flashcard'), flashFront: $('#flashcard-front-content'), flashBack: $('#flashcard-back-content'), frontLabel: $('#front-label'), backLabel: $('#back-label'), studyProgress: $('#study-progress'), studyDeckName: $('#study-deck-name'), studyDirection: $('#study-direction'),
    matchingDeckName: $('#matching-deck-name'), matchingProgress: $('#matching-progress'), matchingLeft: $('#matching-left'), matchingRight: $('#matching-right'), matchingStatus: $('#matching-status'),
    deckDialog: $('#deck-dialog'), deckForm: $('#deck-form'), deckDialogTitle: $('#deck-dialog-title'), deckNameInput: $('#deck-name-input'), deckTagsInput: $('#deck-tags-input'),
    cardDialog: $('#card-dialog'), cardForm: $('#card-form'), cardDialogTitle: $('#card-dialog-title'), frontText: $('#front-text-input'), backText: $('#back-text-input'), frontImageInput: $('#front-image-input'), backImageInput: $('#back-image-input'), frontPreview: $('#front-image-preview'), backPreview: $('#back-image-preview'), cardError: $('#card-form-error'),
    cropDialog: $('#crop-dialog'), cropForm: $('#crop-form'), cropStage: $('#crop-stage'), cropImage: $('#crop-image'), cropZoom: $('#crop-zoom'),
    confirmDialog: $('#confirm-dialog'), confirmForm: $('#confirm-form'), confirmTitle: $('#confirm-title'), confirmCopy: $('#confirm-copy'), confirmAction: $('#confirm-action'),
  };


  function loadData() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) state.data = JSON.parse(raw);
      if (!Array.isArray(state.data.decks)) state.data = { decks: [] };
    } catch {
      state.data = { decks: [] };
    }
  }

  function saveData() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state.data));
    } catch (error) {
      alert('Recollect could not save your changes. Your browser storage may be full.');
      console.error(error);
    }
  }

  function getDeck(id = state.currentDeckId) {
    return state.data.decks.find((deck) => deck.id === id) || null;
  }

  function setView(viewName) {
    const map = { home: els.homeView, deck: els.deckView, study: els.studyView, matching: els.matchingView };
    Object.values(map).forEach((view) => view.classList.remove('active-view'));
    map[viewName].classList.add('active-view');
  }

  function textPreview(side) {
    const text = (side.text || '').trim();
    return text || (side.image ? 'Image card' : 'Empty card');
  }

  function parseTags(value) {
    return [...new Set(value.split(',').map((tag) => tag.trim()).filter(Boolean))].slice(0, 12);
  }

  function renderTags(container, tags) {
    container.innerHTML = '';
    tags.forEach((tag) => {
      const span = document.createElement('span');
      span.className = 'tag';
      span.textContent = tag;
      container.append(span);
    });
  }

  function renderHome() {
    const query = els.deckSearch.value.trim().toLowerCase();
    const decks = state.data.decks.filter((deck) => {
      const haystack = `${deck.title} ${deck.tags.join(' ')}`.toLowerCase();
      return !query || haystack.includes(query);
    });
    els.deckTotal.textContent = `${state.data.decks.length} ${state.data.decks.length === 1 ? 'deck' : 'decks'}`;
    els.deckList.innerHTML = '';
    els.emptyLibrary.classList.toggle('hidden', state.data.decks.length !== 0 || Boolean(query));

    if (!decks.length && state.data.decks.length && query) {
      els.deckList.innerHTML = '<p class="mode-intro">No decks match that search.</p>';
      return;
    }

    decks.forEach((deck) => {
      const template = $('#deck-template').content.cloneNode(true);
      const button = $('.deck-open-button', template);
      $('.deck-item-title', template).textContent = deck.title;
      $('.deck-item-meta', template).textContent = `${deck.cards.length} ${deck.cards.length === 1 ? 'card' : 'cards'}`;
      renderTags($('.deck-item-tags', template), deck.tags);
      button.addEventListener('click', () => openDeck(deck.id));
      els.deckList.append(template);
    });
  }

  function openDeck(id) {
    state.currentDeckId = id;
    renderDeck();
    setView('deck');
  }

  function renderDeck() {
    const deck = getDeck();
    if (!deck) return goHome();
    els.deckTitle.textContent = deck.title;
    renderTags(els.deckTags, deck.tags);
    els.cardCountLabel.textContent = `${deck.cards.length} ${deck.cards.length === 1 ? 'card' : 'cards'}`;
    els.cardList.innerHTML = '';
    els.emptyDeck.classList.toggle('hidden', deck.cards.length !== 0);

    deck.cards.forEach((card) => {
      const item = document.createElement('article');
      item.className = 'card-list-item';
      const thumb = document.createElement('div');
      thumb.className = 'card-thumb';
      const image = card.front.image || card.back.image;
      if (image) {
        const img = document.createElement('img');
        img.src = image;
        img.alt = '';
        thumb.append(img);
      } else thumb.textContent = 'Aa';
      const copy = document.createElement('div');
      copy.className = 'card-list-copy';
      copy.innerHTML = `<strong>${escapeHtml(textPreview(card.front))}</strong><span>${escapeHtml(textPreview(card.back))}</span>`;
      const more = document.createElement('button');
      more.className = 'card-more-button';
      more.type = 'button';
      more.textContent = '•••';
      more.setAttribute('aria-label', 'Edit or delete card');
      more.addEventListener('click', () => openCardOptions(card.id));
      item.append(thumb, copy, more);
      els.cardList.append(item);
    });
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char]));
  }

  function goHome() {
    state.currentDeckId = null;
    renderHome();
    setView('home');
  }

  function openDeckDialog(deck = null) {
    state.editingDeckId = deck?.id || null;
    els.deckDialogTitle.textContent = deck ? 'Edit deck' : 'New deck';
    els.deckNameInput.value = deck?.title || '';
    els.deckTagsInput.value = deck?.tags.join(', ') || '';
    els.deckDialog.showModal();
    requestAnimationFrame(() => els.deckNameInput.focus());
  }

  function submitDeck(event) {
    event.preventDefault();
    const title = els.deckNameInput.value.trim();
    if (!title) return;
    const tags = parseTags(els.deckTagsInput.value);
    if (state.editingDeckId) {
      const deck = getDeck(state.editingDeckId);
      deck.title = title;
      deck.tags = tags;
    } else {
      const deck = { id: uid(), title, tags, cards: [], createdAt: Date.now() };
      state.data.decks.unshift(deck);
      state.currentDeckId = deck.id;
    }
    saveData();
    els.deckDialog.close();
    if (state.currentDeckId) { renderDeck(); setView('deck'); } else renderHome();
  }

  function deckOptions() {
    const deck = getDeck();
    if (!deck) return;
    const choice = prompt('Type E to edit this deck or D to delete it.');
    if (!choice) return;
    if (choice.trim().toLowerCase() === 'e') openDeckDialog(deck);
    if (choice.trim().toLowerCase() === 'd') confirmDeleteDeck(deck);
  }

  function confirmDeleteDeck(deck) {
    state.confirmAction = () => {
      state.data.decks = state.data.decks.filter((item) => item.id !== deck.id);
      saveData();
      els.confirmDialog.close();
      goHome();
    };
    els.confirmTitle.textContent = `Delete “${deck.title}”?`;
    els.confirmCopy.textContent = 'This deletes the deck and all of its cards from this device.';
    els.confirmAction.textContent = 'Delete deck';
    els.confirmDialog.showModal();
  }

  function openCardOptions(cardId) {
    const deck = getDeck();
    const card = deck?.cards.find((item) => item.id === cardId);
    if (!card) return;
    const choice = prompt('Type E to edit this card or D to delete it.');
    if (!choice) return;
    if (choice.trim().toLowerCase() === 'e') openCardDialog(card);
    if (choice.trim().toLowerCase() === 'd') confirmDeleteCard(card);
  }

  function blankSide() { return { text: '', image: '' }; }

  function openCardDialog(card = null) {
    state.editingCardId = card?.id || null;
    els.cardDialogTitle.textContent = card ? 'Edit card' : 'New card';
    els.frontText.value = card?.front.text || '';
    els.backText.value = card?.back.text || '';
    renderImagePreview('front', card?.front.image || '');
    renderImagePreview('back', card?.back.image || '');
    els.cardError.textContent = '';
    els.cardDialog.showModal();
  }

  function renderImagePreview(side, src) {
    const container = side === 'front' ? els.frontPreview : els.backPreview;
    container.innerHTML = '';
    container.classList.toggle('hidden', !src);
    if (!src) return;
    const img = document.createElement('img');
    img.src = src;
    img.alt = `${side} image preview`;
    const remove = document.createElement('button');
    remove.type = 'button';
    remove.textContent = '×';
    remove.setAttribute('aria-label', `Remove ${side} image`);
    remove.addEventListener('click', () => {
      container.dataset.image = '';
      renderImagePreview(side, '');
    });
    container.dataset.image = src;
    container.append(img, remove);
  }

  function currentSideImage(side) {
    const container = side === 'front' ? els.frontPreview : els.backPreview;
    return container.dataset.image || '';
  }

  function clearSide(side) {
    if (side === 'front') els.frontText.value = '';
    else els.backText.value = '';
    renderImagePreview(side, '');
  }

  function submitCard(event) {
    event.preventDefault();
    const front = { text: els.frontText.value.trim(), image: currentSideImage('front') };
    const back = { text: els.backText.value.trim(), image: currentSideImage('back') };
    if ((!front.text && !front.image) || (!back.text && !back.image)) {
      els.cardError.textContent = 'Add text or an image to both sides of the card.';
      return;
    }
    const deck = getDeck();
    if (!deck) return;
    if (state.editingCardId) {
      const card = deck.cards.find((item) => item.id === state.editingCardId);
      card.front = front;
      card.back = back;
    } else {
      deck.cards.push({ id: uid(), front, back, createdAt: Date.now() });
    }
    saveData();
    els.cardDialog.close();
    renderDeck();
  }

  function confirmDeleteCard(card) {
    state.confirmAction = () => {
      const deck = getDeck();
      deck.cards = deck.cards.filter((item) => item.id !== card.id);
      saveData();
      els.confirmDialog.close();
      renderDeck();
    };
    els.confirmTitle.textContent = 'Delete this card?';
    els.confirmCopy.textContent = 'This card will be removed from the deck.';
    els.confirmAction.textContent = 'Delete card';
    els.confirmDialog.showModal();
  }

  function openStudy() {
    const deck = getDeck();
    if (!deck?.cards.length) return alert('Add at least one card before studying.');
    state.studyIndex = 0;
    state.studyDirection = els.studyDirection.value;
    els.studyDeckName.textContent = deck.title;
    renderStudy();
    setView('study');
  }

  function renderContent(container, side) {
    container.innerHTML = '';
    if (side.image) {
      const img = document.createElement('img');
      img.className = 'flashcard-image';
      img.src = side.image;
      img.alt = '';
      container.append(img);
    }
    if (side.text) {
      const text = document.createElement('p');
      text.className = 'flashcard-text';
      text.textContent = side.text;
      container.append(text);
    }
  }

  function renderStudy() {
    const deck = getDeck();
    const card = deck.cards[state.studyIndex];
    const reverse = state.studyDirection === 'back-front';
    const first = reverse ? card.back : card.front;
    const second = reverse ? card.front : card.back;
    renderContent(els.flashFront, first);
    renderContent(els.flashBack, second);
    els.frontLabel.textContent = reverse ? 'BACK' : 'FRONT';
    els.backLabel.textContent = reverse ? 'FRONT' : 'BACK';
    els.studyProgress.textContent = `${state.studyIndex + 1} / ${deck.cards.length}`;
    els.flashcard.classList.remove('is-flipped');
  }

  function shiftStudy(delta) {
    const deck = getDeck();
    state.studyIndex = (state.studyIndex + delta + deck.cards.length) % deck.cards.length;
    renderStudy();
  }

  function openMatching() {
    const deck = getDeck();
    if (!deck?.cards.length) return alert('Add at least one card before starting matching.');
    state.matching = {
      selectedLeftId: null,
      selectedRightId: null,
      matchedIds: new Set(),
      left: shuffle(deck.cards.map((card) => card.id)),
      right: shuffle(deck.cards.map((card) => card.id)),
    };
    els.matchingDeckName.textContent = deck.title;
    els.matchingStatus.textContent = 'Select a prompt, then choose its match.';
    renderMatching();
    setView('matching');
  }

  function shuffle(list) {
    const result = [...list];
    for (let index = result.length - 1; index > 0; index -= 1) {
      const swap = Math.floor(Math.random() * (index + 1));
      [result[index], result[swap]] = [result[swap], result[index]];
    }
    return result;
  }

  function matchingCardContent(side) {
    const wrapper = document.createDocumentFragment();
    if (side.image) {
      const img = document.createElement('img');
      img.src = side.image;
      img.alt = '';
      wrapper.append(img);
    }
    if (side.text) {
      const span = document.createElement('span');
      span.textContent = side.text;
      wrapper.append(span);
    } else if (side.image) {
      const span = document.createElement('span');
      span.textContent = 'Image';
      wrapper.append(span);
    }
    return wrapper;
  }

  function renderMatching() {
    const deck = getDeck();
    const game = state.matching;
    els.matchingLeft.innerHTML = '';
    els.matchingRight.innerHTML = '';
    els.matchingProgress.textContent = `${game.matchedIds.size} / ${deck.cards.length} matched`;

    game.left.forEach((id) => {
      const card = deck.cards.find((item) => item.id === id);
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'matching-choice';
      button.classList.toggle('selected', game.selectedLeftId === id);
      button.classList.toggle('matched', game.matchedIds.has(id));
      button.disabled = game.matchedIds.has(id);
      button.append(matchingCardContent(card.front));
      button.addEventListener('click', () => selectMatch('left', id));
      els.matchingLeft.append(button);
    });

    game.right.forEach((id) => {
      const card = deck.cards.find((item) => item.id === id);
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'matching-choice';
      button.classList.toggle('selected', game.selectedRightId === id);
      button.classList.toggle('matched', game.matchedIds.has(id));
      button.disabled = game.matchedIds.has(id);
      button.append(matchingCardContent(card.back));
      button.addEventListener('click', () => selectMatch('right', id));
      els.matchingRight.append(button);
    });
  }

  function selectMatch(side, id) {
    const game = state.matching;
    if (side === 'left') game.selectedLeftId = id;
    else game.selectedRightId = id;
    if (game.selectedLeftId && game.selectedRightId) {
      if (game.selectedLeftId === game.selectedRightId) {
        game.matchedIds.add(id);
        game.selectedLeftId = null;
        game.selectedRightId = null;
        els.matchingStatus.textContent = game.matchedIds.size === getDeck().cards.length ? 'Deck complete.' : 'Matched.';
      } else {
        els.matchingStatus.textContent = 'Not a match. Try again.';
        game.selectedLeftId = null;
        game.selectedRightId = null;
      }
    }
    renderMatching();
  }

  function openCropFor(side, file) {
    if (!file) return;
    if (!file.type.startsWith('image/')) return alert('Please choose an image file.');
    if (file.size > MAX_IMAGE_BYTES) return alert('Images must be 5 MB or smaller.');
    const reader = new FileReader();
    reader.addEventListener('load', () => {
      state.crop = { side, source: reader.result, image: null, zoom: 1, x: 0, y: 0, baseScale: 1, dragging: false };
      els.cropImage.src = reader.result;
      els.cropZoom.value = '1';
      els.cropDialog.showModal();
    });
    reader.readAsDataURL(file);
  }

  function initializeCropImage() {
    const crop = state.crop;
    crop.image = els.cropImage;
    const stageSize = els.cropStage.clientWidth;
    const imageRatio = crop.image.naturalWidth / crop.image.naturalHeight;
    crop.baseScale = imageRatio >= 1 ? stageSize / crop.image.naturalHeight : stageSize / crop.image.naturalWidth;
    crop.x = 0; crop.y = 0; crop.zoom = 1;
    updateCropTransform();
  }

  function cropDimensions() {
    const crop = state.crop;
    const scale = crop.baseScale * crop.zoom;
    return { width: crop.image.naturalWidth * scale, height: crop.image.naturalHeight * scale };
  }

  function constrainCrop() {
    const crop = state.crop;
    const stage = els.cropStage.clientWidth;
    const { width, height } = cropDimensions();
    const maxX = Math.max(0, (width - stage) / 2);
    const maxY = Math.max(0, (height - stage) / 2);
    crop.x = Math.max(-maxX, Math.min(maxX, crop.x));
    crop.y = Math.max(-maxY, Math.min(maxY, crop.y));
  }

  function updateCropTransform() {
    const crop = state.crop;
    if (!crop?.image?.naturalWidth) return;
    constrainCrop();
    const { width, height } = cropDimensions();
    crop.image.style.width = `${width}px`;
    crop.image.style.height = `${height}px`;
    crop.image.style.transform = `translate(calc(-50% + ${crop.x}px), calc(-50% + ${crop.y}px))`;
  }

  function exportCrop() {
    const crop = state.crop;
    const stage = els.cropStage.clientWidth;
    const canvas = document.createElement('canvas');
    const outputSize = 900;
    canvas.width = outputSize;
    canvas.height = outputSize;
    const ctx = canvas.getContext('2d');
    const { width, height } = cropDimensions();
    const factor = outputSize / stage;
    const x = (stage - width) / 2 + crop.x;
    const y = (stage - height) / 2 + crop.y;
    ctx.drawImage(crop.image, x * factor, y * factor, width * factor, height * factor);
    return canvas.toDataURL('image/jpeg', 0.9);
  }

  function bindEvents() {
    $('#new-deck-button').addEventListener('click', () => openDeckDialog());
    $('#empty-new-deck').addEventListener('click', () => openDeckDialog());
    $('#home-button').addEventListener('click', goHome);
    $('#back-to-home').addEventListener('click', goHome);
    els.deckSearch.addEventListener('input', renderHome);
    els.deckForm.addEventListener('submit', submitDeck);
    $('#deck-menu-button').addEventListener('click', deckOptions);
    $('#new-card-button').addEventListener('click', () => openCardDialog());
    $('#study-deck-button').addEventListener('click', openStudy);
    $('#matching-deck-button').addEventListener('click', openMatching);
    $('#exit-study').addEventListener('click', () => { renderDeck(); setView('deck'); });
    $('#exit-matching').addEventListener('click', () => { renderDeck(); setView('deck'); });
    els.flashcard.addEventListener('click', () => els.flashcard.classList.toggle('is-flipped'));
    els.flashcard.addEventListener('keydown', (event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); els.flashcard.classList.toggle('is-flipped'); } });
    $('#previous-card').addEventListener('click', () => shiftStudy(-1));
    $('#next-card').addEventListener('click', () => shiftStudy(1));
    els.studyDirection.addEventListener('change', () => { state.studyDirection = els.studyDirection.value; renderStudy(); });
    els.cardForm.addEventListener('submit', submitCard);
    $$('[data-open-file]').forEach((button) => button.addEventListener('click', () => $(`#${button.dataset.openFile}`).click()));
    els.frontImageInput.addEventListener('change', (event) => openCropFor('front', event.target.files[0]));
    els.backImageInput.addEventListener('change', (event) => openCropFor('back', event.target.files[0]));
    $$('[data-clear-side]').forEach((button) => button.addEventListener('click', () => clearSide(button.dataset.clearSide)));
    $$('[data-close]').forEach((button) => button.addEventListener('click', () => { const dialog = $(`#${button.dataset.close}`); dialog.close(); }));
    els.confirmForm.addEventListener('submit', (event) => { event.preventDefault(); state.confirmAction?.(); state.confirmAction = null; });

    els.cropImage.addEventListener('load', initializeCropImage);
    els.cropZoom.addEventListener('input', () => { if (!state.crop) return; state.crop.zoom = Number(els.cropZoom.value); updateCropTransform(); });
    let pointerStart = null;
    els.cropStage.addEventListener('pointerdown', (event) => {
      if (!state.crop) return;
      els.cropStage.setPointerCapture(event.pointerId);
      pointerStart = { x: event.clientX, y: event.clientY, cropX: state.crop.x, cropY: state.crop.y };
    });
    els.cropStage.addEventListener('pointermove', (event) => {
      if (!pointerStart || !state.crop) return;
      state.crop.x = pointerStart.cropX + (event.clientX - pointerStart.x);
      state.crop.y = pointerStart.cropY + (event.clientY - pointerStart.y);
      updateCropTransform();
    });
    const stopDrag = () => { pointerStart = null; };
    els.cropStage.addEventListener('pointerup', stopDrag);
    els.cropStage.addEventListener('pointercancel', stopDrag);
    els.cropForm.addEventListener('submit', (event) => {
      event.preventDefault();
      const image = exportCrop();
      renderImagePreview(state.crop.side, image);
      els.cropDialog.close();
      state.crop = null;
    });
  }

  loadData();
  bindEvents();
  renderHome();
})();
