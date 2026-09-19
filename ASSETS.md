# Assets

**Art direction:** Premium editorial game UI with an ukiyo-e and ink-wash influence. Deep midnight indigo pond water, jade accents, terracotta orange koi, paper-cream UI panels, muted gold lantern light, mossy stone framing, sparse garden silhouettes, and crisp top-down game-engine rendering. The visual target favors generous breathing room and a central, readable grid.

## Bundled Art

| Name | Description | Size | Repository path | Runtime URL |
|------|-------------|------|-----------------|-------------|
| reference | Visual target screenshot for composition and palette | 16:9 preview | `docs/koi-garden-preview.png` | README only |
| koi-sprite | Transparent orange-and-cream koi head sprite | 1.25 x 1.0 grid cells | `client/public/assets/koi-sprite.png` | `/assets/koi-sprite.png` |
| water-tile | Seamless low-contrast indigo pond texture | repeats over 22 x 14 cell playfield | `client/public/assets/water-tile.png` | `/assets/water-tile.png` |

## Procedural Runtime Art

| Name | Description | Size | Runtime role |
|------|-------------|------|--------------|
| ripple | Four concentric alpha rings | 0.6–2.2 cells | fades behind recent koi positions |
| stone | Rounded mossy border stones | 1.0–1.8 cells | frames the pond |
| bamboo | Clustered jade stalks and leaves | 2–3 cells | garden accents |
| lantern | Warm gold paper lantern with glow | 1 cell | side garden accents |
| maple-leaf | Terracotta food token with gold vein | 0.7 cell | collectible |
