// PowerBall Find Me! - Main Application Logic

// CORS proxy to fetch PowerBall results page
const CORS_PROXY = 'https://api.allorigins.win/get?url=';
const POWERBALL_URL = 'https://www.powerball.com/previous-results';

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

// Fetch latest drawing from PowerBall.com via CORS proxy
async function fetchLatestDrawing() {
    drawingDateEl.classList.add('loading');
    drawingDateEl.textContent = 'Loading...';

    try {
        const response = await fetch(CORS_PROXY + encodeURIComponent(POWERBALL_URL));
        if (!response.ok) throw new Error('Network response was not ok');

        const data = await response.json();
        const html = data.contents;

        // Parse the HTML to extract the latest drawing
        const drawing = parseDrawingFromHTML(html);

        if (!drawing) {
            throw new Error('Could not parse drawing data');
        }

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

// Parse drawing data from PowerBall.com HTML
function parseDrawingFromHTML(html) {
    try {
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');

        // Find the first drawing card (most recent)
        // The page has cards with class containing draw info
        // Look for the date and numbers in the first result

        // Try to find date - usually in a heading or time element
        let dateText = null;
        let whiteBalls = [];
        let powerball = null;

        // Look for the first card with drawing info
        // PowerBall.com uses various class names, so we search for patterns

        // Method 1: Look for structured data with numbers
        const allText = html;

        // Find date pattern like "Sat, Jan 17, 2026" or "January 17, 2026"
        const dateMatch = allText.match(/(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun),?\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2},?\s+\d{4}/i);
        if (dateMatch) {
            dateText = dateMatch[0];
        }

        // Find the winning numbers - they appear as individual digits in the HTML
        // Look for a pattern of 5 numbers followed by a powerball
        // The numbers are typically in elements with specific classes

        // Try to find numbers in the content
        // PowerBall shows numbers like: 5, 8, 27, 49, 57 with Powerball 14
        const numbersSection = html.match(/white-balls[^>]*>[\s\S]*?<\/div>/i);

        if (numbersSection) {
            const nums = numbersSection[0].match(/\d+/g);
            if (nums && nums.length >= 5) {
                whiteBalls = nums.slice(0, 5).map(n => parseInt(n));
            }
        }

        // Look for powerball number
        const pbSection = html.match(/powerball[^>]*>[\s\S]*?<\/div>/i);
        if (pbSection) {
            const pbNums = pbSection[0].match(/\d+/g);
            if (pbNums && pbNums.length > 0) {
                powerball = parseInt(pbNums[0]);
            }
        }

        // Fallback: try to find any sequence of 6 numbers that looks like lottery numbers
        if (whiteBalls.length !== 5 || !powerball) {
            // Look for patterns like "5 8 27 49 57 14" or similar
            const numPattern = html.match(/(\d{1,2})\s*[,\s]\s*(\d{1,2})\s*[,\s]\s*(\d{1,2})\s*[,\s]\s*(\d{1,2})\s*[,\s]\s*(\d{1,2})\s*[,\s]\s*(?:Powerball:?\s*)?(\d{1,2})/i);
            if (numPattern) {
                whiteBalls = [
                    parseInt(numPattern[1]),
                    parseInt(numPattern[2]),
                    parseInt(numPattern[3]),
                    parseInt(numPattern[4]),
                    parseInt(numPattern[5])
                ];
                powerball = parseInt(numPattern[6]);
            }
        }

        // If we still don't have numbers, try another approach
        if (whiteBalls.length !== 5 || !powerball) {
            // Look for individual number elements
            const doc = parser.parseFromString(html, 'text/html');
            const allSpans = doc.querySelectorAll('span, div');
            const potentialNumbers = [];

            allSpans.forEach(el => {
                const text = el.textContent.trim();
                if (/^\d{1,2}$/.test(text)) {
                    const num = parseInt(text);
                    if (num >= 1 && num <= 69) {
                        potentialNumbers.push(num);
                    }
                }
            });

            // Take first 6 unique-ish numbers as a guess
            if (potentialNumbers.length >= 6 && whiteBalls.length !== 5) {
                whiteBalls = potentialNumbers.slice(0, 5);
                powerball = potentialNumbers[5];
            }
        }

        if (dateText && whiteBalls.length === 5 && powerball) {
            return {
                date: dateText,
                white: whiteBalls,
                powerball: powerball
            };
        }

        return null;
    } catch (e) {
        console.error('Error parsing HTML:', e);
        return null;
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
