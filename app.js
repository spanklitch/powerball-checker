// PowerBall Find Me! - Main Application Logic

const API_URL = 'https://data.ny.gov/api/views/d6yy-54nr/rows.json?$order=draw_date%20DESC&$limit=1';

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

// Setup event listeners
function setupEventListeners() {
    saveBtn.addEventListener('click', saveUserNumbers);

    // Input validation for white balls (1-69)
    userInputs.white.forEach(input => {
        input.addEventListener('change', () => validateInput(input, 1, 69));
        input.addEventListener('blur', () => validateInput(input, 1, 69));
    });

    // Input validation for PowerBall (1-26)
    userInputs.powerball.addEventListener('change', () => validateInput(userInputs.powerball, 1, 26));
    userInputs.powerball.addEventListener('blur', () => validateInput(userInputs.powerball, 1, 26));
}

// Validate input within range
function validateInput(input, min, max) {
    let value = parseInt(input.value);
    if (isNaN(value) || value < min) {
        input.value = '';
    } else if (value > max) {
        input.value = max;
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
            userInputs.white[i].value = num || '';
        });
        userInputs.powerball.value = userNumbers.powerball || '';
    }
}

// Fetch latest drawing from API
async function fetchLatestDrawing() {
    drawingDateEl.classList.add('loading');
    drawingDateEl.textContent = 'Loading...';

    try {
        const response = await fetch(API_URL);
        if (!response.ok) throw new Error('Network response was not ok');

        const data = await response.json();

        // Parse the response - data is in meta.view and data array
        const latestRow = data.data[0];
        // Row format: [sid, id, position, created_at, created_meta, updated_at, updated_meta, meta, draw_date, winning_numbers, multiplier]
        const drawDate = latestRow[8];
        const winningNumbersStr = latestRow[9];

        const numbers = winningNumbersStr.split(' ').map(n => parseInt(n));
        const drawing = {
            date: drawDate,
            white: numbers.slice(0, 5),
            powerball: numbers[5]
        };

        // Cache the drawing
        localStorage.setItem('powerball_last_drawing', JSON.stringify(drawing));

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
