let currentMode = "start";
let timerRunning = false;
let started = false;
let poseSequence = [
    { name: "tpose", label: "T-POSE" },
    { name: "handenopheofd", label: "HANDEN OP HOOFD" },
    { name: "mrkrab", label: "MR. KRAB" },
    { name: "armenomhoog", label: "ARMEN OMHOOG" },
    { name: "ballerina", label: "BALLERINA" }
];
let currentPoseIndex = 0;

const poseClassMap = {
    tpose: "T-pose",
    handenopheofd: "Handen-op-hoofd",
    mrkrab: "Mr-krab",
    armenohoog: "Armen-omhoog",
    ballerina: "Ballerina"
};

// algemene scherm om andere schermen aan te roepen
function currentScreen(id) {
    document.querySelectorAll(".screen").forEach((e) => {
        e.style.display = "none";
    });

    document.querySelector("#" + id).style.display = "grid";
}

// startscherm
function startScreen() {
    currentMode = "start";
    started = false; // Reset so the game can start again
    currentScreen("start");
    moveWebcamTo("cam-start");
}

// spelschermen
function gameScreen(reset = false) {
    currentMode = "spel";
    currentScreen("spel");
    moveWebcamTo("cam-spel");

    if (reset) {
        currentPoseIndex = 0;
    }

    updatePoseCard();
}

function updatePoseCard() {
    // Update the pose card in the spel screen to show the current pose
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
            } else if (pose.name === 'handenopheofd') {
                desc = 'Beide handen op je hoofd';
                imgSrc = 'images/poses_handsonhead.svg';
            } else if (pose.name === 'mrkrab') {
                desc = 'Handen in een krabvorm naast je hoofd';
                imgSrc = 'images/poses_mrkrab.svg';
            } else if (pose.name === 'armenomhoog') {
                desc = 'Beide armen omhoog gestrekt';
                imgSrc = 'images/poses_armenomhoog.svg';
            } else if (pose.name === 'ballerina') {
                desc = 'Sta rechtop met één been omhoog en armen rond';
                imgSrc = 'images/poses_ballerina.svg';
            }
        }
        poseCardDesc.textContent = desc;
        poseCardImg.src = imgSrc;
        poseCardImg.alt = pose ? pose.label : '';
    }
}

// freeze scherm
function freezeScreen() {
    currentMode = "freeze";
    currentScreen("freeze");
    moveWebcamTo("cam-freeze");
}

// game over scherm test
function gameoverScreen() {
    currentMode = "gameover";
    currentScreen("gameover");
    moveWebcamTo("cam-gameover");
}

startScreen();


function moveWebcamTo(slotId) {
    const slot = document.getElementById(slotId);
    const webcam = document.getElementById("webcam-component");

    if (slot && webcam) {
        slot.innerHTML = "";
        slot.appendChild(webcam);
        webcam.style.display = "block";
    }
}


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
    const sizeX = 400;
    const sizeY = 400;
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
    webcam.update(); // update the webcam frame
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


// detecties

function detectStart(prediction) {
    const pose = prediction.find(p => p.className === "Armen-omhoog");
    let score = 0;
    if (pose) {
        score = pose.probability;
    }
    // Show countdown only when pose is detected and not started yet
    if (score > 0.9 && !started) {
        started = true;
        // Start a 3-second countdown (matching the UI text) before starting the game
        startPoseTimer("start", 3, () => gameScreen());
    }
    // If pose is not detected or timer not running, reset countdown to 3
    if (!timerRunning && !started) {
        showCountdownInDesign(3);
    }
}


function detectSpel(prediction) {
    const currentPose = poseSequence[currentPoseIndex];
    if (!currentPose) return;

    const className = poseClassMap[currentPose.name] || currentPose.name;

    const poseDetected = prediction.find(p => p.className === className);

    if (poseDetected && poseDetected.probability > 0.90) {

        const poseCard = document.querySelector('#spel .pose-card');
        if (poseCard) {
            poseCard.style.transition = 'background 0.3s';
            poseCard.style.background = '#b6fcb6';
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
    if (poseDetected && poseDetected.probability > 0.90) {
        startPoseTimer("freeze", 5, () => {
            currentPoseIndex++;
            if (currentPoseIndex < poseSequence.length) {
                gameScreen(); // GEEN reset!
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
    if (pose4 && pose4.probability > 0.90) {
        startPoseTimer("gameover", 5, () => startScreen());
    }
}

    // Helper to find the visible countdown element in the design
    function getVisibleCountdownElement() {
        // Try .freeze-countdown first (freeze screen), then .centerpanel .countdown (spel/start), fallback to any visible .countdown
        let el = document.querySelector('.screen[style*="display: grid"] .freeze-countdown');
        if (!el) {
            el = document.querySelector('.screen[style*="display: grid"] .centerpanel .countdown');
        }
        if (!el) {
            // fallback: any visible .countdown in a visible .screen
            el = Array.from(document.querySelectorAll('.screen')).find(s => s.style.display !== 'none')?.querySelector('.countdown');
        }
        return el;
    }

    function showCountdownInDesign(seconds) {
        const el = getVisibleCountdownElement();
        if (el) {
            el.style.visibility = 'visible';
            el.innerHTML = `<div class="countdown-line"></div>${seconds}<div class="countdown-line"></div>`;
        }
    }

    function updateCountdownInDesign(seconds) {
        const el = getVisibleCountdownElement();
        if (el) {
            el.innerHTML = `<div class="countdown-line"></div>${seconds}<div class="countdown-line"></div>`;
        }
    }

    function hideCountdownInDesign() {
        const el = getVisibleCountdownElement();
        if (el) {
            el.style.visibility = 'hidden';
        }
    }

    function startPoseTimer(mode, seconds, callback) {
        if (timerRunning) return;
        if (currentMode !== mode) return;

        timerRunning = true;
        let timeLeft = seconds;
        showCountdownInDesign(timeLeft);
        // Disable all .schermbutton buttons during countdown
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
                // Re-enable schermbutton buttons after transition
                setTimeout(() => {
                    schermButtons.forEach(btn => btn.disabled = false);
                }, 600);
                // Smooth transition: fade out overlay, then call callback
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