export type DirectionName = "north" | "south" | "west" | "east";

export type Direction = {
  name: DirectionName;
  x: number;
  z: number;
};

export const DIRECTIONS: Record<DirectionName, Direction> = {
  north: { name: "north", x: 0, z: -1 },
  south: { name: "south", x: 0, z: 1 },
  west: { name: "west", x: -1, z: 0 },
  east: { name: "east", x: 1, z: 0 },
};

const KEY_TO_DIRECTION: Record<string, DirectionName> = {
  ArrowUp: "north",
  w: "north",
  W: "north",
  ArrowDown: "south",
  s: "south",
  S: "south",
  ArrowLeft: "west",
  a: "west",
  A: "west",
  ArrowRight: "east",
  d: "east",
  D: "east",
};

export class InputManager {
  private readonly onDirection: (direction: DirectionName) => void;
  private readonly onPause: () => void;
  private readonly onRestart: () => void;
  private readonly onStart: () => void;
  private readonly onKeyDown: (event: KeyboardEvent) => void;

  constructor(options: {
    onDirection: (direction: DirectionName) => void;
    onPause: () => void;
    onRestart: () => void;
    onStart: () => void;
  }) {
    this.onDirection = options.onDirection;
    this.onPause = options.onPause;
    this.onRestart = options.onRestart;
    this.onStart = options.onStart;
    this.onKeyDown = (event) => {
      const direction = KEY_TO_DIRECTION[event.key];
      if (direction) {
        event.preventDefault();
        this.onStart();
        this.onDirection(direction);
        return;
      }
      if (event.code === "Space") {
        event.preventDefault();
        this.onPause();
      }
      if (event.key === "r" || event.key === "R") {
        event.preventDefault();
        this.onRestart();
      }
    };

    window.addEventListener("keydown", this.onKeyDown, { passive: false });
  }

  dispose() {
    window.removeEventListener("keydown", this.onKeyDown);
  }
}
