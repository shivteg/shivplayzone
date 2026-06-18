# ShivPlayZone - Project Context & Instructions

## Overview
**ShivPlayZone** is a fun and interactive puzzle game designed for kids. It allows users to upload any photo, which is then sliced into a grid to create a puzzle. The game features 7 levels of increasing difficulty (larger grids and shorter time limits).

## Tech Stack
- **Framework:** React 19 (Vite)
- **Language:** TypeScript
- **Styling:** Vanilla CSS (Modern CSS variables, Flexbox, Grid)
- **Deployment:** Vercel

## Architecture
- **Single Page Application:** The entire game logic resides primarily in `src/App.tsx`.
- **State Management:** Uses React's `useState` for game state (`idle`, `playing`, `won`, `lost`), image data, level, pieces, and timer.
- **Puzzle Logic:** 
  - Pieces are represented as objects with an `id`, `currentPos`, and `correctPos`.
  - Grid slicing is achieved via CSS `background-size` and `background-position`.
  - The puzzle board automatically adjusts its height to maintain the uploaded image's aspect ratio.
  - Piece swapping is handled by updating the `currentPos` of the two selected pieces.
- **Levels:** Configuration is stored in a `LEVELS` constant (Grid size: 2x2 to 8x8).

## Development Guidelines
- **Coding Style:** 
  - Use functional components and hooks.
  - Maintain the "Kid-Friendly" aesthetic (bright colors, Comic Sans font, large buttons).
  - Prefer Vanilla CSS in `src/index.css` for styling.
- **Naming Conventions:**
  - Components: PascalCase.
  - Variables/Functions: camelCase.
  - CSS Classes: kebab-case.
- **Testing:** 
  - Ensure all new features or fixes are tested manually for responsive behavior on different screen sizes (especially mobile).

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
