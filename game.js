(() => {
  "use strict";

  // Explicitly read the global exported by data/words.js. This avoids relying on
  // accidental global `const` bindings, a common reason for an empty WORD field.
  const words = Array.isArray(window.ENGLISH_RUNNER_WORDS)
    ? window.ENGLISH_RUNNER_WORDS.map(word => String(word).trim().toUpperCase()).filter(word => /^[A-Z]+$/.test(word))
    : [];

  const el = {
    start: document.querySelector("#start-screen"), game: document.querySelector("#game-screen"),
    name: document.querySelector("#player-name"), displayName: document.querySelector("#display-name"),
    startButton: document.querySelector("#start-button"), startError: document.querySelector("#start-error"),
    characters: [...document.querySelectorAll(".character")], player: document.querySelector("#player"),
    word: document.querySelector("#word-display"), score: document.querySelector("#score"), lives: document.querySelector("#lives"),
    area: document.querySelector("#game-area"), letters: document.querySelector("#letters-container"),
    jump: document.querySelector("#jump-button"), message: document.querySelector("#message")
  };

  const state = { active: false, character: "boy", score: 0, lives: 5, wordIndex: -1, word: "", letterIndex: 0, playerY: 0, velocityY: 0, lastTime: 0, spawner: 0, letters: [], messageTimer: 0, finishing: false };
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const FLOOR = 82;
  const GRAVITY = 1900;
  const JUMP_SPEED = 760;
  const LETTER_SPEED = 250;

  function chooseCharacter(button) {
    state.character = button.dataset.character;
    el.characters.forEach(item => { const selected = item === button; item.classList.toggle("selected", selected); item.setAttribute("aria-pressed", String(selected)); });
  }

  function begin() {
    if (!words.length) { el.startError.textContent = "The word list could not load. Check data/words.js and reload the page."; return; }
    state.score = 0; state.lives = 5; state.wordIndex = -1; state.letters = []; state.active = true; state.finishing = false;
    el.score.textContent = "0";
    renderLives();
    el.displayName.textContent = el.name.value.trim().toUpperCase() || "PLAYER";
    el.player.className = `player ${state.character}`;
    el.start.classList.add("hidden"); el.game.classList.remove("hidden");
    nextWord(); el.area.focus(); state.lastTime = performance.now(); requestAnimationFrame(loop);
  }

  function nextWord() {
    state.wordIndex = (state.wordIndex + 1) % words.length;
    state.word = words[state.wordIndex]; state.letterIndex = 0; state.spawner = 0; state.finishing = false;
    clearLetters(); renderWord(); showMessage(`Find the letter ${neededLetter()}!`, 1100); speak(state.word, true);
    // A first target is placed soon enough that every round visibly begins.
    spawnLetter(true);
  }

  function neededLetter() { return state.word[state.letterIndex]; }
  function renderWord() {
    el.word.innerHTML = "";
    [...state.word].forEach((letter, index) => { const tile = document.createElement("span"); tile.className = "word-letter" + (index >= state.letterIndex ? " empty" : ""); tile.textContent = letter; el.word.append(tile); });
  }

  function renderLives() {
    el.lives.innerHTML = "";
    for (let index = 0; index < 5; index++) {
      const star = document.createElement("span");
      star.className = index < state.lives ? "star" : "star lost";
      star.textContent = "★";
      el.lives.append(star);
    }
    el.lives.setAttribute("aria-label", `${state.lives} ${state.lives === 1 ? "star" : "stars"} remaining`);
  }

  function spawnLetter(forceCorrect = false) {
    if (!state.active || state.finishing || state.letters.length > 5) return;
    const correct = forceCorrect || Math.random() < 0.34;
    const char = correct ? neededLetter() : randomWrongLetter();
    const heights = [FLOOR + 18, FLOOR + 104, FLOOR + 194];
    const letter = document.createElement("div");
    letter.className = `flying-letter ${correct ? "correct" : "wrong"}`;
    letter.textContent = char;
    const item = { node: letter, char, x: el.area.clientWidth + 58, y: heights[Math.floor(Math.random() * heights.length)], correct };
    letter.style.transform = `translate(${item.x}px, ${-item.y}px)`;
    el.letters.append(letter); state.letters.push(item);
  }

  function randomWrongLetter() { const choices = alphabet.replaceAll(neededLetter(), ""); return choices[Math.floor(Math.random() * choices.length)]; }
  function clearLetters() { state.letters.forEach(item => item.node.remove()); state.letters = []; }

  function jump() { if (state.active && !state.finishing && state.playerY <= 1) { state.velocityY = JUMP_SPEED; el.player.classList.add("jumping"); } }
  function loop(time) {
    if (!state.active) return;
    const dt = Math.min((time - state.lastTime) / 1000, 0.04); state.lastTime = time;
    updatePlayer(dt); updateLetters(dt); state.spawner += dt;
    if (!state.finishing && state.spawner > 1.25) { spawnLetter(); state.spawner = 0; }
    requestAnimationFrame(loop);
  }

  function updatePlayer(dt) {
    state.velocityY -= GRAVITY * dt; state.playerY = Math.max(0, state.playerY + state.velocityY * dt);
    if (state.playerY === 0 && state.velocityY < 0) { state.velocityY = 0; el.player.classList.remove("jumping"); }
    el.player.style.bottom = `${FLOOR + state.playerY}px`;
  }

  function updateLetters(dt) {
    const playerBox = el.player.getBoundingClientRect();
    for (let i = state.letters.length - 1; i >= 0; i--) {
      const item = state.letters[i]; item.x -= LETTER_SPEED * dt; item.node.style.transform = `translate(${item.x}px, ${-item.y}px)`;
      const box = item.node.getBoundingClientRect();
      if (overlaps(playerBox, box)) { handleCollision(item, i); continue; }
      if (item.x < -70) removeLetter(i);
    }
  }

  function overlaps(a, b) { return a.left < b.right - 8 && a.right - 8 > b.left && a.top < b.bottom - 8 && a.bottom - 8 > b.top; }
  function removeLetter(index) { state.letters[index].node.remove(); state.letters.splice(index, 1); }

  function handleCollision(item, index) {
    if (state.finishing) return;
    if (item.char !== neededLetter()) {
      removeLetter(index);
      state.lives--;
      renderLives();
      playTune("mistake");
      if (state.lives === 0) {
        state.finishing = true;
        clearLetters();
        showMessage("Let's try again!", 2100);
        window.setTimeout(retryWord, 2200);
      } else {
        showMessage(`Oops! ${state.lives} stars left`, 900);
      }
      return;
    }
    collectCorrect(item, index);
  }

  function collectCorrect(item, index) {
    item.node.classList.add("caught"); window.setTimeout(() => item.node.remove(), 180); state.letters.splice(index, 1);
    state.letterIndex++; state.score += 10; el.score.textContent = String(state.score); renderWord(); speak(item.char); playTune("letter");
    if (state.letterIndex === state.word.length) {
      state.finishing = true; state.score += 25; el.score.textContent = String(state.score); showMessage(`${state.word}! Great job! +25`, 1500); speak(state.word); playTune("win");
      window.setTimeout(nextWord, 1700);
    } else { showMessage(`Great! Now find ${neededLetter()}`, 850); }
  }

  function retryWord() {
    state.lives = 5;
    state.letterIndex = 0;
    state.spawner = 0;
    state.finishing = false;
    renderLives(); renderWord(); clearLetters(); spawnLetter(true);
    showMessage(`Try again: find ${neededLetter()}!`, 1000);
  }

  function speak(text, quiet = false) {
    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel(); const utterance = new SpeechSynthesisUtterance(text); utterance.lang = "en-US"; utterance.rate = quiet ? 0.8 : 0.72; window.speechSynthesis.speak(utterance);
  }
  // Tiny synthesized sound cues keep this prototype self-contained. They use
  // Web Audio only after the child has pressed START GAME, satisfying autoplay rules.
  function playTune(kind) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;
    const context = new AudioContextClass();
    const notes = kind === "win" ? [523, 659, 784, 1047] : kind === "mistake" ? [330, 262] : [523, 659];
    const duration = kind === "mistake" ? 0.16 : 0.12;
    notes.forEach((frequency, index) => {
      const oscillator = context.createOscillator(); const gain = context.createGain();
      oscillator.type = kind === "mistake" ? "sine" : "triangle";
      oscillator.frequency.value = frequency; gain.gain.setValueAtTime(0.0001, context.currentTime + index * duration);
      gain.gain.exponentialRampToValueAtTime(0.11, context.currentTime + index * duration + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + index * duration + duration);
      oscillator.connect(gain).connect(context.destination); oscillator.start(context.currentTime + index * duration); oscillator.stop(context.currentTime + index * duration + duration + 0.03);
    });
    window.setTimeout(() => context.close(), notes.length * duration * 1000 + 150);
  }
  function showMessage(text, duration) { el.message.textContent = text; el.message.classList.add("visible"); clearTimeout(state.messageTimer); state.messageTimer = window.setTimeout(() => el.message.classList.remove("visible"), duration); }

  el.characters.forEach(button => button.addEventListener("click", () => chooseCharacter(button)));
  el.startButton.addEventListener("click", begin); el.name.addEventListener("keydown", event => { if (event.key === "Enter") begin(); });
  el.jump.addEventListener("click", jump);
  window.addEventListener("keydown", event => { if (event.code === "Space" || event.key === "ArrowUp") { event.preventDefault(); jump(); } });
})();
