import { useState, useEffect, useCallback, useRef } from 'react'
import './App.css'

interface Piece {
  id: number;
  currentPos: number;
  correctPos: number;
}

interface LevelConfig {
  grid: number;
  time: number;
}

const LEVELS: Record<number, LevelConfig> = {
  1: { grid: 2, time: 300 },
  2: { grid: 3, time: 240 },
  3: { grid: 4, time: 180 },
  4: { grid: 5, time: 120 },
  5: { grid: 6, time: 90 },
  6: { grid: 7, time: 60 },
  7: { grid: 8, time: 45 },
};

function App() {
  const [image, setImage] = useState<string | null>(null);
  const [level, setLevel] = useState(1);
  const [pieces, setPieces] = useState<Piece[]>([]);
  const [selectedPiece, setSelectedPiece] = useState<number | null>(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [gameState, setGameState] = useState<'idle' | 'playing' | 'won' | 'lost'>('idle');
  const timerRef = useRef<number | null>(null);

  const startLevel = useCallback((img: string, lvl: number) => {
    const config = LEVELS[lvl];
    const totalPieces = config.grid * config.grid;
    const newPieces: Piece[] = Array.from({ length: totalPieces }, (_, i) => ({
      id: i,
      currentPos: i,
      correctPos: i,
    }));

    // Shuffle
    for (let i = newPieces.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [newPieces[i].currentPos, newPieces[j].currentPos] = [newPieces[j].currentPos, newPieces[i].currentPos];
    }

    setPieces(newPieces);
    setImage(img);
    setLevel(lvl);
    setTimeLeft(config.time);
    setGameState('playing');
    setSelectedPiece(null);
  }, []);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          startLevel(event.target.result as string, 1);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handlePieceClick = (index: number) => {
    if (gameState !== 'playing') return;

    if (selectedPiece === null) {
      setSelectedPiece(index);
    } else {
      const newPieces = [...pieces];
      // Swap currentPos
      const temp = newPieces[selectedPiece].currentPos;
      newPieces[selectedPiece].currentPos = newPieces[index].currentPos;
      newPieces[index].currentPos = temp;

      setPieces(newPieces);
      setSelectedPiece(null);

      // Check win
      const isWon = newPieces.every(p => p.currentPos === p.correctPos);
      if (isWon) {
        setGameState('won');
        if (timerRef.current) clearInterval(timerRef.current);
      }
    }
  };

  useEffect(() => {
    if (gameState === 'playing' && timeLeft > 0) {
      timerRef.current = window.setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            setGameState('lost');
            clearInterval(timerRef.current!);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [gameState, timeLeft]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const nextLevel = () => {
    if (level < 7) {
      startLevel(image!, level + 1);
    }
  };

  return (
    <div className="container">
      <h1>ShivPlayZone 🎮</h1>

      {gameState === 'idle' && (
        <div className="upload-section" onClick={() => document.getElementById('fileInput')?.click()}>
          <p>Drag or Click to Upload your Photo! 📸</p>
          <input
            id="fileInput"
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            style={{ display: 'none' }}
          />
        </div>
      )}

      {gameState !== 'idle' && (
        <>
          <div className="stats">
            <div>Level: <b>{level}</b></div>
            <div className="timer">Time: <b>{formatTime(timeLeft)}</b></div>
          </div>

          <div
            className="puzzle-board"
            style={{
              gridTemplateColumns: `repeat(${LEVELS[level].grid}, 1fr)`,
              gridTemplateRows: `repeat(${LEVELS[level].grid}, 1fr)`,
            }}
          >
            {pieces
              .sort((a, b) => a.currentPos - b.currentPos)
              .map((piece, index) => {
                const grid = LEVELS[level].grid;
                const row = Math.floor(piece.correctPos / grid);
                const col = piece.correctPos % grid;
                const size = 100 / grid;

                return (
                  <div
                    key={piece.id}
                    className={`puzzle-piece ${selectedPiece !== null && pieces[selectedPiece].id === piece.id ? 'selected' : ''}`}
                    onClick={() => {
                        const idx = pieces.findIndex(p => p.id === piece.id);
                        handlePieceClick(idx);
                    }}
                    style={{
                      backgroundImage: `url(${image})`,
                      backgroundSize: `${grid * 100}% ${grid * 100}%`,
                      backgroundPosition: `${col * size}% ${row * size}%`,
                      outline: selectedPiece !== null && pieces[selectedPiece].id === piece.id ? '4px solid yellow' : 'none',
                      zIndex: selectedPiece !== null && pieces[selectedPiece].id === piece.id ? 10 : 1,
                    }}
                  />
                );
              })}
          </div>

          {gameState === 'won' && (
            <div className="message success">
              <p>YAY! You Solved It! 🎉</p>
              {level < 7 ? (
                <button onClick={nextLevel}>Next Level! 🚀</button>
              ) : (
                <p>You are a Puzzle Master! 🏆</p>
              )}
              <button onClick={() => setGameState('idle')} style={{backgroundColor: 'var(--accent-color)'}}>New Photo 📸</button>
            </div>
          )}

          {gameState === 'lost' && (
            <div className="message fail">
              <p>Time's Up! ⏰</p>
              <button onClick={() => startLevel(image!, level)}>Try Again! 🔄</button>
              <button onClick={() => setGameState('idle')} style={{backgroundColor: 'var(--accent-color)'}}>New Photo 📸</button>
            </div>
          )}

          {gameState === 'playing' && (
            <button onClick={() => setGameState('idle')} style={{backgroundColor: 'var(--primary-color)', fontSize: '1rem'}}>Stop Game 🛑</button>
          )}
        </>
      )}
    </div>
  );
}

export default App;
