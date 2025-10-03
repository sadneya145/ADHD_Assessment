import { useState, useEffect, useCallback, useRef } from 'react';
import './GoNoGo.css'; // Importing the CSS

const TOTAL_ROUNDS = 20;
const GO_PROBABILITY = 0.7;
const SIGNAL_DURATION = 800;
const MIN_WAIT_TIME = 500;
const MAX_WAIT_TIME = 1500;

export default function GoNoGoTask() {
  const [gameState, setGameState] = useState('idle');
  const [signal, setSignal] = useState('Wait');
  const [round, setRound] = useState(0);
  const [score, setScore] = useState({ hits: 0, misses: 0, falseAlarms: 0, correctRejections: 0 });
  const [reactionTimes, setReactionTimes] = useState([]);

  const signalStartTime = useRef(0);
  const userResponded = useRef(false);
  const gameLoopTimeout = useRef(null);

  const endRound = useCallback(() => {
    if (signal === 'Go' && !userResponded.current) {
      setScore(s => ({ ...s, misses: s.misses + 1 }));
    }
    if (signal === 'No-Go' && !userResponded.current) {
      setScore(s => ({ ...s, correctRejections: s.correctRejections + 1 }));
    }

    setSignal('Wait');
    userResponded.current = false;

    if (round + 1 >= TOTAL_ROUNDS) {
      setGameState('finished');
    } else {
      setRound(r => r + 1);
    }
  }, [round, signal]);

  useEffect(() => {
    if (gameState === 'running' && round < TOTAL_ROUNDS) {
      const waitTime = Math.random() * (MAX_WAIT_TIME - MIN_WAIT_TIME) + MIN_WAIT_TIME;
      gameLoopTimeout.current = setTimeout(() => {
        const newSignal = Math.random() < GO_PROBABILITY ? 'Go' : 'No-Go';
        setSignal(newSignal);
        signalStartTime.current = Date.now();
        userResponded.current = false;

        gameLoopTimeout.current = setTimeout(endRound, SIGNAL_DURATION);
      }, waitTime);
    }

    return () => {
      if (gameLoopTimeout.current) clearTimeout(gameLoopTimeout.current);
    };
  }, [gameState, round, endRound]);

  const handleResponse = () => {
    if (signal === 'Wait' || userResponded.current) return;

    userResponded.current = true;
    const rt = Date.now() - signalStartTime.current;

    if (signal === 'Go') {
      setScore(s => ({ ...s, hits: s.hits + 1 }));
      setReactionTimes(rts => [...rts, rt]);
    } else if (signal === 'No-Go') {
      setScore(s => ({ ...s, falseAlarms: s.falseAlarms + 1 }));
    }
  };

  const startGame = () => {
    setGameState('running');
    setRound(0);
    setScore({ hits: 0, misses: 0, falseAlarms: 0, correctRejections: 0 });
    setReactionTimes([]);
    setSignal('Wait');
    userResponded.current = false;
  };

  const avgReactionTime = reactionTimes.length > 0 ? (reactionTimes.reduce((a, b) => a + b, 0) / reactionTimes.length).toFixed(0) : 0;

  const renderSignal = () => {
    switch (signal) {
      case 'Go':
        return <div className="signal go">▶</div>;
      case 'No-Go':
        return <div className="signal no-go">✖</div>;
      case 'Wait':
      default:
        return <div className="signal wait">⏸</div>;
    }
  };

  if (gameState === 'idle') {
    return (
      <div className="screen">
        <div className="card">
          <h2>Go/No-Go Task Instructions</h2>
          <p>
            A signal will appear. If it's a green "Go" signal, click the "React" button as fast as you can.
            If it's a red "No-Go" signal, do not click.
          </p>
          <button onClick={startGame} className="btn start">Start Game</button>
        </div>
      </div>
    );
  }

  if (gameState === 'finished') {
    return (
      <div className="screen">
        <div className="card">
          <h2>Results</h2>
          <div className="results">
            <div className="result-item"><span>Hits:</span> {score.hits}</div>
            <div className="result-item"><span>Misses:</span> {score.misses}</div>
            <div className="result-item"><span>False Alarms:</span> {score.falseAlarms}</div>
            <div className="result-item"><span>Correct Rejections:</span> {score.correctRejections}</div>
            <div className="result-item"><span>Avg. Reaction Time:</span> {avgReactionTime} ms</div>
          </div>
          <button onClick={startGame} className="btn play-again">Play Again</button>
        </div>
      </div>
    );
  }

  return (
    <div className="screen">
      <div className="card">
        <p>Round {round + 1} of {TOTAL_ROUNDS}</p>
        {renderSignal()}
        <button onClick={handleResponse} className="btn react">React</button>
      </div>
    </div>
  );
}
