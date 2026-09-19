import { useCallback, useMemo, useRef, useState } from "react";
import GameCanvas from "@/components/GameCanvas";
import type { GameHandle } from "@/game/scene";
import type { DirectionName } from "@/game/input";
import type { GameSnapshot } from "@/game/world";

const initialState: GameSnapshot = { score: 0, best: 0, length: 3, status: "ready", direction: "east" };
const demoMode = new URLSearchParams(window.location.search).has("demo");

const compass: { direction: DirectionName; label: string; glyph: string }[] = [
  { direction: "north", label: "Up", glyph: "↑" },
  { direction: "west", label: "Left", glyph: "←" },
  { direction: "south", label: "Down", glyph: "↓" },
  { direction: "east", label: "Right", glyph: "→" },
];

export default function App() {
  const [state, setState] = useState<GameSnapshot>(initialState);
  const handleRef = useRef<GameHandle | null>(null);
  const isPlaying = state.status === "running";
  const statusLabel = useMemo(() => {
    if (state.status === "over") return "Pond quiet";
    if (state.status === "paused") return "Paused";
    if (state.status === "ready") return "Ready to drift";
    return "Gliding";
  }, [state.status]);

  const handleReady = useCallback((handle: GameHandle) => {
    handleRef.current = handle;
  }, []);

  const handleStateChange = useCallback((nextState: GameSnapshot) => {
    setState(nextState);
  }, []);

  const start = () => handleRef.current?.start();
  const restart = () => handleRef.current?.restart();
  const togglePause = () => handleRef.current?.togglePause();
  const steer = (direction: DirectionName) => {
    handleRef.current?.start();
    handleRef.current?.setDirection(direction);
  };

  return (
    <main className="game-shell">
      <GameCanvas onReady={handleReady} onStateChange={handleStateChange} />
      <div className="vignette" aria-hidden="true" />
      <section className="hud" aria-label="Koi Garden game interface">
        <header className="hud-header">
          <div className="brand-lockup">
            <div className="brand-mark" aria-hidden="true"><span /><span /><span /></div>
            <div>
              <p className="eyebrow">Zen pond / 01</p>
              <h1>Koi Garden</h1>
            </div>
          </div>
          <div className="status-pill"><span className={`status-dot ${state.status}`} />{statusLabel}</div>
        </header>

        <div className="score-cluster">
          <div className="metric-card metric-score">
            <span className="metric-label">Score</span>
            <strong>{String(state.score).padStart(2, "0")}</strong>
            <span className="metric-caption">petals gathered</span>
          </div>
          <div className="metric-card metric-length">
            <span className="metric-label">Length</span>
            <strong>{String(state.length).padStart(2, "0")}</strong>
            <span className="metric-caption">living segments</span>
          </div>
        </div>

        <div className="play-card">
          <span className="play-card-kicker">A quiet arcade ritual</span>
          <p>Guide the koi through the water. Collect maple leaves, grow long, and leave only ripples behind.</p>
          <div className="play-card-actions">
            {state.status === "over" ? (
              <button className="primary-button" onClick={restart}>Return to pond <span>↗</span></button>
            ) : state.status === "paused" ? (
              <button className="primary-button" onClick={togglePause}>Continue drifting <span>▶</span></button>
            ) : state.status === "ready" ? (
              <button className="primary-button" onClick={start}>Enter the water <span>↗</span></button>
            ) : (
              <button className="ghost-button" onClick={togglePause}>Pause <span>Ⅱ</span></button>
            )}
            <button className="icon-button" onClick={restart} aria-label="Restart game">↻</button>
          </div>
        </div>

        <div className="corner-note corner-note-left"><span className="note-line" />Use <b>WASD</b> or arrows to steer <span className="note-divider">/</span> <b>Space</b> pauses</div>
        <div className="corner-note corner-note-right"><span className="note-swatch" />Best {String(state.best).padStart(2, "0")}</div>

        <div className="touch-controls" aria-label="Touch controls">
          <button onClick={() => steer("north")} aria-label="Move up">↑</button>
          <div>
            <button onClick={() => steer("west")} aria-label="Move left">←</button>
            <button onClick={() => steer("south")} aria-label="Move down">↓</button>
            <button onClick={() => steer("east")} aria-label="Move right">→</button>
          </div>
        </div>

        {demoMode && <div className="demo-ribbon">Demo current · autopilot on</div>}
        {state.status === "over" && <div className="game-over-stamp">Your koi has found still water.<br /><span>Tap return to pond to swim again.</span></div>}
      </section>
    </main>
  );
}
