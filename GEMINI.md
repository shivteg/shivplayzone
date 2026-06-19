# ShivPlayZone - Project Context & Instructions

## Overview
**ShivPlayZone** is a fun and interactive puzzle game designed for kids. It allows users to upload any photo, which is then sliced into a grid to create a puzzle. The game features 7 levels of increasing difficulty (larger grids and shorter time limits).

## Tech Stack
- **Framework:** React 19 (Vite)
- **Language:** TypeScript
- **Styling:** Vanilla CSS (Modern CSS variables, Flexbox, Grid)
- **Realtime Rooms:** Supabase Realtime Broadcast with a local `BroadcastChannel` fallback.
- **Voice Chat:** Browser WebRTC audio, using the room channel for offer/answer/ICE signaling.
- **Deployment:** Vercel

## Architecture
- **Single Page Application:** The entire game logic resides primarily in `src/App.tsx`.
- **State Management:** Uses React's `useState` for game state (`idle`, `playing`, `won`, `lost`), image data, level, pieces, timer, room players, chat, scores, and voice status.
- **Puzzle Logic:** 
  - Pieces are represented as objects with an `id`, `currentPos`, and `correctPos`.
  - Grid slicing is achieved via CSS `background-size` and `background-position`.
  - The puzzle board automatically adjusts its height to maintain the uploaded image's aspect ratio.
  - Piece swapping is handled by updating the `currentPos` of the two selected pieces.
- **Levels:** Configuration is stored in a `LEVELS` constant (Grid size: 2x2 to 8x8).
- **Friend Rooms:**
  - Players create or enter a room code. Any devices using the same code, for example `2014`, join the same room.
  - Each open app instance gets a unique internal player ID, so duplicated tabs or friends using the same visible name can still join and chat as separate players.
  - Rooms support up to 5 visible players.
  - Room messages sync puzzle starts, moves, full game state, challenges, chat messages, score entries, and WebRTC voice signals.
  - Supabase env vars (`VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`) are required for real multi-device rooms after deployment.
  - Without Supabase env vars, the local `BroadcastChannel` fallback only works across tabs in the same browser.
  - Microphone voice needs localhost or a secure deployed HTTPS site so browsers allow mic access.

## Development Guidelines
- **Coding Style:** 
  - Use functional components and hooks.
  - Maintain the "Kid-Friendly" aesthetic (bright colors, Comic Sans font, large buttons).
  - Prefer Vanilla CSS in `src/index.css` for styling.
  - Keep room features in the existing `RoomMessage` flow unless a dedicated backend is added.
- **Naming Conventions:**
  - Components: PascalCase.
  - Variables/Functions: camelCase.
  - CSS Classes: kebab-case.
- **Testing:** 
  - Ensure all new features or fixes are tested manually for responsive behavior on different screen sizes (especially mobile).
  - Run `npm run build` and `npm run lint` after room or WebRTC changes.
  - For deployed multi-device testing, confirm Supabase Realtime is configured and microphone permissions are accepted on each device.

## Key Files
- `src/App.tsx`: Main game component and logic.
- `src/index.css`: Global styles and color variables.
- `src/main.tsx`: Entry point.
- `package.json`: Dependencies and scripts.

## Commands
- `npm run dev`: Start development server.
- `npm run build`: Build for production.
- `npm run lint`: Run ESLint.
- `npm run preview`: Preview the production build.
