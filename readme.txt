WEB TRIVIA - RUN INSTRUCTIONS

This file explains exactly how to run our project.

1) REQUIREMENTS
- Node.js 20+ (recommended)
- npm (comes with Node.js)
- Internet connection (for OpenTDB API and jQuery CDN)

2) FIRST-TIME SETUP
In the project root folder, run:

	npm install

Then go to the client folder and run:

	cd client
	npm install

Important:
- Do not skip the second install in client/.
- Frontend packages (including pinia) are installed from client/package.json.

3) HOW TO RUN
Open 2 terminals.

Terminal A (project root):

	node server/index.js

Terminal B (client folder):

	cd client
	npm run dev

Open the URL shown by Vite (usually):

	http://localhost:5173

4) PORTS
- Backend server: http://localhost:3000
- Frontend dev server: http://localhost:5173

5) MULTIPLAYER TEST
- Open the app in two browser tabs/windows.
- In tab 1, create a room.
- In tab 2, join using room code.
- Start game from host tab.

6) ACCOUNTS / DATABASE
- No admin account required.
- No database import required.

7) COMMON ISSUES

Issue: Cannot find module 'pinia' (or similar frontend package errors)
Fix:
- Make sure you ran npm install inside client/.
- If still failing, run:

	cd client
	rm -rf node_modules package-lock.json
	npm install

Issue: Frontend opens but does not connect to game
Fix:
- Confirm backend is running on port 3000.
- Confirm frontend is running on port 5173.

Issue: Categories/questions fail to load
Fix:
- Check internet connection.
- Retry after confirming backend is running.

Issue: Background music does not start immediately
Fix:
- Some browsers block autoplay.
- Click or press any key once to unlock audio.

8) REQUIRED FILES TO RUN THE APP
Make sure these are present:

- server/index.js
- package.json (project root)
- client/package.json
- client/index.html
- client/src/ (all Vue source files)
- client/vite.config.js

Also required after install:
- node_modules in project root (created by npm install)
- node_modules in client folder (created by npm install inside client)
