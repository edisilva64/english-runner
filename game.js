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
    word: document.querySelector("#word-display"), phase: document.querySelector("#phase-display"), score: document.querySelector("#score"), lives: document.querySelector("#lives"),
    area: document.querySelector("#game-area"), letters: document.querySelector("#letters-container"), targetPrompt: document.querySelector("#target-prompt"),
    jump: document.querySelector("#jump-button"), message: document.querySelector("#message"),
    endPanel: document.querySelector("#end-panel"), retry: document.querySelector("#retry-button"), celebration: document.querySelector("#celebration"),
    phasePanel: document.querySelector("#phase-panel"), phaseTitle: document.querySelector("#phase-title"), phaseCopy: document.querySelector("#phase-copy"), phaseButton: document.querySelector("#phase-button")
  };

  const state = { active: false, character: "boy", score: 0, lives: 5, wordIndex: -1, word: "", letterIndex: 0, playerY: 0, velocityY: 0, speed: 0, rightHeld: false, jumpKeyHeld: false, lastTime: 0, spawner: 0, letters: [], messageTimer: 0, finishing: false, phaseIsFinal: false };
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const FLOOR = 82;
  const GRAVITY = 1900;
  const JUMP_SPEED = 760;
  const MAX_RUN_SPEED = 350;
  const ACCELERATION = 820;
  const BRAKE = 1100;
  const WORDS_PER_PHASE = 3;

  function chooseCharacter(button) {
    state.character = button.dataset.character;
    el.characters.forEach(item => { const selected = item === button; item.classList.toggle("selected", selected); item.setAttribute("aria-pressed", String(selected)); });
  }

  function begin() {
    if (!words.length) { el.startError.textContent = "The word list could not load. Check data/words.js and reload the page."; return; }
    state.score = 0; state.lives = 5; state.speed = 0; state.rightHeld = false; state.wordIndex = -1; state.letters = []; state.active = true; state.finishing = false;
    el.score.textContent = "0";
    renderLives();
    el.displayName.textContent = el.name.value.trim().toUpperCase() || "PLAYER";
    el.player.className = `player ${state.character}`;
    el.start.classList.add("hidden"); el.game.classList.remove("hidden");
    nextWord(); showMessage("Hold → to run. Press SPACE or ↑ to jump!", 1800); el.area.focus(); state.lastTime = performance.now(); requestAnimationFrame(loop);
  }

  function nextWord() {
    state.wordIndex = (state.wordIndex + 1) % words.length;
    state.word = words[state.wordIndex]; state.letterIndex = 0; state.spawner = 0; state.finishing = false;
    renderPhase();
    clearLetters(); renderWord(); showMessage(`Find the letter ${neededLetter()}!`, 1100); speak(state.word, true);
    // A first target is placed soon enough that every round visibly begins.
    spawnLetter(true);
  }

  function neededLetter() { return state.word[state.letterIndex]; }
  function renderWord() {
    el.word.innerHTML = "";
    [...state.word].forEach((letter, index) => { const tile = document.createElement("span"); tile.className = "word-letter" + (index >= state.letterIndex ? " empty" : ""); tile.textContent = letter; el.word.append(tile); });
    renderTargetPrompt();
  }

  function renderTargetPrompt() {
    const letter = neededLetter();
    el.targetPrompt.querySelector("strong").textContent = letter || "✓";
    el.targetPrompt.setAttribute("aria-label", letter ? `Find the letter ${letter}` : "Word complete");
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

  function renderPhase() {
    const currentPhase = Math.floor(state.wordIndex / WORDS_PER_PHASE) + 1;
    const totalPhases = Math.ceil(words.length / WORDS_PER_PHASE);
    el.phase.textContent = `PHASE ${currentPhase} · WORD`;
    el.phase.setAttribute("aria-label", `Phase ${currentPhase} of ${totalPhases}`);
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
    updateSpeed(dt); updatePlayer(dt); updateLetters(dt);
    if (state.speed > 1) state.spawner += dt;
    if (!state.finishing && state.spawner > 1.25) { spawnLetter(); state.spawner = 0; }
    requestAnimationFrame(loop);
  }

  function updateSpeed(dt) {
    if (state.finishing) {
      state.speed = 0;
      el.player.classList.remove("running");
      return;
    }
    const change = (state.rightHeld ? ACCELERATION : -BRAKE) * dt;
    state.speed = Math.max(0, Math.min(MAX_RUN_SPEED, state.speed + change));
    el.player.classList.toggle("running", state.speed > 25);
  }

  function updatePlayer(dt) {
    state.velocityY -= GRAVITY * dt; state.playerY = Math.max(0, state.playerY + state.velocityY * dt);
    if (state.playerY === 0 && state.velocityY < 0) { state.velocityY = 0; el.player.classList.remove("jumping"); }
    el.player.style.bottom = `${FLOOR + state.playerY}px`;
  }

  function updateLetters(dt) {
    const playerBox = el.player.getBoundingClientRect();
    for (let i = state.letters.length - 1; i >= 0; i--) {
      const item = state.letters[i]; item.x -= state.speed * dt; item.node.style.transform = `translate(${item.x}px, ${-item.y}px)`;
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
        // A new attempt starts from zero, so a defeat cannot carry points forward.
        state.score = 0;
        el.score.textContent = "0";
        state.speed = 0;
        state.rightHeld = false;
        el.player.classList.remove("running");
        showEndScreen();
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
      state.finishing = true; state.score += 25; el.score.textContent = String(state.score);
      const phaseFinished = (state.wordIndex + 1) % WORDS_PER_PHASE === 0 || state.wordIndex + 1 === words.length;
      showMessage(phaseFinished ? "Phase complete!" : `${state.word}! Great job! +25`, 1500); speak(state.word); playTune("win"); celebrate(phaseFinished ? 60 : 28);
      if (phaseFinished) {
        clearLetters();
        state.speed = 0;
        state.rightHeld = false;
        state.phaseIsFinal = state.wordIndex + 1 === words.length;
        window.setTimeout(showPhaseEnd, 520);
      } else {
        window.setTimeout(nextWord, 1700);
      }
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

  function showEndScreen() {
    el.endPanel.classList.remove("hidden");
    el.retry.focus();
  }

  function showPhaseEnd() {
    const completedPhase = Math.floor(state.wordIndex / WORDS_PER_PHASE) + 1;
    if (state.phaseIsFinal) {
      el.phaseTitle.textContent = "ALL PHASES COMPLETE!";
      el.phaseCopy.textContent = `Amazing! You completed all ${Math.ceil(words.length / WORDS_PER_PHASE)} phases.`;
      el.phaseButton.textContent = "PLAY AGAIN";
    } else {
      el.phaseTitle.textContent = `PHASE ${completedPhase} COMPLETE!`;
      el.phaseCopy.textContent = "Wonderful! Take a breath, then begin the next phase.";
      el.phaseButton.textContent = `START PHASE ${completedPhase + 1}`;
    }
    el.phasePanel.classList.remove("hidden");
    el.phaseButton.focus();
  }

  function startFollowingPhase() {
    el.phasePanel.classList.add("hidden");
    if (state.phaseIsFinal) {
      state.score = 0;
      state.lives = 5;
      state.wordIndex = -1;
      el.score.textContent = "0";
      renderLives();
    }
    state.phaseIsFinal = false;
    nextWord();
    el.area.focus();
  }

  function celebrate(count = 28) {
    const colors = ["#f8b923", "#ef5a72", "#3cae65", "#4d9fe8", "#9b6ddd"];
    el.celebration.innerHTML = "";
    for (let index = 0; index < count; index++) {
      const confetti = document.createElement("i");
      confetti.className = "confetti";
      confetti.style.left = `${12 + Math.random() * 76}%`;
      confetti.style.background = colors[index % colors.length];
      confetti.style.setProperty("--delay", `${Math.random() * 0.28}s`);
      confetti.style.setProperty("--turn", `${-220 + Math.random() * 440}deg`);
      el.celebration.append(confetti);
    }
    el.celebration.classList.add("active");
    window.setTimeout(() => { el.celebration.classList.remove("active"); el.celebration.innerHTML = ""; }, 1500);
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
  el.retry.addEventListener("click", () => { el.endPanel.classList.add("hidden"); retryWord(); el.area.focus(); });
  el.phaseButton.addEventListener("click", startFollowingPhase);
  window.addEventListener("keydown", event => {
    if (event.key === "ArrowRight") { event.preventDefault(); state.rightHeld = true; }
    if (event.code === "Space" || event.key === "ArrowUp") {
      event.preventDefault();
      if (!state.jumpKeyHeld) { state.jumpKeyHeld = true; jump(); }
    }
  });
  window.addEventListener("keyup", event => {
    if (event.key === "ArrowRight") state.rightHeld = false;
    if (event.code === "Space" || event.key === "ArrowUp") state.jumpKeyHeld = false;
  });
})();
