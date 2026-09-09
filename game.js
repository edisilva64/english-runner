/* =========================
   ESTADO DO JOGO
========================= */

let selectedCharacter = null;
let playerName = "";

let currentWordIndex = 0;
let currentLetterIndex = 0;

let score = 0;

let gameRunning = false;
let letterObjects = [];

let lastTime = 0;


/* =========================
   ELEMENTOS
========================= */

const startScreen = document.getElementById("start-screen");
const characterScreen = document.getElementById("character-screen");
const nameScreen = document.getElementById("name-screen");
const gameScreen = document.getElementById("game-screen");

const playButton = document.getElementById("play-button");

const characterButtons =
    document.querySelectorAll(".character");

const characterNext =
    document.getElementById("character-next");

const playerNameInput =
    document.getElementById("player-name");

const startGameButton =
    document.getElementById("start-game");

const displayName =
    document.getElementById("display-name");

const scoreDisplay =
    document.getElementById("score");

const wordDisplay =
    document.getElementById("word-display");

const lettersContainer =
    document.getElementById("letters-container");

const playerAvatar =
    document.getElementById("player-avatar");

const gameArea =
    document.getElementById("game-area");


/* =========================
   TROCA DE TELA
========================= */

function showScreen(screen) {

    document.querySelectorAll(".screen").forEach(item => {
        item.classList.remove("active");
    });

    screen.classList.add("active");
}


/* =========================
   BOTÃO PLAY
========================= */

playButton.addEventListener("click", () => {

    showScreen(characterScreen);

});


/* =========================
   ESCOLHA DO PERSONAGEM
========================= */

characterButtons.forEach(button => {

    button.addEventListener("click", () => {

        characterButtons.forEach(item => {
            item.classList.remove("selected");
        });

        button.classList.add("selected");

        selectedCharacter =
            button.dataset.character;

        characterNext.disabled = false;

    });

});


characterNext.addEventListener("click", () => {

    showScreen(nameScreen);

});


/* =========================
   NOME
========================= */

playerNameInput.addEventListener("input", () => {

    playerName =
        playerNameInput.value.trim();

    startGameButton.disabled =
        playerName.length === 0;

});


/* =========================
   INICIAR JOGO
========================= */

startGameButton.addEventListener("click", () => {

    if (!playerName || !selectedCharacter) {
        return;
    }

    displayName.textContent =
        playerName.toUpperCase();

    playerAvatar.textContent =
        selectedCharacter === "boy"
            ? "👦"
            : "👧";

    score = 0;

    scoreDisplay.textContent = score;

    currentWordIndex = 0;

    showScreen(gameScreen);

    startWord();

});


/* =========================
   PALAVRA
========================= */

function startWord() {

    gameRunning = false;

    clearLetters();

    currentLetterIndex = 0;

    const currentWord =
        WORDS[currentWordIndex].word;

    wordDisplay.innerHTML = "";

    for (let i = 0; i < currentWord.length; i++) {

        const letter =
            document.createElement("span");

        letter.className =
            "word-letter";

        letter.textContent = "_";

        letter.dataset.index = i;

        wordDisplay.appendChild(letter);
    }

    createLetters(currentWord);

    setTimeout(() => {

        gameRunning = true;

    }, 500);

}


/* =========================
   CRIA LETRAS
========================= */

function createLetters(word) {

    lettersContainer.innerHTML = "";

    letterObjects = [];

    const areaWidth =
        gameArea.clientWidth;

    const spacing =
        Math.max(130, areaWidth / word.length);

    word.split("").forEach((letter, index) => {

        const element =
            document.createElement("div");

        element.className =
            "game-letter";

        element.textContent =
            letter;

        /*
         * As letras começam fora da tela
         * e vão se aproximando do jogador.
         */

        const startX =
            areaWidth + index * spacing;

        element.style.left =
            `${startX}px`;

        lettersContainer.appendChild(element);

        letterObjects.push({

            element: element,
            letter: letter,
            x: startX,
            collected: false

        });

    });

    requestAnimationFrame(gameLoop);
}


/* =========================
   LOOP DO JOGO
========================= */

function gameLoop(timestamp) {

    if (!gameRunning) {
        return;
    }

    if (!lastTime) {
        lastTime = timestamp;
    }

    const delta =
        timestamp - lastTime;

    lastTime = timestamp;

    const speed =
        0.35 * delta;

    letterObjects.forEach(item => {

        if (item.collected) {
            return;
        }

        item.x -= speed;

        item.element.style.left =
            `${item.x}px`;

        checkCollision(item);

    });

    /*
     * Se ainda existem letras,
     * continuamos o jogo.
     */

    requestAnimationFrame(gameLoop);
}


/* =========================
   COLISÃO
========================= */

function checkCollision(item) {

    const playerRect =
        document.getElementById("player")
            .getBoundingClientRect();

    const letterRect =
        item.element.getBoundingClientRect();

    const collision =
        playerRect.left < letterRect.right &&
        playerRect.right > letterRect.left &&
        playerRect.top < letterRect.bottom &&
        playerRect.bottom > letterRect.top;

    if (collision) {

        collectLetter(item);

    }

}


/* =========================
   COLETAR LETRA
========================= */

function collectLetter(item) {

    if (item.collected) {
        return;
    }

    /*
     * A criança só pode pegar
     * a próxima letra da palavra.
     */

    const currentWord =
        WORDS[currentWordIndex].word;

    const expectedLetter =
        currentWord[currentLetterIndex];

    if (item.letter !== expectedLetter) {

        /*
         * Por enquanto, não fazemos nada
         * quando a letra é errada.
         *
         * Depois acrescentaremos penalidade,
         * som e feedback visual.
         */

        return;
    }

    item.collected = true;

    item.element.remove();

    updateWord();

    playLetterSound(item.letter);

    currentLetterIndex++;

    score += 100;

    scoreDisplay.textContent =
        score;

    if (currentLetterIndex >= currentWord.length) {

        finishWord();

    }

}


/* =========================
   ATUALIZA PALAVRA
========================= */

function updateWord() {

    const letters =
        wordDisplay.querySelectorAll(".word-letter");

    for (let i = 0; i < currentLetterIndex; i++) {

        letters[i].textContent =
            WORDS[currentWordIndex].word[i];

        letters[i].classList.add("found");

    }

}


/* =========================
   TERMINA PALAVRA
========================= */

function finishWord() {

    gameRunning = false;

    const word =
        WORDS[currentWordIndex].word;

    playWordSound(word);

    setTimeout(() => {

        currentWordIndex++;

        if (currentWordIndex >= WORDS.length) {

            endGame();

        } else {

            startWord();

        }

    }, 1800);

}


/* =========================
   ÁUDIO DA LETRA
========================= */

function playLetterSound(letter) {

    /*
     * Primeira versão:
     * usamos a Web Speech API.
     *
     * Posteriormente podemos substituir
     * por arquivos de áudio próprios.
     */

    if (!("speechSynthesis" in window)) {
        return;
    }

    speechSynthesis.cancel();

    const utterance =
        new SpeechSynthesisUtterance(letter);

    utterance.lang = "en-US";

    utterance.rate = 0.8;

    speechSynthesis.speak(utterance);

}


/* =========================
   ÁUDIO DA PALAVRA
========================= */

function playWordSound(word) {

    if (!("speechSynthesis" in window)) {
        return;
    }

    speechSynthesis.cancel();

    const utterance =
        new SpeechSynthesisUtterance(word);

    utterance.lang = "en-US";

    utterance.rate = 0.75;

    speechSynthesis.speak(utterance);

}


/* =========================
   LIMPA LETRAS
========================= */

function clearLetters() {

    lettersContainer.innerHTML = "";

    letterObjects = [];

    lastTime = 0;

}


/* =========================
   FIM DO JOGO
========================= */

function endGame() {

    gameRunning = false;

    alert(
        `Congratulations, ${playerName}!\n\nScore: ${score}`
    );

}
