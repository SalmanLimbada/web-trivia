# Web Trivia

This README is only for the current state of the project so far.
It is here to help run what has been built up to this point.

## What is working right now

- Vue frontend
- Node/Express backend
- Socket.IO room system
- Multiplayer trivia flow

## Before you run it

Make sure you have Node.js installed.

## First-time setup

Open a terminal in the project root and run:

```bash
npm install
```

Then go into the `client` folder and run:

```bash
npm install
```

## How to run it

1. In the project root, start the server:

```bash
node server/index.js
```

2. In a second terminal, go to the `client` folder and start the Vue app:

```bash
npm run dev
```

3. Open the local Vite link shown in the terminal.
It is usually `http://localhost:5173`.

## Notes

- The backend runs on `http://localhost:3000`
- The frontend connects to that server with Socket.IO
- To test multiplayer, open the app in two browser windows or on two devices on the same network

## Important

This is not the final project README.
It only explains how to run the project in its current state.
