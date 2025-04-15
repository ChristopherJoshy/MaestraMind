const DEFAULT_SETTINGS = {
    pomodoro: 25 * 60,
    shortBreak: 5 * 60,
    longBreak: 15 * 60,
    longBreakInterval: 4,
    autoStartBreaks: false,
    autoStartPomodoros: false,
    volume: 50
};

const TIMER_STATES = {
    POMODORO: 'pomodoro',
    SHORT_BREAK: 'shortBreak',
    LONG_BREAK: 'longBreak'
};

export class StudyTimer {
    constructor() {
        this.settings = { ...DEFAULT_SETTINGS };
        this.timeLeft = this.settings.pomodoro;
        this.isRunning = false;
        this.timerInterval = null;
        this.currentState = TIMER_STATES.POMODORO;
        this.completedPomodoros = 0;
        this.startTime = null;
        this.elapsedTime = 0;
        this.listeners = {
            onTick: [],
            onComplete: [],
            onStateChange: [],
            onStart: [],
            onPause: [],
            onReset: []
        };
        
        this.loadSettings();
    }
    
    loadSettings() {
        const savedSettings = localStorage.getItem('timerSettings');
        if (savedSettings) {
            try {
                const parsedSettings = JSON.parse(savedSettings);
                this.settings = { ...DEFAULT_SETTINGS, ...parsedSettings };
            } catch (e) {
                console.error('Error parsing timer settings:', e);
            }
        }
    }
    
    saveSettings() {
        localStorage.setItem('timerSettings', JSON.stringify(this.settings));
    }
    
    updateSettings(newSettings) {
        this.settings = { ...this.settings, ...newSettings };
        this.saveSettings();
        
        if (!this.isRunning) {
            this.timeLeft = this.settings[this.currentState];
            this.notifyListeners('onTick');
        }
    }
    
    start() {
        if (this.isRunning) return;
        
        this.isRunning = true;
        this.startTime = Date.now() - (this.elapsedTime * 1000);
        
        this.timerInterval = setInterval(() => {
            const now = Date.now();
            this.elapsedTime = Math.floor((now - this.startTime) / 1000);
            this.timeLeft = this.settings[this.currentState] - this.elapsedTime;
            
            if (this.timeLeft <= 0) {
                this.complete();
            } else {
                this.notifyListeners('onTick');
            }
        }, 1000);
        
        this.notifyListeners('onStart');
    }
    
    pause() {
        if (!this.isRunning) return;
        
        clearInterval(this.timerInterval);
        this.isRunning = false;
        this.notifyListeners('onPause');
    }
    
    reset() {
        clearInterval(this.timerInterval);
        this.isRunning = false;
        this.elapsedTime = 0;
        this.timeLeft = this.settings[this.currentState];
        this.notifyListeners('onReset');
    }
    
    complete() {
        clearInterval(this.timerInterval);
        this.isRunning = false;
        this.elapsedTime = 0;
        
        this.playAlarm();
        
        this.showNotification();
        
        if (this.currentState === TIMER_STATES.POMODORO) {
            this.completedPomodoros++;
            
            if (this.completedPomodoros % this.settings.longBreakInterval === 0) {
                this.changeState(TIMER_STATES.LONG_BREAK);
            } else {
                this.changeState(TIMER_STATES.SHORT_BREAK);
            }
            
            if (this.settings.autoStartBreaks) {
                this.start();
            }
        } else {
            this.changeState(TIMER_STATES.POMODORO);
            
            if (this.settings.autoStartPomodoros) {
                this.start();
            }
        }
        
        this.notifyListeners('onComplete');
    }
    
    changeState(newState) {
        this.currentState = newState;
        this.timeLeft = this.settings[newState];
        this.elapsedTime = 0;
        this.notifyListeners('onStateChange');
    }
    
    playAlarm() {
        const audio = new Audio('https://assets.mixkit.co/sfx/preview/mixkit-alarm-digital-clock-beep-989.mp3');
        audio.volume = this.settings.volume / 100;
        audio.play().catch(e => console.error('Error playing alarm:', e));
    }
    
    showNotification() {
        if (!("Notification" in window)) return;
        
        if (Notification.permission === "granted") {
            let title, body;
            
            if (this.currentState === TIMER_STATES.POMODORO) {
                title = "Pomodoro Complete!";
                body = "Time for a break.";
            } else {
                title = "Break Complete!";
                body = "Time to focus.";
            }
            
            new Notification(title, { body });
        } else if (Notification.permission !== "denied") {
            Notification.requestPermission();
        }
    }
    
    formatTime() {
        const minutes = Math.floor(this.timeLeft / 60);
        const seconds = this.timeLeft % 60;
        return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    
    addEventListener(event, callback) {
        if (this.listeners[event]) {
            this.listeners[event].push(callback);
        }
    }
    
    removeEventListener(event, callback) {
        if (this.listeners[event]) {
            this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
        }
    }
    
    notifyListeners(event) {
        if (this.listeners[event]) {
            this.listeners[event].forEach(callback => callback(this));
        }
    }
    
    getStateName() {
        switch (this.currentState) {
            case TIMER_STATES.POMODORO:
                return 'Focus';
            case TIMER_STATES.SHORT_BREAK:
                return 'Short Break';
            case TIMER_STATES.LONG_BREAK:
                return 'Long Break';
            default:
                return 'Focus';
        }
    }
    
    getCompletedPomodoros() {
        return this.completedPomodoros;
    }
    
    getSettings() {
        return { ...this.settings };
    }
}

export function initializeTimerUI() {
    const timer = new StudyTimer();
    
    const studyTimer = document.getElementById('study-timer');
    if (!studyTimer) return;
    
    const timerDisplay = studyTimer.querySelector('.timer-display');
    const timerState = studyTimer.querySelector('.timer-state');
    const startBtn = document.getElementById('start-timer');
    const resetBtn = document.getElementById('reset-timer');
    const minimizeBtn = document.getElementById('minimize-timer');
    const closeBtn = document.getElementById('close-timer');
    const pomodoroCount = studyTimer.querySelector('.pomodoro-count');
    
    const pomodoroBtn = document.getElementById('pomodoro-btn');
    const shortBreakBtn = document.getElementById('short-break-btn');
    const longBreakBtn = document.getElementById('long-break-btn');
    
    const settingsBtn = document.getElementById('settings-btn');
    const settingsPanel = document.getElementById('timer-settings');
    const saveSettingsBtn = document.getElementById('save-settings');
    
    function updateDisplay() {
        timerDisplay.textContent = timer.formatTime();
        timerState.textContent = timer.getStateName();
        
        if (pomodoroCount) {
            pomodoroCount.textContent = `${timer.getCompletedPomodoros()} completed`;
        }
        
        if (startBtn) {
            startBtn.innerHTML = timer.isRunning ? 
                '<i class="fas fa-pause"></i> Pause' : 
                '<i class="fas fa-play"></i> Start';
        }
        
        if (pomodoroBtn && shortBreakBtn && longBreakBtn) {
            pomodoroBtn.classList.remove('active');
            shortBreakBtn.classList.remove('active');
            longBreakBtn.classList.remove('active');
            
            switch (timer.currentState) {
                case TIMER_STATES.POMODORO:
                    pomodoroBtn.classList.add('active');
                    break;
                case TIMER_STATES.SHORT_BREAK:
                    shortBreakBtn.classList.add('active');
                    break;
                case TIMER_STATES.LONG_BREAK:
                    longBreakBtn.classList.add('active');
                    break;
            }
        }
    }
    
    timer.addEventListener('onTick', updateDisplay);
    timer.addEventListener('onComplete', updateDisplay);
    timer.addEventListener('onStateChange', updateDisplay);
    timer.addEventListener('onStart', updateDisplay);
    timer.addEventListener('onPause', updateDisplay);
    timer.addEventListener('onReset', updateDisplay);
    
    if (startBtn) {
        startBtn.addEventListener('click', () => {
            if (timer.isRunning) {
                timer.pause();
            } else {
                timer.start();
            }
        });
    }
    
    if (resetBtn) {
        resetBtn.addEventListener('click', () => {
            timer.reset();
        });
    }
    
    if (minimizeBtn) {
        minimizeBtn.addEventListener('click', () => {
            studyTimer.classList.toggle('minimized');
        });
    }
    
    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            studyTimer.classList.add('hidden');
            timer.pause();
        });
    }
    
    if (pomodoroBtn) {
        pomodoroBtn.addEventListener('click', () => {
            timer.changeState(TIMER_STATES.POMODORO);
        });
    }
    
    if (shortBreakBtn) {
        shortBreakBtn.addEventListener('click', () => {
            timer.changeState(TIMER_STATES.SHORT_BREAK);
        });
    }
    
    if (longBreakBtn) {
        longBreakBtn.addEventListener('click', () => {
            timer.changeState(TIMER_STATES.LONG_BREAK);
        });
    }
    
    if (settingsBtn && settingsPanel) {
        settingsBtn.addEventListener('click', () => {
            settingsPanel.classList.toggle('hidden');
            
            const settings = timer.getSettings();
            document.getElementById('pomodoro-minutes').value = Math.floor(settings.pomodoro / 60);
            document.getElementById('short-break-minutes').value = Math.floor(settings.shortBreak / 60);
            document.getElementById('long-break-minutes').value = Math.floor(settings.longBreak / 60);
            document.getElementById('long-break-interval').value = settings.longBreakInterval;
            document.getElementById('auto-start-breaks').checked = settings.autoStartBreaks;
            document.getElementById('auto-start-pomodoros').checked = settings.autoStartPomodoros;
            document.getElementById('volume-slider').value = settings.volume;
        });
    }
    
    if (saveSettingsBtn) {
        saveSettingsBtn.addEventListener('click', () => {
            const newSettings = {
                pomodoro: parseInt(document.getElementById('pomodoro-minutes').value) * 60,
                shortBreak: parseInt(document.getElementById('short-break-minutes').value) * 60,
                longBreak: parseInt(document.getElementById('long-break-minutes').value) * 60,
                longBreakInterval: parseInt(document.getElementById('long-break-interval').value),
                autoStartBreaks: document.getElementById('auto-start-breaks').checked,
                autoStartPomodoros: document.getElementById('auto-start-pomodoros').checked,
                volume: parseInt(document.getElementById('volume-slider').value)
            };
            
            timer.updateSettings(newSettings);
            settingsPanel.classList.add('hidden');
            showNotification('Settings Saved', 'Your timer settings have been updated.', 'success');
        });
    }
    
    const navControls = document.querySelector('.nav-controls');
    if (navControls) {
        const timerToggleBtn = document.createElement('button');
        timerToggleBtn.className = 'timer-toggle-btn';
        timerToggleBtn.innerHTML = '<i class="fas fa-clock"></i>';
        timerToggleBtn.setAttribute('title', 'Toggle Study Timer');
        timerToggleBtn.addEventListener('click', () => {
            studyTimer.classList.toggle('hidden');
        });
        
        navControls.insertBefore(timerToggleBtn, navControls.firstChild);
    }
    
    updateDisplay();
    
    studyTimer.classList.add('hidden');
    
    return timer;
}