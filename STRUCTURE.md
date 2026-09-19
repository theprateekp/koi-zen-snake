# Structure: Koi Zen Snake

## Runtime shape

`client/src/App.tsx` renders the game shell. `client/src/components/GameCanvas.tsx` owns the Babylon Engine lifecycle and mounts `client/src/game/scene.ts`. React owns the atmospheric HUD and action buttons; Babylon owns the pond, koi meshes, grid, food, ripples, garden props, and render loop.

## Gameplay modules

- `client/src/game/scene.ts` — creates the orthographic scene, camera, materials, lighting, garden props, and `GameWorld`; returns a lifecycle-safe `GameHandle`.
- `client/src/game/world.ts` — owns grid state, fixed-step movement, direction queue, food placement, score, best score, pause/game-over modes, demo autopilot, and event callbacks.
- `client/src/game/visuals.ts` — procedural Babylon mesh helpers for koi segments, grid, stones, bamboo, lanterns, food, and ripples.
- `client/src/game/input.ts` — semantic keyboard and touch direction input; prevents invalid reversals and exposes cleanup.
- `client/src/components/GameCanvas.tsx` — React/Babylon integration contract; engine is initialized once and disposed on unmount.

## Coordinate system

The pond is an X/Z plane with Y as height. Grid cells are integer columns and rows centered around the origin. An orthographic camera looks down from positive Y. The koi head uses the generated transparent sprite as an emissive billboard, while body segments are procedural rounded meshes with cream and terracotta materials.

## Asset hints

- Generated koi cutout: visual head anchor; rotate around Y to follow the heading.
- Generated water tile: diffuse/albedo texture for the playfield plane.
- All other garden objects are procedural because their geometric silhouettes are simple and benefit from crisp runtime layering.

## Verification hooks

`GameWorld` emits snapshots to React through `onStateChange`. A `?demo` URL flag selects a deterministic food pattern and autopilot turns. `GameCanvas` passes actions through a small callback surface so the HUD buttons remain accessible without coupling React into gameplay logic.
