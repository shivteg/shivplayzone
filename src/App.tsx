import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { createClient, type RealtimeChannel } from '@supabase/supabase-js'
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

interface RoomPlayer {
  id: string;
  name: string;
}

interface ChatMessage {
  id: string;
  text: string;
  player: RoomPlayer;
  time: string;
}

interface ScoreEntry {
  id: string;
  player: RoomPlayer;
  level: number;
  score: number;
  timeLeft: number;
  time: string;
}

interface SyncedGame {
  image: string;
  level: number;
  pieces: Piece[];
  timeLeft: number;
  aspectRatio: number;
  state: 'playing' | 'won' | 'lost';
}

type RoomMessage =
  | { type: 'hello'; player: RoomPlayer }
  | { type: 'state-request'; player: RoomPlayer }
  | { type: 'game-start'; game: SyncedGame; player: RoomPlayer }
  | { type: 'move'; game: SyncedGame; player: RoomPlayer }
  | { type: 'game-state'; game: SyncedGame; player: RoomPlayer }
  | { type: 'challenge'; text: string; player: RoomPlayer }
  | { type: 'chat'; message: ChatMessage; player: RoomPlayer }
  | { type: 'score'; score: ScoreEntry; player: RoomPlayer }
  | { type: 'voice-ready'; player: RoomPlayer }
  | { type: 'voice-left'; player: RoomPlayer }
  | {
      type: 'voice-signal';
      player: RoomPlayer;
      targetId: string;
      signal:
        | { kind: 'offer'; description: RTCSessionDescriptionInit }
        | { kind: 'answer'; description: RTCSessionDescriptionInit }
        | { kind: 'ice'; candidate: RTCIceCandidateInit };
    };

const LEVELS: Record<number, LevelConfig> = {
  1: { grid: 2, time: 300 },
  2: { grid: 3, time: 240 },
  3: { grid: 4, time: 180 },
  4: { grid: 5, time: 120 },
  5: { grid: 6, time: 90 },
  6: { grid: 7, time: 60 },
  7: { grid: 8, time: 45 },
};

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
const supabase = supabaseUrl && supabaseAnonKey ? createClient(supabaseUrl, supabaseAnonKey) : null;

const createRoomCode = () => Math.random().toString(36).slice(2, 8).toUpperCase();
const MAX_ROOM_PLAYERS = 5;

const createMessageId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const getPlayerId = () => {
  const existing = window.sessionStorage.getItem('shivplayzone-player-id');
  if (existing) return existing;

  const id = crypto.randomUUID();
  window.sessionStorage.setItem('shivplayzone-player-id', id);
  return id;
};

function App() {
  const [image, setImage] = useState<string | null>(null);
  const [level, setLevel] = useState(1);
  const [pieces, setPieces] = useState<Piece[]>([]);
  const [selectedPiece, setSelectedPiece] = useState<number | null>(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [gameState, setGameState] = useState<'idle' | 'playing' | 'won' | 'lost'>('idle');
  const [aspectRatio, setAspectRatio] = useState<number>(1);
  const [playerName, setPlayerName] = useState('Player');
  const [playerId] = useState(() => getPlayerId());
  const [roomCode, setRoomCode] = useState('');
  const [roomInput, setRoomInput] = useState('');
  const [roomPlayers, setRoomPlayers] = useState<RoomPlayer[]>([]);
  const [roomStatus, setRoomStatus] = useState('Play solo or make a room for friends.');
  const [challengeFeed, setChallengeFeed] = useState<string[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [scores, setScores] = useState<ScoreEntry[]>([]);
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [voiceStatus, setVoiceStatus] = useState('Mic is off.');
  const [remoteVoicePlayers, setRemoteVoicePlayers] = useState<RoomPlayer[]>([]);
  const [lastMoveBy, setLastMoveBy] = useState<string | null>(null);
  const timerRef = useRef<number | null>(null);
  const channelRef = useRef<RealtimeChannel | BroadcastChannel | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const peerConnectionsRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const remoteAudioRef = useRef<HTMLDivElement | null>(null);
  const piecesRef = useRef<Piece[]>([]);
  const gameStateRef = useRef(gameState);
  const imageRef = useRef(image);
  const levelRef = useRef(level);
  const timeLeftRef = useRef(timeLeft);
  const aspectRatioRef = useRef(aspectRatio);
  const roomPlayersRef = useRef<RoomPlayer[]>([]);
  const currentPlayerRef = useRef<RoomPlayer>({ id: playerId, name: 'Player' });

  useEffect(() => {
    piecesRef.current = pieces;
    gameStateRef.current = gameState;
    imageRef.current = image;
    levelRef.current = level;
    timeLeftRef.current = timeLeft;
    aspectRatioRef.current = aspectRatio;
  }, [pieces, gameState, image, level, timeLeft, aspectRatio]);

  const currentPlayer = useMemo(() => ({
    id: playerId,
    name: playerName.trim() || 'Player',
  }), [playerId, playerName]);

  useEffect(() => {
    currentPlayerRef.current = currentPlayer;
  }, [currentPlayer]);

  const isInRoom = roomCode.length > 0;

  const addPlayer = useCallback((player: RoomPlayer) => {
    setRoomPlayers((players) => {
      const withoutDuplicate = players.filter((item) => item.id !== player.id);
      const nextPlayers = [...withoutDuplicate, player].slice(-MAX_ROOM_PLAYERS);
      roomPlayersRef.current = nextPlayers;
      return nextPlayers;
    });
  }, []);

  const addChallenge = useCallback((text: string) => {
    setChallengeFeed((feed) => [text, ...feed].slice(0, 4));
  }, []);

  const addChatMessage = useCallback((message: ChatMessage) => {
    setChatMessages((messages) => {
      if (messages.some((item) => item.id === message.id)) return messages;
      return [...messages, message].slice(-30);
    });
  }, []);

  const addScore = useCallback((score: ScoreEntry) => {
    setScores((entries) => {
      const withoutDuplicate = entries.filter((item) => item.id !== score.id);
      return [...withoutDuplicate, score]
        .sort((a, b) => b.score - a.score || b.timeLeft - a.timeLeft)
        .slice(0, 10);
    });
  }, []);

  const getSyncedGame = useCallback((override?: Partial<SyncedGame>): SyncedGame => ({
    image: imageRef.current || '',
    level: levelRef.current,
    pieces: piecesRef.current,
    timeLeft: timeLeftRef.current,
    aspectRatio: aspectRatioRef.current,
    state: gameStateRef.current === 'idle' ? 'playing' : gameStateRef.current,
    ...override,
  }), []);

  const applySyncedGame = useCallback((game: SyncedGame, actorName?: string) => {
    setImage(game.image);
    setLevel(game.level);
    setPieces(game.pieces);
    setTimeLeft(game.timeLeft);
    setAspectRatio(game.aspectRatio);
    setGameState(game.state);
    setSelectedPiece(null);
    if (actorName) setLastMoveBy(actorName);
  }, []);

  const sendRoomMessage = useCallback((message: RoomMessage) => {
    const channel = channelRef.current;
    if (!channel || !roomCode) return;

    if ('send' in channel) {
      channel.send({
        type: 'broadcast',
        event: 'room-message',
        payload: message,
      });
      return;
    }

      channel.postMessage(message);
  }, [roomCode]);

  const upsertRemoteAudio = useCallback((player: RoomPlayer, stream: MediaStream) => {
    setRemoteVoicePlayers((players) => {
      const withoutDuplicate = players.filter((item) => item.id !== player.id);
      return [...withoutDuplicate, player];
    });

    const container = remoteAudioRef.current;
    if (!container) return;

    let audio = container.querySelector<HTMLAudioElement>(`audio[data-player-id="${player.id}"]`);
    if (!audio) {
      audio = document.createElement('audio');
      audio.dataset.playerId = player.id;
      audio.autoplay = true;
      container.appendChild(audio);
    }
    audio.srcObject = stream;
  }, []);

  const removePeer = useCallback((playerIdToRemove: string) => {
    const peer = peerConnectionsRef.current.get(playerIdToRemove);
    if (peer) peer.close();
    peerConnectionsRef.current.delete(playerIdToRemove);
    setRemoteVoicePlayers((players) => players.filter((player) => player.id !== playerIdToRemove));

    const audio = remoteAudioRef.current?.querySelector<HTMLAudioElement>(`audio[data-player-id="${playerIdToRemove}"]`);
    if (audio) {
      audio.srcObject = null;
      audio.remove();
    }
  }, []);

  const getPeerConnection = useCallback((player: RoomPlayer) => {
    const existing = peerConnectionsRef.current.get(player.id);
    if (existing) return existing;

    const peer = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
    });

    localStreamRef.current?.getTracks().forEach((track) => {
      peer.addTrack(track, localStreamRef.current!);
    });

    peer.onicecandidate = (event) => {
      if (!event.candidate) return;
      sendRoomMessage({
        type: 'voice-signal',
        player: currentPlayerRef.current,
        targetId: player.id,
        signal: { kind: 'ice', candidate: event.candidate.toJSON() },
      });
    };

    peer.ontrack = (event) => {
      const [stream] = event.streams;
      if (stream) upsertRemoteAudio(player, stream);
    };

    peer.onconnectionstatechange = () => {
      if (['closed', 'disconnected', 'failed'].includes(peer.connectionState)) {
        removePeer(player.id);
      }
    };

    peerConnectionsRef.current.set(player.id, peer);
    return peer;
  }, [removePeer, sendRoomMessage, upsertRemoteAudio]);

  const callVoicePeer = useCallback(async (player: RoomPlayer) => {
    if (!localStreamRef.current || player.id === playerId) return;

    const peer = getPeerConnection(player);
    const offer = await peer.createOffer();
    await peer.setLocalDescription(offer);
    sendRoomMessage({
      type: 'voice-signal',
      player: currentPlayerRef.current,
      targetId: player.id,
      signal: { kind: 'offer', description: offer },
    });
  }, [getPeerConnection, playerId, sendRoomMessage]);

  const stopVoice = useCallback((shouldBroadcast = true) => {
    localStreamRef.current?.getTracks().forEach((track) => track.stop());
    localStreamRef.current = null;

    peerConnectionsRef.current.forEach((peer) => peer.close());
    peerConnectionsRef.current.clear();

    if (remoteAudioRef.current) remoteAudioRef.current.innerHTML = '';
    setRemoteVoicePlayers([]);
    setVoiceEnabled(false);
    setVoiceStatus('Mic is off.');

    if (shouldBroadcast && roomCode) {
      sendRoomMessage({ type: 'voice-left', player: currentPlayerRef.current });
    }
  }, [roomCode, sendRoomMessage]);

  const startVoice = useCallback(async () => {
    if (!isInRoom) {
      setVoiceStatus('Join a room before turning on the mic.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      localStreamRef.current = stream;
      setVoiceEnabled(true);
      setVoiceStatus('Mic is on.');

      sendRoomMessage({ type: 'voice-ready', player: currentPlayerRef.current });
      roomPlayersRef.current
        .filter((player) => player.id !== playerId)
        .forEach((player) => {
          void callVoicePeer(player);
        });
    } catch {
      setVoiceStatus('Mic permission was blocked or unavailable.');
    }
  }, [callVoicePeer, isInRoom, playerId, sendRoomMessage]);

  const startLevel = useCallback((img: string, lvl: number, options?: { pieces?: Piece[]; shouldBroadcast?: boolean; nextAspectRatio?: number }) => {
    const config = LEVELS[lvl];
    const totalPieces = config.grid * config.grid;
    const newPieces: Piece[] = options?.pieces || Array.from({ length: totalPieces }, (_, i) => ({
      id: i,
      currentPos: i,
      correctPos: i,
    }));

    if (!options?.pieces) {
      for (let i = newPieces.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newPieces[i].currentPos, newPieces[j].currentPos] = [newPieces[j].currentPos, newPieces[i].currentPos];
      }
    }

    const nextAspectRatio = options?.nextAspectRatio || aspectRatioRef.current;

    setPieces(newPieces);
    setImage(img);
    setLevel(lvl);
    setTimeLeft(config.time);
    setGameState('playing');
    setSelectedPiece(null);
    setLastMoveBy(null);
    setAspectRatio(nextAspectRatio);

    if (options?.shouldBroadcast && roomCode) {
      sendRoomMessage({
        type: 'game-start',
        player: currentPlayer,
        game: {
          image: img,
          level: lvl,
          pieces: newPieces,
          timeLeft: config.time,
          aspectRatio: nextAspectRatio,
          state: 'playing',
        },
      });
      addChallenge(`${currentPlayer.name} started a Level ${lvl} room challenge.`);
    }
  }, [addChallenge, currentPlayer, roomCode, sendRoomMessage]);

  const handleRoomMessage = useCallback((message: RoomMessage) => {
    if (!message || message.player.id === playerId) return;

    addPlayer(message.player);

    if (message.type === 'hello') {
      setRoomStatus(`${message.player.name} joined room ${roomCode}.`);
      if (gameStateRef.current !== 'idle' && imageRef.current) {
        sendRoomMessage({
          type: 'game-state',
          player: currentPlayer,
          game: getSyncedGame(),
        });
      }
      return;
    }

    if (message.type === 'state-request') {
      if (gameStateRef.current !== 'idle' && imageRef.current) {
        sendRoomMessage({
          type: 'game-state',
          player: currentPlayer,
          game: getSyncedGame(),
        });
      }
      return;
    }

    if (message.type === 'game-start' || message.type === 'game-state' || message.type === 'move') {
      applySyncedGame(message.game, message.player.name);
      setRoomStatus(`${message.player.name} shared the puzzle with this room.`);
      return;
    }

    if (message.type === 'challenge') {
      addChallenge(`${message.player.name}: ${message.text}`);
      return;
    }

    if (message.type === 'chat') {
      addChatMessage(message.message);
      return;
    }

    if (message.type === 'score') {
      addScore(message.score);
      addChallenge(`${message.player.name} scored ${message.score.score} on Level ${message.score.level}.`);
      return;
    }

    if (message.type === 'voice-ready') {
      setVoiceStatus(`${message.player.name} turned on the mic.`);
      if (localStreamRef.current) {
        void callVoicePeer(message.player);
      }
      return;
    }

    if (message.type === 'voice-left') {
      removePeer(message.player.id);
      setVoiceStatus(`${message.player.name} left voice chat.`);
      return;
    }

    if (message.type === 'voice-signal') {
      if (message.targetId !== playerId || !localStreamRef.current) return;

      void (async () => {
        const peer = getPeerConnection(message.player);

        if (message.signal.kind === 'offer') {
          await peer.setRemoteDescription(message.signal.description);
          const answer = await peer.createAnswer();
          await peer.setLocalDescription(answer);
          sendRoomMessage({
            type: 'voice-signal',
            player: currentPlayerRef.current,
            targetId: message.player.id,
            signal: { kind: 'answer', description: answer },
          });
          return;
        }

        if (message.signal.kind === 'answer') {
          await peer.setRemoteDescription(message.signal.description);
          return;
        }

        await peer.addIceCandidate(message.signal.candidate);
      })();
    }
  }, [
    addChallenge,
    addChatMessage,
    addPlayer,
    addScore,
    applySyncedGame,
    callVoicePeer,
    currentPlayer,
    getPeerConnection,
    getSyncedGame,
    playerId,
    removePeer,
    roomCode,
    sendRoomMessage,
  ]);

  useEffect(() => {
    if (!roomCode) return;

    if (supabase) {
      const channel = supabase.channel(`shivplayzone:${roomCode}`, {
        config: { broadcast: { self: false } },
      });

      channel
        .on('broadcast', { event: 'room-message' }, ({ payload }) => handleRoomMessage(payload as RoomMessage))
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            channel.send({
              type: 'broadcast',
              event: 'room-message',
              payload: { type: 'hello', player: currentPlayer },
            });
            channel.send({
              type: 'broadcast',
              event: 'room-message',
              payload: { type: 'state-request', player: currentPlayer },
            });
          }
        });

      channelRef.current = channel;

      return () => {
        supabase.removeChannel(channel);
        channelRef.current = null;
      };
    }

    const localChannel = new BroadcastChannel(`shivplayzone:${roomCode}`);
    localChannel.onmessage = (event) => handleRoomMessage(event.data as RoomMessage);
    channelRef.current = localChannel;
    localChannel.postMessage({ type: 'hello', player: currentPlayer });
    localChannel.postMessage({ type: 'state-request', player: currentPlayer });

    return () => {
      localChannel.close();
      channelRef.current = null;
    };
  }, [addPlayer, currentPlayer, handleRoomMessage, roomCode]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          const img = new Image();
          img.onload = () => {
            startLevel(event.target!.result as string, 1, {
              shouldBroadcast: isInRoom,
              nextAspectRatio: img.width / img.height,
            });
          };
          img.src = event.target.result as string;
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
      const temp = newPieces[selectedPiece].currentPos;
      newPieces[selectedPiece].currentPos = newPieces[index].currentPos;
      newPieces[index].currentPos = temp;

      setPieces(newPieces);
      setSelectedPiece(null);
      setLastMoveBy(currentPlayer.name);

      const isWon = newPieces.every(p => p.currentPos === p.correctPos);
      if (isWon) {
        setGameState('won');
        if (timerRef.current) clearInterval(timerRef.current);
        shareScore(level, timeLeft);
        if (isInRoom) {
          sendRoomMessage({
            type: 'challenge',
            player: currentPlayer,
            text: `I solved Level ${level}! Can you beat me?`,
          });
        }
      }

      if (isInRoom) {
        sendRoomMessage({
          type: 'move',
          player: currentPlayer,
          game: getSyncedGame({
            pieces: newPieces,
            state: isWon ? 'won' : 'playing',
          }),
        });
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
      startLevel(image!, level + 1, { shouldBroadcast: isInRoom });
    }
  };

  const createRoom = () => {
    const code = createRoomCode();
    setRoomCode(code);
    setRoomInput(code);
    roomPlayersRef.current = [currentPlayer];
    setRoomPlayers([currentPlayer]);
    setChatMessages([]);
    setScores([]);
    setChallengeFeed([]);
    setRoomStatus(supabase ? `Room ${code} is ready. Share this code with your friends.` : `Local room ${code}. Add Supabase env vars for friends on other devices.`);
  };

  const joinRoom = () => {
    const code = roomInput.trim().toUpperCase();
    if (!code) return;
    setRoomCode(code);
    roomPlayersRef.current = [currentPlayer];
    setRoomPlayers([currentPlayer]);
    setChatMessages([]);
    setScores([]);
    setChallengeFeed([]);
    setRoomStatus(supabase ? `Joining room ${code}...` : `Local room ${code}. Add Supabase env vars for friends on other devices.`);
  };

  const leaveRoom = () => {
    stopVoice();
    setRoomCode('');
    roomPlayersRef.current = [];
    setRoomPlayers([]);
    setChatMessages([]);
    setScores([]);
    setChallengeFeed([]);
    setRoomStatus('Play solo or make a room for friends.');
    setLastMoveBy(null);
  };

  const sendChallenge = () => {
    if (!isInRoom) return;
    const text = `I challenge you on Level ${level}!`;
    addChallenge(`${currentPlayer.name}: ${text}`);
    sendRoomMessage({ type: 'challenge', player: currentPlayer, text });
  };

  const sendChat = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!isInRoom) return;

    const text = chatInput.trim();
    if (!text) return;

    const message: ChatMessage = {
      id: createMessageId(),
      text,
      player: currentPlayer,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    addChatMessage(message);
    sendRoomMessage({ type: 'chat', player: currentPlayer, message });
    setChatInput('');
  };

  const shareScore = useCallback((nextLevel: number, nextTimeLeft: number) => {
    if (!isInRoom) return;

    const score: ScoreEntry = {
      id: createMessageId(),
      player: currentPlayer,
      level: nextLevel,
      score: nextLevel * 1000 + nextTimeLeft * 10,
      timeLeft: nextTimeLeft,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    addScore(score);
    sendRoomMessage({ type: 'score', player: currentPlayer, score });
  }, [addScore, currentPlayer, isInRoom, sendRoomMessage]);

  const sortedPieces = useMemo(() => {
    return [...pieces].sort((a, b) => a.currentPos - b.currentPos);
  }, [pieces]);

  return (
    <div className="container">
      <h1>ShivPlayZone Game</h1>

      <section className="room-panel">
        <div className="room-header">
          <div>
            <h2>Play with Friends</h2>
            <p>{roomStatus}</p>
          </div>
          {roomCode && <strong className="room-code">{roomCode}</strong>}
        </div>

        <div className="room-controls">
          <input
            value={playerName}
            onChange={(event) => setPlayerName(event.target.value)}
            aria-label="Your player name"
            maxLength={16}
            placeholder="Your name"
          />
          <button type="button" onClick={createRoom}>Create Room</button>
          <input
            value={roomInput}
            onChange={(event) => setRoomInput(event.target.value.toUpperCase())}
            aria-label="Room code"
            maxLength={6}
            placeholder="ROOMID"
          />
          <button type="button" onClick={joinRoom}>Join</button>
          {roomCode && <button type="button" className="danger-button" onClick={leaveRoom}>Leave</button>}
        </div>

        {roomCode && (
          <div className="room-meta">
            <div className="player-list">
              {roomPlayers.map((player) => (
                <span key={player.id}>{player.name}</span>
              ))}
            </div>
            <div className="room-actions">
              <button type="button" className="challenge-button" onClick={sendChallenge}>Send Challenge</button>
              <button
                type="button"
                className={voiceEnabled ? 'danger-button' : 'voice-button'}
                onClick={() => {
                  if (voiceEnabled) {
                    stopVoice();
                    return;
                  }
                  void startVoice();
                }}
              >
                {voiceEnabled ? 'Mute Mic' : 'Start Mic'}
              </button>
            </div>
          </div>
        )}

        {roomCode && (
          <div className="voice-status">
            <span>{voiceStatus}</span>
            {remoteVoicePlayers.length > 0 && (
              <span>Speaking with {remoteVoicePlayers.map((player) => player.name).join(', ')}</span>
            )}
          </div>
        )}

        <div ref={remoteAudioRef} className="remote-audio" aria-hidden="true" />

        {roomCode && (
          <form className="chat-box" onSubmit={sendChat}>
            <div className="chat-messages" aria-label="Room chat">
              {chatMessages.length === 0 ? (
                <p className="muted-text">No messages yet.</p>
              ) : (
                chatMessages.map((message) => (
                  <p key={message.id}>
                    <strong>{message.player.name}</strong>
                    <span>{message.time}</span>
                    {message.text}
                  </p>
                ))
              )}
            </div>
            <div className="chat-controls">
              <input
                value={chatInput}
                onChange={(event) => setChatInput(event.target.value)}
                maxLength={120}
                placeholder="Message this room"
                aria-label="Room message"
              />
              <button type="submit">Send</button>
            </div>
          </form>
        )}

        {scores.length > 0 && (
          <div className="score-board">
            <h3>Room Scores</h3>
            {scores.map((score, index) => (
              <div key={score.id} className="score-row">
                <span>#{index + 1}</span>
                <strong>{score.player.name}</strong>
                <span>Level {score.level}</span>
                <b>{score.score}</b>
              </div>
            ))}
          </div>
        )}

        {challengeFeed.length > 0 && (
          <div className="challenge-feed">
            {challengeFeed.map((item, index) => (
              <p key={`${item}-${index}`}>{item}</p>
            ))}
          </div>
        )}
      </section>

      {gameState === 'idle' && (
        <div className="upload-section" onClick={() => document.getElementById('fileInput')?.click()}>
          <p>{roomCode ? 'Upload a photo to start the room puzzle!' : 'Drag or Click to Upload your Photo!'}</p>
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
            {roomCode && <div>Room: <b>{roomCode}</b></div>}
          </div>
          {lastMoveBy && roomCode && <p className="last-move">Last move by {lastMoveBy}</p>}

          <div
            className="puzzle-board"
            style={{
              gridTemplateColumns: `repeat(${LEVELS[level].grid}, 1fr)`,
              gridTemplateRows: `repeat(${LEVELS[level].grid}, 1fr)`,
              aspectRatio: `${aspectRatio}`,
              height: 'auto',
            }}
          >
            {sortedPieces.map((piece) => {
              const grid = LEVELS[level].grid;
              const row = Math.floor(piece.correctPos / grid);
              const col = piece.correctPos % grid;
              const posX = grid > 1 ? (col / (grid - 1)) * 100 : 0;
              const posY = grid > 1 ? (row / (grid - 1)) * 100 : 0;

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
                    backgroundPosition: `${posX}% ${posY}%`,
                    outline: selectedPiece !== null && pieces[selectedPiece].id === piece.id ? '4px solid yellow' : 'none',
                    zIndex: selectedPiece !== null && pieces[selectedPiece].id === piece.id ? 10 : 1,
                  }}
                />
              );
            })}
          </div>

          {gameState === 'won' && (
            <div className="message success">
              <p>YAY! You Solved It!</p>
              {level < 7 ? (
                <button onClick={nextLevel}>Next Level!</button>
              ) : (
                <p>You are a Puzzle Master!</p>
              )}
              <button onClick={() => setGameState('idle')} style={{ backgroundColor: 'var(--accent-color)' }}>New Photo</button>
            </div>
          )}

          {gameState === 'lost' && (
            <div className="message fail">
              <p>Time's Up!</p>
              <button onClick={() => startLevel(image!, level, { shouldBroadcast: isInRoom })}>Try Again!</button>
              <button onClick={() => setGameState('idle')} style={{ backgroundColor: 'var(--accent-color)' }}>New Photo</button>
            </div>
          )}

          {gameState === 'playing' && (
            <button onClick={() => setGameState('idle')} style={{ backgroundColor: 'var(--primary-color)', fontSize: '1rem' }}>Stop Game</button>
          )}
        </>
      )}
    </div>
  );
}

export default App;
