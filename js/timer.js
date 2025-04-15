// Study timer functionality
function setupStudyTimer() {
    const timerDisplay = document.getElementById('timer-display');
    const startTimerBtn = document.getElementById('start-timer');
    const resetTimerBtn = document.getElementById('reset-timer');
    const pomodoroBtn = document.getElementById('pomodoro-btn');
    const shortBreakBtn = document.getElementById('short-break-btn');
    const longBreakBtn = document.getElementById('long-break-btn');
    
    if (!timerDisplay || !startTimerBtn || !resetTimerBtn) return;
    
    let timer;
    let timeLeft = 25 * 60; // 25 minutes in seconds
    let isRunning = false;
    let timerMode = 'pomodoro';
    
    // Update timer display
    function updateTimerDisplay() {
        const minutes = Math.floor(timeLeft / 60);
        const seconds = timeLeft % 60;
        timerDisplay.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    
    // Start/pause timer
    startTimerBtn.addEventListener('click', () => {
        if (isRunning) {
            clearInterval(timer);
            startTimerBtn.innerHTML = '<i class="fas fa-play"></i> Start';
            isRunning = false;
        } else {
            timer = setInterval(() => {
                if (timeLeft > 0) {
                    timeLeft--;
                    updateTimerDisplay();
                } else {
                    clearInterval(timer);
                    isRunning = false;
                    startTimerBtn.innerHTML = '<i class="fas fa-play"></i> Start';
                    
                    // Play sound and show notification
                    playTimerEndSound();
                    showTimerNotification();
                    
                    // Log study session to Firebase
                    logStudySession(timerMode);
                }
            }, 1000);
            
            startTimerBtn.innerHTML = '<i class="fas fa-pause"></i> Pause';
            isRunning = true;
        }
    });
    
    // Reset timer
    resetTimerBtn.addEventListener('click', () => {
        clearInterval(timer);
        setTimerMode(timerMode);
        startTimerBtn.innerHTML = '<i class="fas fa-play"></i> Start';
        isRunning = false;
    });
    
    // Set timer mode
    function setTimerMode(mode) {
        timerMode = mode;
        
        // Remove active class from all mode buttons
        pomodoroBtn.classList.remove('active');
        shortBreakBtn.classList.remove('active');
        longBreakBtn.classList.remove('active');
        
        // Set time based on mode
        switch (mode) {
            case 'pomodoro':
                timeLeft = 25 * 60; // 25 minutes
                pomodoroBtn.classList.add('active');
                break;
            case 'shortBreak':
                timeLeft = 5 * 60; // 5 minutes
                shortBreakBtn.classList.add('active');
                break;
            case 'longBreak':
                timeLeft = 15 * 60; // 15 minutes
                longBreakBtn.classList.add('active');
                break;
        }
        
        updateTimerDisplay();
    }
    
    // Add event listeners to mode buttons
    pomodoroBtn.addEventListener('click', () => setTimerMode('pomodoro'));
    shortBreakBtn.addEventListener('click', () => setTimerMode('shortBreak'));
    longBreakBtn.addEventListener('click', () => setTimerMode('longBreak'));
    
    // Play sound when timer ends
    function playTimerEndSound() {
        const audio = new Audio('https://assets.mixkit.co/sfx/preview/mixkit-alarm-digital-clock-beep-989.mp3');
        audio.play().catch(error => console.log('Error playing sound:', error));
    }
    
    // Show notification when timer ends
    function showTimerNotification() {
        let message;
        
        switch (timerMode) {
            case 'pomodoro':
                message = 'Pomodoro session completed! Take a break.';
                break;
            case 'shortBreak':
                message = 'Short break completed! Ready to focus again?';
                break;
            case 'longBreak':
                message = 'Long break completed! Ready for a new session?';
                break;
        }
        
        showNotification('Timer Completed', message, 'info');
    }
    
    // Log study session to Firebase
    function logStudySession(mode) {
        // This would log to Firebase in a real app
        // For this demo, we'll just log to console
        console.log(`Study session logged: ${mode}`);
    }
    
    // Initialize timer display
    updateTimerDisplay();
    pomodoroBtn.classList.add('active');
}

function showNotification(title, message, type) {
    // This function is defined in app.js, but we need a reference here
    // In a real app, this would be properly imported
    const event = new CustomEvent('showNotification', { 
        detail: { title, message, type } 
    });
    document.dispatchEvent(event);
}

export { setupStudyTimer };