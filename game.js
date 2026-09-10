/* =====================================================
   ENGLISH RUNNER
===================================================== */


/* =========================
   ELEMENTOS
========================= */

const startScreen = document.getElementById("start-screen");
const gameScreen = document.getElementById("game-screen");

const playerNameInput = document.getElementById("player-name");
const displayName = document.getElementById("display-name");

const startButton = document.getElementById("start-button");
const jumpButton = document.getElementById("jump-button");

const player = document.getElementById("player");
const lettersContainer = document.getElementById("letters-container");

const wordDisplay = document.getElementById("word-display");
const scoreDisplay = document.getElementById("score");
const message = document.getElementById("message");


/* =========================
   ESTADO DO JOGO
========================= */

let playerName = "PLAYER";
let selectedCharacter = "boy";

let score = 0;

let currentWord = "";
let currentLetterIndex = 0;

let letters = [];

let gameRunning = false;

let playerY = 0;
let velocityY = 0;

const gravity = 0.8;
const jumpPower = -14;

let lastTime = 0;


/* =========================
   PERSONAGEM
========================= */

const characterButtons =
    document.querySelectorAll(".character");

characterButtons.forEach(button => {

    button.addEventListener("click", () => {

        characterButtons.forEach(b =>
            b.classList.remove("selected")
        );

        button.classList.add("selected");

        selectedCharacter =
            button.dataset.character;

        if (selectedCharacter === "girl") {

            player.classList.add("girl");

        } else {

            player.classList.remove("girl");

        }

    });

});


/* =========================
   INICIAR JOGO
========================= */

startButton.addEventListener("click", startGame);

function startGame() {

    playerName =
        playerNameInput.value.trim() || "PLAYER";

    displayName.textContent =
        playerName.toUpperCase();

    score = 0;

    scoreDisplay.textContent = score;

    startScreen.classList.add("hidden");
    gameScreen.classList.remove("hidden");

    gameRunning = true;

    player.classList.add("running");

    startNewWord();

    requestAnimationFrame(gameLoop);
}


/* =========================
   NOVA PALAVRA
========================= */

function startNewWord() {

    lettersContainer.innerHTML = "";

    letters = [];

    currentLetterIndex = 0;

    const randomIndex =
        Math.floor(Math.random() * words.length);

    currentWord =
        words[randomIndex].toUpperCase();

    showWord();

    createLetters();

}


/* =========================
   MOSTRAR PALAVRA
========================= */

function showWord() {

    wordDisplay.innerHTML = "";

    for (let i = 0; i < currentWord.length; i++) {

        const span =
            document.createElement("div");

        span.className =
            "word-letter empty";

        span.textContent =
            currentWord[i];

        wordDisplay.appendChild(span);

    }

}


/* =========================
   CRIAR LETRAS
========================= */

function createLetters() {

    /*
       Criamos a letra correta e algumas
       letras falsas.
    */

    const requiredLetter =
        currentWord[currentLetterIndex];

    createLetter(requiredLetter, true);

    const wrongLetters = [
        "A","B","C","D","E","F","G","H",
        "I","J","K","L","M","N","O","P",
        "Q","R","S","T","U","V","W","X",
        "Y","Z"
    ];

    for (let i = 0; i < 3; i++) {

        let wrong;

        do {

            wrong =
                wrongLetters[
                    Math.floor(
                        Math.random() *
                        wrongLetters.length
                    )
                ];

        } while (wrong === requiredLetter);

        createLetter(wrong, false);

    }

}


/* =========================
   CRIAR UMA LETRA
========================= */

function createLetter(letter, correct) {

    const element =
        document.createElement("div");

    element.className =
        "game-letter";

    element.textContent =
        letter;

    /*
       As letras começam à direita.
    */

    const gameWidth =
        document.getElementById("game-area")
        .clientWidth;

    element.style.left =
        gameWidth + Math.random() * 300 + "px";


    /*
       Alturas diferentes.
       Quanto maior o bottom,
       mais alta estará a letra.
    */

    const heightOptions = [
        82,
        145,
        210
    ];

    const height =
        heightOptions[
            Math.floor(
                Math.random() *
                heightOptions.length
            )
        ];

    element.style.bottom =
        height + "px";


    lettersContainer.appendChild(element);


    letters.push({

        element: element,

        x: parseFloat(
            element.style.left
        ),

        bottom: height,

        letter: letter,

        correct: correct,

        collected: false

    });

}


/* =========================
   LOOP PRINCIPAL
========================= */

function gameLoop(timestamp) {

    if (!gameRunning)
        return;

    const delta =
        timestamp - lastTime;

    lastTime = timestamp;

    updatePlayer();

    updateLetters();

    checkCollisions();

    requestAnimationFrame(gameLoop);

}


/* =========================
   MOVIMENTO DO PERSONAGEM
========================= */

function updatePlayer() {

    /*
       Gravidade
    */

    velocityY += gravity;

    playerY += velocityY;


    /*
       O personagem começa no chão.
    */

    if (playerY > 0) {

        playerY = 0;

        velocityY = 0;

    }

    player.style.transform =
        `translateY(${playerY}px)`;

}


/* =========================
   PULAR
========================= */

function jump() {

    /*
       Só pode pular quando
       está no chão.
    */

    if (playerY === 0) {

        velocityY = jumpPower;

    }

}

document.addEventListener("keydown", event => {

    if (
        event.code === "Space" ||
        event.code === "ArrowUp"
    ) {

        event.preventDefault();

        jump();

    }

});


jumpButton.addEventListener(
    "click",
    jump
);


/* =========================
   MOVIMENTO DAS LETRAS
========================= */

function updateLetters() {

    const speed = 5;

    letters.forEach(letter => {

        if (letter.collected)
            return;

        letter.x -= speed;

        letter.element.style.left =
            letter.x + "px";

        /*
           Remove letras que saíram
           da tela.
        */

        if (letter.x < -80) {

            letter.element.remove();

            letter.collected = true;

        }

    });


    /*
       Quando todas desaparecerem,
       criamos novamente as letras
       da próxima tentativa.
    */

    const activeLetters =
        letters.filter(l => !l.collected);

    if (activeLetters.length === 0) {

        createLetters();

    }

}


/* =========================
   COLISÃO
========================= */

function checkCollisions() {

    const playerRect =
        player.getBoundingClientRect();

    letters.forEach(letter => {

        if (letter.collected)
            return;

        const letterRect =
            letter.element.getBoundingClientRect();


        /*
           Verifica se o personagem
           encostou na letra.
        */

        const collision =
            playerRect.left <
            letterRect.right &&

            playerRect.right >
            letterRect.left &&

            playerRect.top <
            letterRect.bottom &&

            playerRect.bottom >
            letterRect.top;


        if (collision) {

            collectLetter(letter);

        }

    });

}


/* =========================
   CAPTURAR LETRA
========================= */

function collectLetter(letter) {

    /*
       A letra precisa ser a próxima
       letra da palavra.
    */

    const expectedLetter =
        currentWord[currentLetterIndex];


    if (letter.letter === expectedLetter) {

        /*
           CORRETA
        */

        letter.collected = true;

        letter.element.remove();

        currentLetterIndex++;

        score += 100;

        scoreDisplay.textContent =
            score;


        /*
           Preenche a letra no topo.
        */

        const wordLetters =
            document.querySelectorAll(
                ".word-letter"
            );

        wordLetters[
            currentLetterIndex - 1
        ].classList.remove("empty");


        /*
           Pronuncia a letra.
        */

        speakLetter(letter.letter);


        /*
           Verifica se a palavra terminou.
        */

        if (
            currentLetterIndex >=
            currentWord.length
        ) {

            finishWord();

        } else {

            /*
               Cria novamente as letras
               para procurar a próxima.
            */

            setTimeout(() => {

                createLetters();

            }, 250);

        }

    } else {

        /*
           LETRA ERRADA

           Por enquanto não perde pontos.
           Apenas mostra uma pequena reação.
        */

        letter.element.style.borderColor =
            "#e53935";

        letter.element.style.transform =
            "scale(1.2)";

        setTimeout(() => {

            if (!letter.collected) {

                letter.element.style.borderColor =
                    "#1976d2";

                letter.element.style.transform =
                    "scale(1)";

            }

        }, 250);

    }

}


/* =========================
   TERMINAR PALAVRA
========================= */

function finishWord() {

    message.textContent =
        currentWord;

    speakWord(currentWord);

    setTimeout(() => {

        message.textContent = "";

        startNewWord();

    }, 1800);

}


/* =========================
   VOZ
========================= */

function speakLetter(letter) {

    if (!("speechSynthesis" in window))
        return;

    const speech =
        new SpeechSynthesisUtterance(letter);

    speech.lang = "en-US";

    speech.rate = 0.75;

    speech.pitch = 1.1;

    window.speechSynthesis.cancel();

    window.speechSynthesis.speak(speech);

}


function speakWord(word) {

    if (!("speechSynthesis" in window))
        return;

    const speech =
        new SpeechSynthesisUtterance(word);

    speech.lang = "en-US";

    speech.rate = 0.75;

    speech.pitch = 1.05;

    window.speechSynthesis.cancel();

    window.speechSynthesis.speak(speech);

}
