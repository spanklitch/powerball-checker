// PowerBall Find Me! - Main Application Logic

// NY State Open Data API - Socrata format (returns current data)
const API_URL = 'https://data.ny.gov/resource/d6yy-54nr.json?$order=draw_date%20DESC&$limit=1';

// Prize structure (without Power Play)
const PRIZES = {
    '5+PB': 'JACKPOT',
    '5+0': '$1,000,000',
    '4+PB': '$50,000',
    '4+0': '$100',
    '3+PB': '$100',
    '3+0': '$7',
    '2+PB': '$7',
    '1+PB': '$4',
    '0+PB': '$4'
};

// Prizes worth $100 or more (trigger confetti)
const BIG_WIN_PRIZES = ['JACKPOT', '$1,000,000', '$50,000', '$100'];

// DOM Elements
const userInputs = {
    white: [
        document.getElementById('user1'),
        document.getElementById('user2'),
        document.getElementById('user3'),
        document.getElementById('user4'),
        document.getElementById('user5')
    ],
    powerball: document.getElementById('userPB')
};

const winningDisplays = {
    white: [
        document.getElementById('win1'),
        document.getElementById('win2'),
        document.getElementById('win3'),
        document.getElementById('win4'),
        document.getElementById('win5')
    ],
    powerball: document.getElementById('winPB')
};

const drawingDateEl = document.getElementById('drawingDate');
const resultSection = document.getElementById('resultSection');
const resultText = document.getElementById('resultText');
const saveBtn = document.getElementById('saveBtn');

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    loadUserNumbers();
    fetchLatestDrawing();
    setupEventListeners();
    registerServiceWorker();
});

// All inputs in order for auto-advance
const allInputs = [...userInputs.white, userInputs.powerball];

// Setup event listeners
function setupEventListeners() {
    saveBtn.addEventListener('click', saveUserNumbers);

    // Setup auto-advance for all inputs
    allInputs.forEach((input, index) => {
        const maxValue = parseInt(input.dataset.max);

        // Handle input - auto advance when 2 digits entered
        input.addEventListener('input', (e) => {
            // Only allow digits
            input.value = input.value.replace(/[^0-9]/g, '');

            // When 2 digits are entered, validate and advance
            if (input.value.length === 2) {
                const value = parseInt(input.value);

                // Validate range
                if (value < 1 || value > maxValue) {
                    input.value = '';
                    return;
                }

                // Auto-advance to next input or highlight save button
                if (index < allInputs.length - 1) {
                    allInputs[index + 1].focus();
                    allInputs[index + 1].select();
                } else {
                    // Last field (PowerBall) filled - highlight save button
                    checkAllFieldsFilled();
                }
            }
        });

        // On blur, pad single digits and validate
        input.addEventListener('blur', () => {
            if (input.value.length === 1) {
                input.value = '0' + input.value;
            }
            validateInput(input, 1, maxValue);
            checkAllFieldsFilled();
        });

        // Select all on focus for easy editing
        input.addEventListener('focus', () => {
            input.select();
        });
    });
}

// Validate input within range
function validateInput(input, min, max) {
    let value = parseInt(input.value);
    if (isNaN(value) || value < min) {
        input.value = '';
    } else if (value > max) {
        input.value = '';
    } else {
        // Pad to 2 digits
        input.value = value.toString().padStart(2, '0');
    }
}

// Check if all fields are filled and highlight save button
function checkAllFieldsFilled() {
    const allFilled = allInputs.every(input => {
        const value = parseInt(input.value);
        return !isNaN(value) && value >= 1;
    });

    if (allFilled) {
        saveBtn.classList.add('highlight');
    } else {
        saveBtn.classList.remove('highlight');
    }
}

// Save user numbers to localStorage
function saveUserNumbers() {
    const whiteBalls = userInputs.white.map(input => parseInt(input.value) || 0);
    const powerball = parseInt(userInputs.powerball.value) || 0;

    // Validate all numbers are entered
    if (whiteBalls.includes(0) || powerball === 0) {
        showResult('Please enter all 6 numbers', 'error');
        return;
    }

    // Check for duplicates in white balls
    const uniqueWhite = new Set(whiteBalls);
    if (uniqueWhite.size !== 5) {
        showResult('White ball numbers must be unique', 'error');
        return;
    }

    const userNumbers = {
        white: whiteBalls,
        powerball: powerball
    };

    localStorage.setItem('powerball_user_numbers', JSON.stringify(userNumbers));
    saveBtn.classList.remove('highlight');
    showResult('Numbers saved!', 'saved');

    // Re-check against current drawing
    const cachedDrawing = localStorage.getItem('powerball_last_drawing');
    if (cachedDrawing) {
        setTimeout(() => {
            checkNumbers(userNumbers, JSON.parse(cachedDrawing));
        }, 1000);
    }
}

// Load user numbers from localStorage
function loadUserNumbers() {
    const saved = localStorage.getItem('powerball_user_numbers');
    if (saved) {
        const userNumbers = JSON.parse(saved);
        userNumbers.white.forEach((num, i) => {
            userInputs.white[i].value = num ? num.toString().padStart(2, '0') : '';
        });
        userInputs.powerball.value = userNumbers.powerball ? userNumbers.powerball.toString().padStart(2, '0') : '';
    }
}

// Check if we should fetch new data based on drawing schedule
// Drawings: Mon, Wed, Sat at 10:59 PM ET, results available by 11:25 PM ET
function shouldFetchNewData() {
    const lastFetch = localStorage.getItem('powerball_last_fetch');
    const cachedDrawing = localStorage.getItem('powerball_last_drawing');

    // Always fetch if no cached data
    if (!cachedDrawing || !lastFetch) {
        return true;
    }

    const now = new Date();
    const lastFetchTime = new Date(parseInt(lastFetch));

    // Get current time in Eastern timezone
    const etOptions = { timeZone: 'America/New_York', hour: 'numeric', minute: 'numeric', weekday: 'short' };
    const etFormatter = new Intl.DateTimeFormat('en-US', etOptions);
    const etParts = etFormatter.formatToParts(now);

    const weekday = etParts.find(p => p.type === 'weekday').value;
    const hour = parseInt(etParts.find(p => p.type === 'hour').value);
    const minute = parseInt(etParts.find(p => p.type === 'minute').value);
    const dayPeriod = etParts.find(p => p.type === 'dayPeriod')?.value || '';

    // Convert to 24-hour format
    let hour24 = hour;
    if (dayPeriod.toLowerCase() === 'pm' && hour !== 12) hour24 += 12;
    if (dayPeriod.toLowerCase() === 'am' && hour === 12) hour24 = 0;

    const currentMinutes = hour24 * 60 + minute;
    const updateTime = 23 * 60 + 25; // 11:25 PM = 23:25

    // Drawing days: Mon, Wed, Sat
    const isDrawingDay = ['Mon', 'Wed', 'Sat'].includes(weekday);

    // If it's a drawing day and past 11:25 PM ET
    if (isDrawingDay && currentMinutes >= updateTime) {
        // Check if we've fetched since 11:25 PM today
        const todayUpdateTime = new Date(now);
        todayUpdateTime.setHours(23, 25, 0, 0);

        // Adjust for timezone (rough estimate - this is simplified)
        const etOffset = -5; // EST (simplified, doesn't account for DST)
        const localOffset = now.getTimezoneOffset() / 60;
        const hourDiff = localOffset + etOffset;
        todayUpdateTime.setHours(todayUpdateTime.getHours() + hourDiff);

        if (lastFetchTime < todayUpdateTime) {
            console.log('Drawing day, past update time, fetching new data');
            return true;
        }
    }

    // Also fetch if cached data is more than 12 hours old (fallback)
    const twelveHours = 12 * 60 * 60 * 1000;
    if (now - lastFetchTime > twelveHours) {
        console.log('Cache older than 12 hours, fetching new data');
        return true;
    }

    console.log('Using cached data');
    return false;
}

// Fetch latest drawing from NY State Open Data API
async function fetchLatestDrawing() {
    // Check if we should use cached data
    if (!shouldFetchNewData()) {
        const cached = localStorage.getItem('powerball_last_drawing');
        if (cached) {
            const drawing = JSON.parse(cached);
            displayDrawing(drawing);
            checkStoredNumbers(drawing);
            return;
        }
    }

    drawingDateEl.classList.add('loading');
    drawingDateEl.textContent = 'Loading...';

    try {
        const response = await fetch(API_URL);
        if (!response.ok) throw new Error('Network response was not ok');

        const data = await response.json();

        // API returns array with latest drawing first
        // Format: { draw_date: "2026-01-17T00:00:00.000", winning_numbers: "05 08 27 49 57 14", multiplier: "4" }
        const latest = data[0];
        const drawDate = latest.draw_date;
        const winningNumbersStr = latest.winning_numbers;

        const numbers = winningNumbersStr.split(' ').map(n => parseInt(n));
        const drawing = {
            date: drawDate,
            white: numbers.slice(0, 5),
            powerball: numbers[5]
        };

        // Cache the drawing and fetch time
        localStorage.setItem('powerball_last_drawing', JSON.stringify(drawing));
        localStorage.setItem('powerball_last_fetch', Date.now().toString());

        displayDrawing(drawing);
        checkStoredNumbers(drawing);

    } catch (error) {
        console.error('Error fetching drawing:', error);

        // Try to use cached data
        const cached = localStorage.getItem('powerball_last_drawing');
        if (cached) {
            const drawing = JSON.parse(cached);
            displayDrawing(drawing);
            drawingDateEl.textContent = formatDate(drawing.date) + ' (cached)';
            checkStoredNumbers(drawing);
        } else {
            drawingDateEl.classList.remove('loading');
            drawingDateEl.textContent = 'Unable to load';
            showResult('Could not fetch drawing results', 'error');
        }
    }
}

// Display drawing numbers
function displayDrawing(drawing) {
    drawingDateEl.classList.remove('loading');
    drawingDateEl.textContent = formatDate(drawing.date);

    drawing.white.forEach((num, i) => {
        winningDisplays.white[i].textContent = num.toString().padStart(2, '0');
    });
    winningDisplays.powerball.textContent = drawing.powerball.toString().padStart(2, '0');
}

// Format date nicely
function formatDate(dateStr) {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

// Check stored user numbers against drawing
function checkStoredNumbers(drawing) {
    const saved = localStorage.getItem('powerball_user_numbers');
    if (saved) {
        const userNumbers = JSON.parse(saved);
        checkNumbers(userNumbers, drawing);
    } else {
        showResult('Enter your numbers above', 'info');
    }
}

// Check user numbers against drawing and calculate prize
function checkNumbers(userNumbers, drawing) {
    // Clear previous highlights
    winningDisplays.white.forEach(el => el.classList.remove('match'));
    winningDisplays.powerball.classList.remove('match');

    // Count matching white balls (order doesn't matter)
    let whiteMatches = 0;
    const drawingWhiteSet = new Set(drawing.white);

    userNumbers.white.forEach(num => {
        if (drawingWhiteSet.has(num)) {
            whiteMatches++;
            // Highlight the matching winning ball
            const matchIndex = drawing.white.indexOf(num);
            if (matchIndex !== -1) {
                winningDisplays.white[matchIndex].classList.add('match');
            }
        }
    });

    // Check PowerBall
    const pbMatch = userNumbers.powerball === drawing.powerball;
    if (pbMatch) {
        winningDisplays.powerball.classList.add('match');
    }

    // Determine prize
    const prizeKey = `${whiteMatches}+${pbMatch ? 'PB' : '0'}`;
    const prize = PRIZES[prizeKey];

    if (prize) {
        if (prize === 'JACKPOT') {
            showResult('JACKPOT WINNER!!!', 'winner');
        } else {
            showResult(`Congrats - ${prize}!`, 'winner');
        }

        // Launch confetti for wins $100 or more
        if (BIG_WIN_PRIZES.includes(prize) && typeof launchConfetti === 'function') {
            setTimeout(() => launchConfetti(), 300);
        }
    } else {
        showResult('Try Again', 'loser');
    }
}

// Show result message
function showResult(message, type) {
    resultText.textContent = message;
    resultSection.className = 'result';

    if (type === 'winner') {
        resultSection.classList.add('winner');
    } else if (type === 'loser') {
        resultSection.classList.add('loser');
    } else if (type === 'error') {
        resultText.classList.add('error');
    }
}

// Register service worker for offline support
function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('service-worker.js')
            .then(registration => {
                console.log('ServiceWorker registered:', registration.scope);
            })
            .catch(error => {
                console.log('ServiceWorker registration failed:', error);
            });
    }
}
