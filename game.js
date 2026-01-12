const helper = document.getElementById('helper');
const animatedHelper = document.getElementById('animated-helper');
const thief = document.getElementById('thief');
const keyImg = document.getElementById('key');
const diamondCounter = document.getElementById('diamond-counter');
const keyCounter = document.getElementById('key-counter');
const keyIcon = document.getElementById('key-icon');
const scoreValue = document.getElementById('score-value');
const message = document.getElementById('message');
const box1 = document.getElementById('box1');
const vault = document.getElementById('vault');
const keyTimer = document.getElementById('key-timer');
const gameTimer = document.getElementById('game-timer');
const timerValue = document.getElementById('timer-value');
const fullAccessButton = document.querySelector('#controls button[onclick="giveKey(\'full\')"]');
const justInTimeButton = document.querySelector('#controls button[onclick="giveKey(5)"]');

let diamonds = 0;
let keysSaved = 0;
let score = 0;
let keyInUse = false;
let keyCollected = false;
let currentKeyImage = 'assets/key.png'; // Store which key image to use for current key
let keyTimeoutInterval = null;
let thiefFlashInterval = null;
let gameTimerInterval = null;
let gameTimeLeft = 60;

/* Initial helper position */
const initialHelperLeft = helper.offsetLeft;
const initialHelperTop = helper.offsetTop;

/* Box position */
const boxPosition = {
    x: box1.offsetLeft,
    y: box1.offsetTop
};

function giveKey(accessType) {
    if (keyInUse) return;
    keyInUse = true;
    keyCollected = false;
    
    // Randomly choose which key image to use for this key instance (1/3 chance for each)
    const randomKey = Math.random();
    if (randomKey < 0.333) {
        currentKeyImage = 'assets/key.png';
    } else if (randomKey < 0.666) {
        currentKeyImage = 'assets/key2.png';
    } else {
        currentKeyImage = 'assets/key3.png';
    }
    keyImg.src = currentKeyImage;
    
    message.textContent = '';
    message.classList.remove('show-message');

    // Travel duration and key countdown
    let duration, countdownTime;
    switch (accessType) {
        case 'full': duration = 3; countdownTime = 1; break; // full access: 1s countdown, faster movement
        case 5: duration = 8; countdownTime = 3; break; // just in time: 8s travel, 3s countdown
        default: duration = 8; countdownTime = 3;
    }

    // Key loss probability — both options can lose the key
    let keyLossProbability = 0;
    if (accessType === 'full') keyLossProbability = 0.65;
    if (accessType === 5) keyLossProbability = 0.65;

    // Calculate target position for the box (stop 150px earlier to avoid being too close to right edge)
    const helperTargetX = boxPosition.x + box1.offsetWidth / 2 - animatedHelper.offsetWidth / 2 - 150;
    const helperTargetY = boxPosition.y + 30;

    // Hide static helper, show animated helper when moving
    // Set animated helper to start at its designated initial position
    helper.style.display = 'none';
    animatedHelper.style.display = 'block';
    animatedHelper.style.transition = 'none'; // No transition for initial positioning
    
    // Use requestAnimationFrame to ensure position is set after display change
    requestAnimationFrame(() => {
        animatedHelper.style.left = '233px'; // Animated helper's initial position (233px from left)
        animatedHelper.style.top = '325px'; // Animated helper's initial position (325px from top)
        
        // After setting initial position, enable transition and move to target
        requestAnimationFrame(() => {
            animatedHelper.style.transition = `all ${duration}s linear`;
            animatedHelper.style.left = helperTargetX + 'px';
            animatedHelper.style.top = helperTargetY + 'px';
        });
    });

    // Start footsteps sound
    const footstepsSound = document.getElementById('sound-footsteps');
    if (footstepsSound) {
        footstepsSound.currentTime = 0;
        footstepsSound.loop = true;
        footstepsSound.play().catch(err => {
            console.log('Footsteps sound failed:', err);
        });
    }

    if (Math.random() < keyLossProbability) {
        const dropTime = Math.random() * 0.6 + 0.2;
        setTimeout(dropKey, dropTime * duration * 1000, countdownTime);
    } else {
        setTimeout(() => {
            // Stop footsteps sound
            if (footstepsSound) {
                footstepsSound.pause();
                footstepsSound.currentTime = 0;
            }
            // Hide animated helper, show static helper when stopped
            animatedHelper.style.display = 'none';
            helper.style.display = 'block';
            openBox();
            resetHelper();
            keyInUse = false;
        }, duration * 1000);
    }
}

/* Drop key */
function dropKey(countdownTime) {
    // Stop footsteps sound
    const footstepsSound = document.getElementById('sound-footsteps');
    if (footstepsSound) {
        footstepsSound.pause();
        footstepsSound.currentTime = 0;
    }
    
    // Play key falling sound
    const keySound = document.getElementById('sound-key');
    if (keySound) {
        keySound.currentTime = 0;
        keySound.play().catch(err => {
            console.log('Key sound failed:', err);
        });
    }
    
    // Play alarm sound
    const alarmSound = document.getElementById('sound-alarm');
    if (alarmSound) {
        alarmSound.currentTime = 0;
        alarmSound.loop = true;
        alarmSound.play().catch(err => {
            console.log('Alarm sound failed:', err);
        });
    }
    
    // Use whichever helper is currently visible
    const currentHelper = animatedHelper.style.display === 'block' ? animatedHelper : helper;
    const keyX = currentHelper.offsetLeft + currentHelper.offsetWidth / 2 - 40;
    const keyY = currentHelper.offsetTop + currentHelper.offsetHeight / 2;

    helper.style.display = 'none';
    animatedHelper.style.display = 'none';
    // Switch back to static image when key drops
    helper.src = 'assets/helper.png';

    // Use the key image that was chosen when the button was clicked
    keyImg.src = currentKeyImage;
    keyImg.style.left = keyX + 'px';
    keyImg.style.top = keyY + 'px';
    keyImg.style.display = 'block';
    keyImg.draggable = true;

    keyImg.addEventListener('dragstart', dragStart);

    /* Thief flashes in center of screen */
    thief.style.display = 'block';
    // Position thief 80px from the left of the screen, 45px down from center
    const gameContainer = document.getElementById('game-container');
    thief.style.left = '80px';
    thief.style.top = (gameContainer.offsetHeight / 2 - thief.offsetHeight / 2 + 45) + 'px';
    thiefFlashInterval = setInterval(() => {
        thief.style.visibility = thief.style.visibility === 'hidden' ? 'visible' : 'hidden';
    }, 500);

    /* Start countdown based on access type */
    let count = countdownTime;
    keyTimer.style.display = 'block';
    keyTimer.classList.add('show');
    keyTimer.textContent = count;
    keyTimeoutInterval = setInterval(() => {
        count--;
        if (count > 0) {
            // Add a quick scale animation when number changes
            keyTimer.style.transform = 'translate(-50%, -50%) scale(1.2)';
            setTimeout(() => {
                keyTimer.style.transform = 'translate(-50%, -50%) scale(1)';
            }, 150);
            keyTimer.textContent = count;
        } else {
            clearInterval(keyTimeoutInterval);
            clearInterval(thiefFlashInterval);
            // Stop alarm sound
            const alarmSound = document.getElementById('sound-alarm');
            if (alarmSound) {
                alarmSound.pause();
                alarmSound.currentTime = 0;
            }
            thief.style.display = 'none';
            keyImg.style.display = 'none';

            // Stop the main game timer immediately
            if (gameTimerInterval) {
                clearInterval(gameTimerInterval);
                gameTimerInterval = null;
            }
            
            // Stop heartbeat sound if playing
            const heartbeatSound = document.getElementById('sound-heartbeat');
            if (heartbeatSound) {
                heartbeatSound.pause();
                heartbeatSound.currentTime = 0;
            }
            
            // Stop background music
            const backgroundMusic = document.getElementById('sound-background-music');
            if (backgroundMusic) {
                backgroundMusic.pause();
                backgroundMusic.currentTime = 0;
            }
            
            // Show GAME OVER in counter
            keyTimer.textContent = 'GAME OVER';
            keyTimer.style.fontSize = '80px';
            
            // Play fail sound
            const failSound = document.getElementById('sound-fail');
            if (failSound) {
                failSound.currentTime = 0;
                failSound.play().catch(err => {
                    console.log('Fail sound failed:', err);
                });
            }

            // Hide counter and thief
            setTimeout(() => {
                keyTimer.style.display = 'none';
        keyTimer.classList.remove('show');
        keyTimer.style.fontSize = '';
        keyTimer.style.transform = '';
                keyTimer.classList.remove('show');
                keyTimer.style.fontSize = '';
                keyTimer.style.transform = '';
                thief.style.display = 'none';
            }, 1000);
            
            // Show game over popup immediately
            showGameOverPopup();
        }
    }, 1000);
}

/* Drag start */
function dragStart(e) {
    e.dataTransfer.setData('text/plain', '');
}

function allowDrop(e) {
    e.preventDefault();
}

function dropKeyOnVault(e) {
    e.preventDefault();
    if (!keyImg.style.display || keyImg.style.display === 'none') return;

    // Get the vault element that received the drop
    const targetVault = e.currentTarget;
    const vaultId = targetVault.id;
    
    // Check if the key matches the vault
    // key.png (gold) -> vault.png (#vault)
    // key2.png (green) -> greenVault.png (#green-vault)
    // key3.png (red) -> redVault.png (#red-vault)
    let keyMatchesVault = false;
    
    if (currentKeyImage === 'assets/key.png' && vaultId === 'vault') {
        keyMatchesVault = true;
    } else if (currentKeyImage === 'assets/key2.png' && vaultId === 'green-vault') {
        keyMatchesVault = true;
    } else if (currentKeyImage === 'assets/key3.png' && vaultId === 'red-vault') {
        keyMatchesVault = true;
    }
    
    // If key doesn't match vault, show error animation
    if (!keyMatchesVault) {
        // Trigger wrong vault animation
        targetVault.classList.add('vault-wrong');
        setTimeout(() => {
            targetVault.classList.remove('vault-wrong');
        }, 600);
        return;
    }

    // Trigger vault animation
    targetVault.classList.add('vault-pulse');
    setTimeout(() => {
        targetVault.classList.remove('vault-pulse');
    }, 800);

    keyCollected = true;
    clearInterval(keyTimeoutInterval);
    clearInterval(thiefFlashInterval);
    // Stop alarm sound
    const alarmSound = document.getElementById('sound-alarm');
    if (alarmSound) {
        alarmSound.pause();
        alarmSound.currentTime = 0;
    }
    // Play key saved sound
    const keySavedSound = document.getElementById('sound-key-saved');
    if (keySavedSound) {
        keySavedSound.currentTime = 0;
        keySavedSound.play().catch(err => {
            console.log('Key saved sound failed:', err);
        });
    }
    // Get current key position
    const keyStartX = keyImg.offsetLeft;
    const keyStartY = keyImg.offsetTop;
    
    // Get target position (key icon in top bar)
    const keyIconRect = keyIcon.getBoundingClientRect();
    const gameContainer = document.getElementById('game-container');
    const containerRect = gameContainer.getBoundingClientRect();
    const targetX = keyIconRect.left - containerRect.left + keyIconRect.width / 2 - keyImg.offsetWidth / 2;
    const targetY = keyIconRect.top - containerRect.top + keyIconRect.height / 2 - keyImg.offsetHeight / 2;
    
    // Ensure we're using the correct key image
    keyImg.src = currentKeyImage;
    
    // Hide key initially, then show and animate
    keyImg.style.display = 'block';
    keyImg.style.left = keyStartX + 'px';
    keyImg.style.top = keyStartY + 'px';
    keyImg.style.transition = 'none';
    keyImg.style.zIndex = '100';
    
    // Force reflow
    keyImg.offsetHeight;
    
    // Animate key to icon
    keyImg.style.transition = 'all 0.8s cubic-bezier(0.4, 0, 0.2, 1)';
    keyImg.style.left = targetX + 'px';
    keyImg.style.top = targetY + 'px';
    keyImg.style.transform = 'scale(0.3)';
    keyImg.style.opacity = '0.8';
    
    // After animation completes, increment counter and hide key
    setTimeout(() => {
        keysSaved++;
        keyCounter.textContent = keysSaved;
        
        // Update score based on key type
        if (currentKeyImage === 'assets/key.png') {
            // Gold key = 60 points
            score += 60;
        } else if (currentKeyImage === 'assets/key2.png') {
            // Green key = 10 points
            score += 10;
        } else if (currentKeyImage === 'assets/key3.png') {
            // Red key = 30 points
            score += 30;
        }
        updateScore();
        
        // Add a small bounce animation to the counter
        keyCounter.style.transform = 'scale(1.3)';
        keyCounter.style.transition = 'transform 0.2s ease-out';
        setTimeout(() => {
            keyCounter.style.transform = 'scale(1)';
        }, 100);
        
        keyImg.style.display = 'none';
        keyImg.style.transform = 'scale(1)';
        keyImg.style.opacity = '1';
        keyImg.style.zIndex = '50';
        keyImg.style.transition = 'none';
        
        keyTimer.style.display = 'none';
        keyTimer.classList.remove('show');
        keyTimer.style.fontSize = '';
        keyTimer.style.transform = '';
        thief.style.display = 'none';
        showMessage('Key returned safely!');
        resetHelper();
        keyInUse = false;
    }, 800);
}

/* Show animated message */
function showMessage(text) {
    message.textContent = text;
    message.classList.add('show-message');
    setTimeout(() => {
        message.classList.remove('show-message');
    }, 1500);
}

/* Open box and animate diamond */
function openBox() {
    // Play box opening sound
    const boxOpenSound = document.getElementById('sound-box-open');
    if (boxOpenSound) {
        boxOpenSound.currentTime = 0;
        boxOpenSound.play().catch(err => {
            // Silently fail if audio can't play
            console.log('Box open sound failed:', err);
        });
    }
    
    box1.src = 'assets/boxOpen.png';
    box1.style.boxShadow = '0 10px 20px rgba(0,0,0,0.5)'; // add shadow under box

    const diamond = document.createElement('img');
    diamond.src = 'assets/diamond.png';
    diamond.style.position = 'absolute';
    
    // Start position at box
    const startX = boxPosition.x + 53;
    const startY = boxPosition.y - 53;
    diamond.style.left = startX + 'px';
    diamond.style.top = startY + 'px';
    diamond.style.width = '53px';
    diamond.style.zIndex = 30;
    diamond.style.transformOrigin = 'center center';
    diamond.style.transform = 'scale(0)';
    diamond.style.opacity = '0';

    document.getElementById('game-container').appendChild(diamond);

    // Get target position (diamond icon in top bar)
    const diamondIcon = document.getElementById('diamond-icon');
    const targetX = diamondIcon.offsetLeft + diamondIcon.offsetWidth / 2 - 26.5; // center of icon, minus half diamond width
    const targetY = diamondIcon.offsetTop + diamondIcon.offsetHeight / 2 - 26.5;

    // Calculate distance for animation
    const deltaX = targetX - startX;
    const deltaY = targetY - startY;

    // Force reflow to ensure initial state is applied
    diamond.offsetHeight;

    // Start animation: grow first, then move
    requestAnimationFrame(() => {
        diamond.style.transition = 'transform 0.2s ease-out, opacity 0.2s ease-out';
        diamond.style.transform = 'scale(1.3)';
        diamond.style.opacity = '1';
        
        // After grow, move to counter
        setTimeout(() => {
            diamond.style.transition = 'transform 0.8s ease-in, opacity 0.8s ease-in';
            diamond.style.transform = `translate(${deltaX}px, ${deltaY}px) scale(0.8)`;
            diamond.style.opacity = '0.8';
        }, 200);
    });

    // Update counter after animation completes
    setTimeout(() => {
        diamonds++;
        diamondCounter.textContent = diamonds;
        
        // Update score (100 points per diamond)
        score += 100;
        updateScore();
        diamond.remove();
        box1.src = 'assets/box.png';
        box1.style.boxShadow = ''; // remove shadow
    }, 1000);
}

function resetHelper() {
    // Stop footsteps sound if playing
    const footstepsSound = document.getElementById('sound-footsteps');
    if (footstepsSound) {
        footstepsSound.pause();
        footstepsSound.currentTime = 0;
    }
    // Hide animated helper, show static helper when reset
    animatedHelper.style.display = 'none';
    animatedHelper.style.transition = 'none'; // Reset transition
    animatedHelper.style.left = '383px'; // Animated helper's initial position (383px from left)
    animatedHelper.style.top = '325px'; // Animated helper's initial position (325px from top)
    helper.style.transition = 'all 0.5s linear';
    helper.style.left = initialHelperLeft + 'px';
    helper.style.top = initialHelperTop + 'px';
    helper.style.display = 'block';
}

/* Game Timer Functions */
function startGameTimer() {
    if (gameTimerInterval) {
        clearInterval(gameTimerInterval);
        gameTimerInterval = null;
    }
    
    // Stop heartbeat sound if playing
    const heartbeatSound = document.getElementById('sound-heartbeat');
    if (heartbeatSound) {
        heartbeatSound.pause();
        heartbeatSound.currentTime = 0;
    }
    
    // Stop background music if playing
    const backgroundMusic = document.getElementById('sound-background-music');
    if (backgroundMusic) {
        backgroundMusic.pause();
        backgroundMusic.currentTime = 0;
    }
    
    gameTimeLeft = 60;
    timerValue.textContent = gameTimeLeft;
    gameTimer.classList.remove('timer-warning', 'timer-critical', 'timer-expired');
    
    // Try to start background music immediately (will be 59 on first tick)
    if (backgroundMusic) {
        console.log('Background music element found, attempting to play...');
        backgroundMusic.loop = true;
        backgroundMusic.volume = 0.5; // Set volume to 50%
        // Try to play, but don't fail if autoplay is blocked
        backgroundMusic.play().then(() => {
            console.log('Background music started successfully');
        }).catch(err => {
            console.log('Background music autoplay blocked, will try again on first tick:', err);
        });
    } else {
        console.error('Background music element not found!');
    }
    
    // Start the timer automatically
    gameTimerInterval = setInterval(() => {
        gameTimeLeft--;
        timerValue.textContent = gameTimeLeft;
        
        // Start background music when timer is between 59 and 1 (if not already playing)
        if (gameTimeLeft >= 1 && gameTimeLeft <= 59) {
            if (backgroundMusic && backgroundMusic.paused) {
                backgroundMusic.loop = true;
                backgroundMusic.volume = 0.5; // Set volume to 50%
                backgroundMusic.play().catch(err => {
                    console.error('Background music failed to play:', err);
                });
            }
        }
        
        // Add visual warnings as time runs out
        if (gameTimeLeft <= 10) {
            gameTimer.classList.add('timer-critical');
            gameTimer.classList.remove('timer-warning');
            
            // Play heartbeat sound when timer is below 10 seconds
            if (heartbeatSound && heartbeatSound.paused) {
                heartbeatSound.loop = true;
                heartbeatSound.play().catch(err => {
                    console.log('Heartbeat sound failed:', err);
                });
            }
        } else if (gameTimeLeft <= 20) {
            gameTimer.classList.add('timer-warning');
            gameTimer.classList.remove('timer-critical');
            
            // Stop heartbeat sound if it was playing
            if (heartbeatSound && !heartbeatSound.paused) {
                heartbeatSound.pause();
                heartbeatSound.currentTime = 0;
            }
        }
        
        if (gameTimeLeft <= 0) {
            clearInterval(gameTimerInterval);
            gameTimerInterval = null;
            
            // Stop heartbeat sound
            if (heartbeatSound) {
                heartbeatSound.pause();
                heartbeatSound.currentTime = 0;
            }
            
            // Stop background music
            const backgroundMusic = document.getElementById('sound-background-music');
            if (backgroundMusic) {
                backgroundMusic.pause();
                backgroundMusic.currentTime = 0;
            }
            
            // Show game over popup
            showGameOverPopup();
        }
    }, 1000);
}

function enableGameButtons() {
    if (fullAccessButton) {
        fullAccessButton.disabled = false;
        fullAccessButton.style.opacity = '1';
        fullAccessButton.style.cursor = 'pointer';
    }
    if (justInTimeButton) {
        justInTimeButton.disabled = false;
        justInTimeButton.style.opacity = '1';
        justInTimeButton.style.cursor = 'pointer';
    }
}

function disableGameButtons() {
    if (fullAccessButton) {
        fullAccessButton.disabled = true;
        fullAccessButton.style.opacity = '0.5';
        fullAccessButton.style.cursor = 'not-allowed';
    }
    if (justInTimeButton) {
        justInTimeButton.disabled = true;
        justInTimeButton.style.opacity = '0.5';
        justInTimeButton.style.cursor = 'not-allowed';
    }
}


function resetGameTimer() {
    if (gameTimerInterval) {
        clearInterval(gameTimerInterval);
        gameTimerInterval = null;
    }
    
    // Stop heartbeat sound
    const heartbeatSound = document.getElementById('sound-heartbeat');
    if (heartbeatSound) {
        heartbeatSound.pause();
        heartbeatSound.currentTime = 0;
    }
    
    // Stop background music
    const backgroundMusic = document.getElementById('sound-background-music');
    if (backgroundMusic) {
        backgroundMusic.pause();
        backgroundMusic.currentTime = 0;
    }
    
    startGameTimer();
}

function restartGame() {
    // Reset diamonds
    diamonds = 0;
    diamondCounter.textContent = diamonds;
    
    // Reset game timer
    resetGameTimer();
    
    // Reset helper
    resetHelper();
    
    // Clear any active intervals
    if (keyTimeoutInterval) {
        clearInterval(keyTimeoutInterval);
    }
    if (thiefFlashInterval) {
        clearInterval(thiefFlashInterval);
    }
    
    // Reset key state
    keyInUse = false;
    keyCollected = false;
    
    // Hide key and thief
    keyImg.style.display = 'none';
    thief.style.display = 'none';
    keyTimer.style.display = 'none';
    
    // Reset box
    box1.src = 'assets/box.png';
    box1.style.boxShadow = '';
    
    // Clear message
    message.textContent = '';
    message.classList.remove('show-message');
}

/* Update Score Display */
function updateScore() {
    if (scoreValue) {
        scoreValue.textContent = score;
        // Add animation class
        scoreValue.classList.add('score-update');
        setTimeout(() => {
            scoreValue.classList.remove('score-update');
        }, 300);
    }
}

/* Game Over Popup Functions */
function showGameOverPopup() {
    const popup = document.getElementById('game-over-popup');
    const scoreDisplay = document.getElementById('score-display');
    if (popup) {
        // Update score in popup
        if (scoreDisplay) {
            scoreDisplay.textContent = score;
        }
        popup.style.display = 'flex';
    }
}

function closePopup() {
    const popup = document.getElementById('game-over-popup');
    if (popup) {
        popup.style.display = 'none';
    }
}

function playAgain() {
    // Close popup
    closePopup();
    
    // Reset diamonds to 0
    diamonds = 0;
    diamondCounter.textContent = diamonds;
    
    // Reset keys saved to 0
    keysSaved = 0;
    keyCounter.textContent = keysSaved;
    
    // Reset score to 0
    score = 0;
    updateScore();
    
    // Reset helper
    resetHelper();
    
    // Reset key state
    keyInUse = false;
    keyCollected = false;
    
    // Hide key and thief
    keyImg.style.display = 'none';
    thief.style.display = 'none';
    keyTimer.style.display = 'none';
    
    // Reset box
    box1.src = 'assets/box.png';
    box1.style.boxShadow = '';
    
    // Clear message
    message.textContent = '';
    message.classList.remove('show-message');
    
    // Clear any active intervals
    if (keyTimeoutInterval) {
        clearInterval(keyTimeoutInterval);
        keyTimeoutInterval = null;
    }
    if (thiefFlashInterval) {
        clearInterval(thiefFlashInterval);
        thiefFlashInterval = null;
    }
    
    // Stop all sounds
    const footstepsSound = document.getElementById('sound-footsteps');
    if (footstepsSound) {
        footstepsSound.pause();
        footstepsSound.currentTime = 0;
    }
    const alarmSound = document.getElementById('sound-alarm');
    if (alarmSound) {
        alarmSound.pause();
        alarmSound.currentTime = 0;
    }
    const heartbeatSound = document.getElementById('sound-heartbeat');
    if (heartbeatSound) {
        heartbeatSound.pause();
        heartbeatSound.currentTime = 0;
    }
    
    // Restart game timer
    startGameTimer();
}

// Initialize and start timer when page loads
// Wait for DOM to be fully loaded before accessing audio elements
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        startGameTimer();
        enableGameButtons();
    });
} else {
    // DOM is already loaded
    startGameTimer();
    enableGameButtons();
}
