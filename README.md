
## Current Status

Project is functional end-to-end:

- Home screen for create/join room flow
- Multiplayer room system with host controls
- Trivia gameplay with score tracking
- D3 answer breakdown chart between questions
- Results page with restart options
- Light/Dark mode toggle
- Ambient background music with volume slider
- jQuery micro-animations across pages

## Tech Stack

- Frontend: Vue 3, Vue Router, Bulma, D3
- Backend: Node.js, Express, Socket.IO
- Data source: OpenTDB web service
- Additional tech: Web Audio API (music + volume control)

## Setup

Requirements:

- Node.js 20+ recommended

Install dependencies:

```bash
npm install
cd client
npm install
```

## Run Locally

1. Start backend from project root:

```bash
node server/index.js
```

2. Start frontend in another terminal:

```bash
cd client
npm run dev
```

3. Open the Vite URL (usually http://localhost:5173).

## Quick Test Checklist

1. Create a room and join from another browser tab.
2. Host changes question count/category and starts game.
3. Answer questions from both clients and verify score updates.
4. Confirm summary chart shows green correct bar and red incorrect bars.
5. Confirm results page shows winner and restart options.
6. Confirm Dark/Light mode works.
7. Confirm music volume slider works (autoplay may require first interaction due to browser policy).
8. Confirm Enter key works in Home inputs (name/code/custom count).

## Known Notes

- Browser audio autoplay restrictions vary. If music does not start immediately, first click/keypress unlocks it.
- jQuery is currently loaded through CDN in client/index.html.

## Still To Finish

- Final polishing pass (text copy, tiny UX fixes, responsive checks)
- Final required docs cleanup:
	- readme.txt (submission-facing run instructions)
	- contributions.txt (who did what)
	- ai-prompts.txt updates
	- group_members.html verification
- Final bug sweep and submission zip validation
