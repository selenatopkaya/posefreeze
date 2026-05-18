let currentMode = "start";
let timerRunning = false;
let started = false;
let currentPoseIndex = 0;
let currentScore = 0;

let poseSequence = [
    { name: "tpose", label: "T-POSE" },
    { name: "handenophoofd", label: "HANDEN OP HOOFD" },
    { name: "mrkrab", label: "MR. KRAB" },
    { name: "armenomhoog", label: "ARMEN OMHOOG" },
    { name: "sporter", label: "SPORTER" }
];

// Map met classNames uit Teachable Machine
const poseClassMap = {
    tpose: "T-pose",
    handenophoofd: "Handen-op-hoofd",
    mrkrab: "Mr-krab",
    armenomhoog: "Armen-omhoog",
    sporter: "Sporter"
};

// RESET GAME STATUS

function resetGameState() {
    currentPoseIndex = 0;
    currentScore = 0;
    timerRunning = false;
    started = false;
    hideCountdownInDesign();
}

// SCORES

function getScores() {
    return JSON.parse(localStorage.getItem("posefreeze") || "[]");
}

function saveScore(score) {
    const name = document.getElementById("player-name-input").value.trim() || "Speler";
    
    const allScores = [...getScores(), { name, score }];
    const sortedScores = allScores.sort((a, b) => b.score - a.score);
    const top3 = sortedScores.slice(0, 3);

    localStorage.setItem("posefreeze", JSON.stringify(top3));
}

function renderLeaderboard(id) {
    document.getElementById(id).innerHTML = getScores()
        .map((e, i) => `<li class="players">
            <span class="player-number">${i + 1}</span>
            <span class="player-name">${e.name}</span>
            <span class="player-score">${e.score}</span>
        </li>`).join("") || "<li>Nog geen scores</li>";
}


// SCHERMEN 

// algemene scherm om andere schermen aan te roepen
function currentScreen(id) {
    document.querySelectorAll(".screen").forEach((e) => {
        e.style.display = "none";
    });

    const displays = document.querySelector(`#${id}`);
    if (id === "freeze") {
        displays.style.display = "flex";
    } else {
        displays.style.display = "grid";
    }
}

// startscherm
function startScreen() {
    resetGameState();
    currentMode = "start";
    currentScreen("start");
    moveWebcamTo("cam-start"); // webcam naar start scherm verplaatsen
    renderLeaderboard("leaderboard-start");
}

// spelschermen
function gameScreen(reset = false) {
    currentMode = "spel";
    currentScreen("spel");
    moveWebcamTo("cam-spel"); // webcam naar spel scherm verplaatsen

    if (reset) {
        currentPoseIndex = 0;
    }

    updatePoseCard();
}

// freeze scherm
function freezeScreen() {
    currentMode = "freeze";
    currentScreen("freeze");
    moveWebcamTo("cam-freeze"); // webcam naar freeze scherm verplaatsen
}

// game over scherm test
function gameoverScreen() {
    currentMode = "gameover";
    currentScreen("gameover");
    moveWebcamTo("cam-gameover"); // webcam naar gameover scherm verplaatsen
    saveScore(currentScore);
    renderLeaderboard("leaderboard-gameover");
    startPoseTimer("gameover", 5, () => startScreen());
}

startScreen();

// WEBCAM

// functie om webcam naar juiste scherm te verplaatsen
function moveWebcamTo(slotId) {
    const slot = document.getElementById(slotId);
    const webcamComponent = document.getElementById("webcam-component");

    if (slot && webcamComponent) {
        if (!slot.contains(webcamComponent)) {
            slot.innerHTML = "";
            slot.appendChild(webcamComponent);
        }
        webcamComponent.style.display = "block";
    }
}


//POSE KAART & DETECTIE

function updatePoseCard() {
    // Update de pose card in het spelscherm met de huidige pose info
    const poseCardName = document.querySelector('#spel .pose-card-name');
    const poseCardDesc = document.querySelector('#spel .pose-card-desc');
    const poseCardImg = document.querySelector('#spel .pose-card img');

    if (poseCardName && poseCardDesc && poseCardImg) {
        const pose = poseSequence[currentPoseIndex];
        poseCardName.textContent = pose ? pose.label : '';

        let desc = '';
        let imgSrc = '';

        if (pose) {
            if (pose.name === 'tpose') {
                desc = 'Armen recht opzij uitgestrekt';
                imgSrc = 'images/poses_tpose.svg';

            } else if (pose.name === 'handenophoofd') {
                desc = 'Beide handen op je hoofd';
                imgSrc = 'images/poses_handsonhead.svg';

            } else if (pose.name === 'mrkrab') {
                desc = 'Handen en benen in een krabvorm naast je hoofd';
                imgSrc = 'images/poses_mrkrab.svg';

            } else if (pose.name === 'armenomhoog') {
                desc = 'Beide armen omhoog gestrekt';
                imgSrc = 'images/poses_armenomhoog.svg';

            } else if (pose.name === 'sporter') {
                desc = 'Een sporter pose';
                imgSrc = 'images/poses_sporter.svg';
            }
        }

        poseCardDesc.textContent = desc;
        poseCardImg.src = imgSrc;
        poseCardImg.alt = pose ? pose.label : '';
    }

    // Zet actieve class op het juiste voortgang item
    document.querySelectorAll('.voortgang-item').forEach((item, i) => {
        item.classList.toggle('active', i === currentPoseIndex);
        item.querySelector('.poses-arrow').textContent = i === currentPoseIndex ? '▶' : '';
    });
}


// TEACHABLE MACHINE

// the link to your model provided by Teachable Machine export panel
const URL = "./my_model/";
let model, webcam, ctx, labelContainer, maxPredictions;

async function init() {
    const modelURL = URL + "model.json";
    const metadataURL = URL + "metadata.json";

    // load the model and metadata
    // Refer to tmImage.loadFromFiles() in the API to support files from a file picker
    // Note: the pose library adds a tmPose object to your window (window.tmPose)
    model = await tmPose.load(modelURL, metadataURL);
    maxPredictions = model.getTotalClasses();

    // Convenience function to setup a webcam
    const sizeX = 460;
    const sizeY = 460;
    const flip = true; // whether to flip the webcam
    webcam = new tmPose.Webcam(sizeX, sizeY, flip); // width, height, flip
    await webcam.setup(); // request access to the webcam
    await webcam.play();
    window.requestAnimationFrame(loop);

    // append/get elements to the DOM
    const canvas = document.getElementById("canvas");
    canvas.width = sizeX; canvas.height = sizeY;
    ctx = canvas.getContext("2d");
    labelContainer = document.getElementById("label-container");
    for (let i = 0; i < maxPredictions; i++) { // and class labels
        labelContainer.appendChild(document.createElement("div"));
    }
}

async function loop(timestamp) {
    webcam.update(); // update de webcam frame
    await predict();
    window.requestAnimationFrame(loop);
}

// all predicts
async function predict() {
    const { pose, posenetOutput } = await model.estimatePose(webcam.canvas);
    const prediction = await model.predict(posenetOutput);

    // labels updaten
    for (let i = 0; i < maxPredictions; i++) {
        const classPrediction =
            prediction[i].className + ": " + prediction[i].probability.toFixed(2);
        labelContainer.childNodes[i].innerHTML = classPrediction;
    }

    // per scherm detectie
    if (currentMode === "start") detectStart(prediction);
    if (currentMode === "spel") detectSpel(prediction);
    if (currentMode === "freeze") detectFreeze(prediction);
    if (currentMode === "gameover") detectGameover(prediction);

    drawPose(pose);

    updateDetectBar(prediction);
}

function drawPose(pose) {
    if (webcam.canvas) {
        ctx.drawImage(webcam.canvas, 0, 0);
        // draw the keypoints and skeleton
        if (pose) {
            const minPartConfidence = 0.5;
            tmPose.drawKeypoints(pose.keypoints, minPartConfidence, ctx);
            tmPose.drawSkeleton(pose.keypoints, minPartConfidence, ctx);
        }
    }
}


// DETECTIE BALKJES

function updateDetectBar(prediction) {
    let targetClass = null;

    if (currentMode === "start") {
        targetClass = "Armen-omhoog";
    } else if (currentMode === "spel" || currentMode === "freeze") {
        const currentPose = poseSequence[currentPoseIndex];
        if (currentPose) targetClass = poseClassMap[currentPose.name] || currentPose.name;
    }

    if (!targetClass) return;

    const match = prediction.find(p => p.className === targetClass);
    const score = match ? match.probability : 0;

    // Alle balkjes op het huidige scherm updaten
    document.querySelectorAll(".detect-fill").forEach(bar => {
        bar.style.width = (score * 100) + "%";
    });
}


// DETECTIE PER SCHERM

function detectStart(prediction) {
    const pose = prediction.find(p => p.className === "Armen-omhoog");
    let score = 0;

    if (pose) {
        score = pose.probability;
    }

    // Als pose correct is, start countdown
    if (score > 0.7 && !started) {
        started = true;

        // Start een countdown van 3 seconden voordat je naar het spel gaat
        startPoseTimer("start", 3, () => gameScreen());
    }

    // Als pose niet correct is en timer nog niet gestart, toon countdown in design
    if (!timerRunning && !started) {
        showCountdownInDesign(3);
    }
}


function detectSpel(prediction) {
    const currentPose = poseSequence[currentPoseIndex];
    if (!currentPose) return;

    const className = poseClassMap[currentPose.name] || currentPose.name;
    const poseDetected = prediction.find(p => p.className === className);

    if (poseDetected && poseDetected.probability > 0.70) {

        const poseCard = document.querySelector('#spel .pose-card');
        if (poseCard) {
            poseCard.style.transition = 'background 0.3s';
            poseCard.style.background = '#8bc58b';
        }

        // Timer direct starten
        startPoseTimer("spel", 5, () => {
            freezeScreen(); // eerst naar freeze
        });

        setTimeout(() => {
            if (poseCard) poseCard.style.background = '';
        }, 1200);
    }
}


function detectFreeze(prediction) {
    const currentPose = poseSequence[currentPoseIndex];
    if (!currentPose) return;

    const className = poseClassMap[currentPose.name] || currentPose.name;
    const poseDetected = prediction.find(p => p.className === className);

    // Als pose correct is → timer starten
    if (poseDetected && poseDetected.probability > 0.70) {
        startPoseTimer("freeze", 5, () => {
            currentScore += 100; // 100 punten als je de pose correct hebt
            currentPoseIndex++;

            // Na freeze scherm, direct naar volgende pose of game over
            if (currentPoseIndex < poseSequence.length) {
                gameScreen();
            } else {
                gameoverScreen();
            }
        });
    }

    // Als pose fout is → direct game over
    if (poseDetected && poseDetected.probability < 0.50) {
        gameoverScreen();
    } 
}


function detectGameover(prediction) {
    const pose4 = prediction.find(p => p.className === "Armen-omhoog"); // alle poses nog ingeven
    if (pose4 && pose4.probability > 0.70) {
        startPoseTimer("gameover", 5, () => startScreen());
    }
}


// COUNTDOWN

// Helper to find the visible countdown element in the design
function getVisibleCountdownElement() {
    if (currentMode === "freeze") {
        return document.querySelector("#freeze .freeze-countdown");
    }
    if (currentMode === "spel" || currentMode === "start") {
        return document.querySelector(".screen:not([style*='display: none']) .countdown");
    }
    return null;
}

function showCountdownInDesign(seconds) {
    const el = getVisibleCountdownElement();

    if (el) {
        el.style.visibility = 'visible';
        el.querySelector('.countdown-number').textContent = seconds;
    }
}

function updateCountdownInDesign(seconds) {
    const el = getVisibleCountdownElement();

    if (el) {
        el.querySelector('.countdown-number').textContent = seconds;
    }
}

function hideCountdownInDesign() {
    const el = getVisibleCountdownElement();

    if (el) el.style.visibility = 'hidden';
}

function startPoseTimer(mode, seconds, callback) {
    if (timerRunning) return;
    if (currentMode !== mode) return;

    timerRunning = true;
    let timeLeft = seconds;
    showCountdownInDesign(timeLeft);
    const schermButtons = document.querySelectorAll('.schermbutton');

    schermButtons.forEach(btn => btn.disabled = true);

    const interval = setInterval(() => {
        timeLeft--;

        if (timeLeft > 0) {
            updateCountdownInDesign(timeLeft);

        } else {
            clearInterval(interval);
            timerRunning = false;
            hideCountdownInDesign();

            // Voorkom dat gebruiker direct weer pose kan doen tijdens schermovergang
            setTimeout(() => {
                schermButtons.forEach(btn => btn.disabled = false);
            }, 600);

            // Voorkom dat callback direct pose detectie triggert tijdens schermovergang
            setTimeout(() => {
                callback();
            }, 500);
        }

        if (currentMode !== mode) {
            clearInterval(interval);
            timerRunning = false;
            hideCountdownInDesign();
            schermButtons.forEach(btn => btn.disabled = false);
        }
    }, 1000);
}