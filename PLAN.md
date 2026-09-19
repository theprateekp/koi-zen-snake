# Game Plan: Koi Zen Snake

## Risk Tasks

### 1. Grid movement and collision state
- **Why isolated:** The game must feel like classic Snake while presenting a smooth-looking koi in a 3D pond.
- **Approach:** Keep authoritative positions as integer grid coordinates. Queue semantic direction changes, advance on a fixed step timer, grow on food, and check wall/body collisions before committing a move. Render the fish and body meshes from the current grid state.
- **Verify:** Arrow keys/WASD change heading, queued turns are applied in order without 180-degree reversals, food increments score and length, and wall/self collisions produce a clear game-over state.

### 2. Ripple trail and procedural pond presentation
- **Why isolated:** Ripples, lantern glow, and the top-down garden scene need to stay legible without obscuring the grid or gameplay.
- **Approach:** Use lightweight procedural meshes and alpha materials for concentric ripple rings, stone borders, bamboo, and lanterns. Use an orthographic Babylon camera with a subtle slow drift and keep the water texture low contrast.
- **Verify:** Ripple rings appear behind recent koi positions, fade without accumulating unbounded meshes, the playfield remains readable, and the camera stays top-down at desktop and mobile sizes.

## Main Build

Build a playable browser Snake game themed as a koi gliding through a Japanese zen garden. The game includes a fixed grid, animated koi head and body, red maple-leaf food pickups, score and best-score HUD, start/pause/restart controls, keyboard and touch-friendly directional controls, deterministic `?demo` autopilot for screenshot proof, and a warm zen visual system.

- **Assets needed:**
  - Generated visual reference for composition and palette.
  - Generated koi cutout sprite for the head.
  - Generated indigo pond tile for the playfield material.
  - Procedural stones, bamboo, lanterns, torii silhouette, ripples, and UI shapes.
- **Verify:**
  - Movement direction matches player input and the koi visibly advances one grid cell per tick.
  - Food pickup is visible, score increments, and the body grows.
  - Restart clears the board and restores the opening state.
  - Pause prevents movement and resumes without a state jump.
  - UI is readable with no overlap or overflow at 1280x720 and a narrow mobile viewport.
  - No missing textures, obvious fallback materials, or browser console errors during capture.
  - Reference consistency: top-down composition, indigo/jade/terracotta/paper-cream palette, calm garden density, and central playfield.
  - **Presentation proof bundle:** screenshots captured from the running WebDev preview, including an opening state and a deterministic `?demo` gameplay state.

## Gameplay Contract

- Board: 22 columns x 14 rows, centered in the pond.
- Start: koi begins near the lower-left quadrant moving east, food spawns in free cells.
- Speed: starts at 6 moves per second and increases gently with each pickup.
- Controls: Arrow keys or WASD; Space toggles pause; R restarts.
- Game over: wall collision or collision with the koi's own body.
- Demo: `?demo` runs a deterministic loop that collects food and demonstrates growth/ripples without requiring manual input.

## Completion Checklist

- `pnpm check` passes.
- `pnpm build` passes.
- WebDev preview renders without runtime errors.
- Screenshots show a playable, polished game state.
- Final checkpoint is saved before handoff.
- GitHub repository is public and includes a useful README.
