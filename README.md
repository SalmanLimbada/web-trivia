# Web Trivia

Team README for development and quick setup.

## Requirements
- Node.js 20+ (recommended)
- npm
- Internet connection (OpenTDB API + jQuery CDN)

## Install

From project root:

```bash
npm install
```

Then install frontend dependencies:

```bash
cd client
npm install
```

Important:
- Frontend dependencies like `pinia` are in `client/package.json`.
- If you skip `client/npm install`, the app can fail on startup.

## Run

Use 2 terminals.

Terminal A (project root):

```bash
node server/index.js
```

Terminal B:

```bash
cd client
npm run dev
```

Open the Vite URL shown in terminal (usually `http://localhost:5173`).

## Ports
- Backend: `http://localhost:3000`
- Frontend: `http://localhost:5173`

## Quick Multiplayer Check
1. Open app in two tabs/windows.
2. Create room in tab 1.
3. Join from tab 2 with room code.
4. Start game as host.
5. Verify questions, score updates, summary chart, and results page.

## Features Present
- Room create/join multiplayer flow (Socket.IO)
- Host settings (question count, category, difficulty)
- D3 answer summary chart
- Light/Dark mode toggle
- Background music controls (Web Audio API)
- jQuery micro-interactions

## Troubleshooting

### Frontend package/module errors (for example pinia)

```bash
cd client
rm -rf node_modules package-lock.json
npm install
```

### Cannot connect to game
- Confirm backend terminal is running on port 3000.
- Confirm frontend terminal is running on port 5173.

### Music does not autoplay
- Browser autoplay restrictions can block audio.
- Click or press any key once to unlock.

## Submission Note
For final submission, follow `readme.txt` in the project root as the submission-facing run guide.
