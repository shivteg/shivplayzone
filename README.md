# ShivPlayZone 🎮

A fun and interactive puzzle game for kids! Upload any photo and watch it turn into a puzzle. Solve it across 7 challenging levels.

## 🚀 Features
- **Custom Image Upload:** Use your own photos as puzzles.
- **7 Levels of Difficulty:**
  - Level 1: 2x2 grid (5 mins)
  - Level 2: 3x3 grid (4 mins)
  - Level 3: 4x4 grid (3 mins)
  - Level 4: 5x5 grid (2 mins)
  - Level 5: 6x6 grid (1.5 mins)
  - Level 6: 7x7 grid (1 min)
  - Level 7: 8x8 grid (45 secs)
- **Timer:** Race against the clock!
- **Kid-Friendly Design:** Bright colors and simple swap mechanics.
- **Friend Rooms:** Create a room code, invite up to 4 friends, share the same puzzle, chat, use microphone voice, send challenges, and compare scores.

## 🛠️ How to Run Locally

1. **Clone the repository:**
   ```bash
   git clone https://github.com/shivteg/shivplayzone.git
   cd shivplayzone
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start the development server:**
   ```bash
   npm run dev
   ```

4. **Open in browser:**
   Go to `http://localhost:5173`

## Friend Rooms

The room UI works locally in multiple tabs without setup. To let friends play from different places, add these Vercel environment variables from your Supabase project:

```bash
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

Supabase Realtime Broadcast is used for room messages, puzzle moves, chat, score sharing, challenge notes, and WebRTC voice signaling. Microphone voice also needs a secure deployed site or localhost so the browser can allow mic access.

## 🕹️ How to Play
1. Click the big upload box to pick a photo.
2. Click a puzzle piece to select it (it will turn yellow).
3. Click another piece to swap them.
4. Put all pieces in the right order before time runs out!
5. For friend play, create a room, share the code, and upload the photo after everyone joins.
6. Friends who enter the same code, for example `2014`, join the same room and can chat, speak with the mic, send challenges, and share scores.

Developed with ❤️ for kids everywhere.
