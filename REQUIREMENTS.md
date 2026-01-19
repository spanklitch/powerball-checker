# PowerBall Find Me! - Requirements Document

## Overview
A Progressive Web App (PWA) that allows users to save their PowerBall numbers and compare them against the latest drawing results to see if they won.

## Target Platforms
- Any device with a modern web browser
- Installable as "Add to Home Screen" on iOS and Android
- Free hosting via GitHub Pages

## User Interface Design

### Visual Style
- **Background:** Black
- **Title:** "PowerBall Find Me!" (styled attractively)
- **Overall feel:** Clean, simple, lottery-themed

### Layout (Top to Bottom)

#### 1. App Title
- "PowerBall Find Me!" prominently displayed

#### 2. Your Numbers Section
- Label: "Your Winning Numbers"
- **5 white ball inputs:**
  - White background
  - Black number text
  - 2-digit display
  - Valid range: 1-69
- **1 red PowerBall input:**
  - Red background
  - White/black number text
  - 2-digit display
  - Valid range: 1-26

#### 3. Last Drawing Section
- Label: "Last Drawing"
- Drawing date displayed
- **5 white balls:** Same style as user input (white background, black text)
- **1 red PowerBall:** Same style as user input (red background)

#### 4. Results Section
- Located below the Last Drawing numbers
- If no match: Display "Try Again"
- If winner: Display "Congrats - [Prize Amount]!"

## Functional Requirements

### Number Input
- User can enter exactly 5 white ball numbers (1-69)
- User can enter exactly 1 PowerBall number (1-26)
- Numbers persist in local storage (survives app close/reopen)
- Input validation:
  - White balls: integers 1-69 only
  - PowerBall: integers 1-26 only
  - No duplicate white ball numbers allowed
- Only ONE set of numbers per user (no multiple tickets)

### Drawing Data
- Fetch latest PowerBall drawing results automatically
- Data needed:
  - Drawing date
  - 5 winning white ball numbers
  - 1 winning PowerBall number
- Data source: PowerBall.com or suitable API

### Prize Calculation
Based on official PowerBall prize structure:

| Match | Prize |
|-------|-------|
| 5 white + PowerBall | Grand Prize (Jackpot) |
| 5 white only | $1,000,000 |
| 4 white + PowerBall | $50,000 |
| 4 white only | $100 |
| 3 white + PowerBall | $100 |
| 3 white only | $7 |
| 2 white + PowerBall | $7 |
| 1 white + PowerBall | $4 |
| PowerBall only | $4 |
| No match | $0 (Try Again) |

### App Behavior
- On app open: Compare stored user numbers to latest drawing
- Display result immediately
- If opened between drawings: Show comparison to most recent drawing
- No history tracking
- No user accounts or login

## Technical Requirements

### PWA Features
- Manifest file for "Add to Home Screen"
- App icon (PowerBall themed)
- Offline capability (show last known data)
- Full screen mode when installed

### Data Storage
- Local storage for user's numbers
- Cache last drawing results

### Notifications (Future Enhancement)
- Optional push notifications when new drawing results available
- User controls via device notification settings

## Out of Scope (MVP)
- Multiple ticket sets
- Historical results
- User accounts/login
- Power Play multiplier
- Ticket purchase integration
- Drawing schedule/countdown
- Number generator/quick pick

## Data Source (Confirmed)
**New York State Open Data API** - Free, no authentication required

**Endpoint:**
```
https://data.ny.gov/api/views/d6yy-54nr/rows.json?$order=draw_date%20DESC&$limit=1
```

**Response format:**
- Draw date in ISO format (e.g., "2026-01-17")
- Winning numbers as space-separated string: "11 21 27 36 62 24"
  - First 5 numbers = white balls
  - Last number = PowerBall
- Multiplier value (not used in MVP)

**Source:** [NY State Gaming Commission via Data.gov](https://catalog.data.gov/dataset/lottery-powerball-winning-numbers-beginning-2010)

## File Structure
```
powerball-checker/
├── index.html          # Main app HTML
├── style.css           # Styles
├── app.js              # Application logic
├── manifest.json       # PWA manifest
├── service-worker.js   # Offline support
├── icons/              # App icons
│   ├── icon-192.png
│   └── icon-512.png
└── REQUIREMENTS.md     # This document
```

## Success Criteria
1. User can enter and save their PowerBall numbers
2. App fetches and displays latest drawing results
3. App correctly calculates if user won and displays prize amount
4. App works offline with cached data
5. App can be installed on home screen
6. Clean, attractive UI matching the design spec
