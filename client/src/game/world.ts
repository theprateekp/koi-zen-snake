import {
  Color3,
  Mesh,
  MeshBuilder,
  Scene,
  StandardMaterial,
  Texture,
  Vector3,
} from "@babylonjs/core";
import { Direction, DirectionName, DIRECTIONS, InputManager } from "./input";

export type GameStatus = "ready" | "running" | "paused" | "over";

export type GameSnapshot = {
  score: number;
  best: number;
  length: number;
  status: GameStatus;
  direction: DirectionName;
};

type Cell = { x: number; z: number };
type Ripple = { mesh: Mesh; age: number };

const BOARD_WIDTH = 22;
const BOARD_HEIGHT = 14;
const CELL_SIZE = 1;
const STEP_SECONDS = 1 / 6;
const KOI_TEXTURE = "/assets/koi-sprite.png";
const WATER_TEXTURE = "/assets/water-tile.png";

const sameCell = (a: Cell, b: Cell) => a.x === b.x && a.z === b.z;

export class GameWorld {
  readonly scene: Scene;
  readonly boardWidth = BOARD_WIDTH;
  readonly boardHeight = BOARD_HEIGHT;

  private readonly onStateChange: (snapshot: GameSnapshot) => void;
  private readonly demo: boolean;
  private readonly boardRoot: Mesh;
  private readonly waterMaterial: StandardMaterial;
  private readonly koiMaterial: StandardMaterial;
  private readonly bodyMaterial: StandardMaterial;
  private readonly bodyAltMaterial: StandardMaterial;
  private readonly rippleMaterial: StandardMaterial;
  private readonly foodMaterial: StandardMaterial;
  private readonly glowMaterial: StandardMaterial;
  private readonly input: InputManager;
  private readonly bodyMeshes: Mesh[] = [];
  private readonly ripples: Ripple[] = [];
  private readonly demoFoodSequence: Cell[] = [
    { x: 15, z: 3 },
    { x: 4, z: 3 },
    { x: 5, z: 10 },
    { x: 16, z: 10 },
    { x: 18, z: 5 },
    { x: 2, z: 7 },
  ];

  private headMesh: Mesh;
  private foodMesh: Mesh;
  private foodVein!: Mesh;
  private food: Cell = { x: 15, z: 3 };
  private snake: Cell[] = [];
  private direction: Direction = DIRECTIONS.east;
  private pendingDirections: DirectionName[] = [];
  private elapsed = 0;
  private foodCount = 0;
  private best = 0;
  private score = 0;
  private status: GameStatus = "ready";
  private pulse = 0;
  private rippleClock = 0;
  private demoSequenceIndex = 0;

  constructor(scene: Scene, onStateChange: (snapshot: GameSnapshot) => void) {
    this.scene = scene;
    this.demo = new URLSearchParams(window.location.search).has("demo");
    this.onStateChange = onStateChange;
    this.boardRoot = MeshBuilder.CreateBox("board-root", { size: 0.01 }, scene);
    this.boardRoot.isVisible = false;

    this.waterMaterial = new StandardMaterial("water-material", scene);
    const waterTexture = new Texture(WATER_TEXTURE, scene);
    waterTexture.uScale = 6;
    waterTexture.vScale = 4;
    this.waterMaterial.diffuseTexture = waterTexture;
    this.waterMaterial.diffuseColor = new Color3(0.72, 0.9, 0.86);
    this.waterMaterial.specularColor = new Color3(0.08, 0.16, 0.19);
    this.waterMaterial.specularPower = 48;

    this.koiMaterial = new StandardMaterial("koi-material", scene);
    this.koiMaterial.diffuseTexture = new Texture(KOI_TEXTURE, scene);
    this.koiMaterial.diffuseTexture.hasAlpha = true;
    this.koiMaterial.useAlphaFromDiffuseTexture = true;
    this.koiMaterial.backFaceCulling = false;
    this.koiMaterial.emissiveColor = new Color3(0.12, 0.05, 0.02);

    this.bodyMaterial = new StandardMaterial("body-material", scene);
    this.bodyMaterial.diffuseColor = new Color3(0.82, 0.3, 0.15);
    this.bodyMaterial.emissiveColor = new Color3(0.06, 0.015, 0.006);
    this.bodyAltMaterial = new StandardMaterial("body-alt-material", scene);
    this.bodyAltMaterial.diffuseColor = new Color3(0.93, 0.77, 0.54);
    this.bodyAltMaterial.emissiveColor = new Color3(0.08, 0.035, 0.012);

    this.rippleMaterial = new StandardMaterial("ripple-material", scene);
    this.rippleMaterial.diffuseColor = new Color3(0.7, 0.93, 0.87);
    this.rippleMaterial.emissiveColor = new Color3(0.34, 0.7, 0.62);
    this.rippleMaterial.alpha = 0.34;
    this.rippleMaterial.backFaceCulling = false;

    this.foodMaterial = new StandardMaterial("food-material", scene);
    this.foodMaterial.diffuseColor = new Color3(0.78, 0.18, 0.12);
    this.foodMaterial.emissiveColor = new Color3(0.22, 0.03, 0.01);

    this.glowMaterial = new StandardMaterial("glow-material", scene);
    this.glowMaterial.diffuseColor = new Color3(0.96, 0.72, 0.32);
    this.glowMaterial.emissiveColor = new Color3(0.78, 0.38, 0.08);

    this.createPond();
    this.createGarden();
    this.headMesh = this.createKoiHead();
    this.foodMesh = this.createFoodMesh();
    this.reset();

    this.input = new InputManager({
      onDirection: (direction) => this.queueDirection(direction),
      onPause: () => this.togglePause(),
      onRestart: () => this.restart(),
      onStart: () => this.start(),
    });

    if (this.demo) this.start();
    this.emitState();
  }

  update(deltaSeconds: number) {
    const safeDelta = Math.min(deltaSeconds, 0.1);
    this.pulse += safeDelta;
    this.rippleClock += safeDelta;
    if (this.status === "running") {
      this.elapsed += safeDelta;
      const stepDuration = Math.max(0.095, STEP_SECONDS - Math.min(this.foodCount * 0.008, 0.04));
      while (this.elapsed >= stepDuration) {
        this.elapsed -= stepDuration;
        if (this.demo) this.autoPilotDirection();
        this.step();
      }
    }
    this.animateFood();
    this.animateRipples(safeDelta);
  }

  start() {
    if (this.status === "over") return;
    if (this.status !== "running") {
      this.status = "running";
      this.emitState();
    }
  }

  togglePause() {
    if (this.status === "over" || this.status === "ready") return;
    this.status = this.status === "paused" ? "running" : "paused";
    this.emitState();
  }

  restart() {
    this.reset();
    this.status = this.demo ? "running" : "ready";
    this.emitState();
  }

  queueDirection(name: DirectionName) {
    const candidate = DIRECTIONS[name];
    const last = this.pendingDirections.length
      ? DIRECTIONS[this.pendingDirections[this.pendingDirections.length - 1]]
      : this.direction;
    if (candidate.x === -last.x && candidate.z === -last.z) return;
    if (candidate.name === last.name) return;
    if (this.pendingDirections.length < 2) this.pendingDirections.push(name);
    if (this.status === "ready") this.start();
  }

  dispose() {
    this.input.dispose();
    this.ripples.forEach((ripple) => ripple.mesh.dispose());
    this.bodyMeshes.forEach((mesh) => mesh.dispose());
    this.headMesh.dispose();
    this.foodMesh.dispose();
    this.foodVein.dispose();
    this.boardRoot.dispose();
  }

  private reset() {
    this.bodyMeshes.splice(0).forEach((mesh) => mesh.dispose());
    this.ripples.splice(0).forEach((ripple) => ripple.mesh.dispose());
    this.snake = [
      { x: 5, z: 8 },
      { x: 4, z: 8 },
      { x: 3, z: 8 },
    ];
    this.direction = DIRECTIONS.east;
    this.pendingDirections = [];
    this.elapsed = 0;
    this.foodCount = 0;
    this.score = 0;
    this.demoSequenceIndex = 0;
    this.food = this.demo ? this.demoFoodSequence[0] : this.findFreeCell();
    this.syncVisuals();
  }

  private step() {
    if (this.pendingDirections.length) {
      const next = this.pendingDirections.shift() as DirectionName;
      this.direction = DIRECTIONS[next];
    }
    const nextHead = {
      x: this.snake[0].x + this.direction.x,
      z: this.snake[0].z + this.direction.z,
    };
    const hitWall = nextHead.x < 0 || nextHead.x >= BOARD_WIDTH || nextHead.z < 0 || nextHead.z >= BOARD_HEIGHT;
    const willEat = sameCell(nextHead, this.food);
    const bodyToCheck = willEat ? this.snake : this.snake.slice(0, -1);
    const hitBody = bodyToCheck.some((segment) => sameCell(segment, nextHead));
    if (hitWall || hitBody) {
      this.status = "over";
      this.emitState();
      return;
    }

    this.snake.unshift(nextHead);
    if (willEat) {
      this.score += 10;
      this.foodCount += 1;
      this.best = Math.max(this.best, this.score);
      this.demoSequenceIndex = Math.min(this.demoSequenceIndex + 1, this.demoFoodSequence.length - 1);
      this.spawnFood();
    } else {
      this.snake.pop();
    }
    this.addRipple(nextHead);
    this.syncVisuals();
    this.emitState();
  }

  private spawnFood() {
    if (this.demo) {
      const desired = this.demoFoodSequence[this.demoSequenceIndex];
      this.food = this.isFree(desired) ? desired : this.findFreeCell();
      return;
    }
    this.food = this.findFreeCell();
  }

  private findFreeCell(): Cell {
    for (let attempt = 0; attempt < 500; attempt += 1) {
      const cell = {
        x: Math.floor(Math.random() * BOARD_WIDTH),
        z: Math.floor(Math.random() * BOARD_HEIGHT),
      };
      if (this.isFree(cell)) return cell;
    }
    return { x: BOARD_WIDTH - 2, z: BOARD_HEIGHT - 2 };
  }

  private isFree(cell: Cell) {
    return !this.snake.some((segment) => sameCell(segment, cell));
  }

  private autoPilotDirection() {
    const target = this.food;
    const options: DirectionName[] = [];
    if (target.x !== this.snake[0].x) options.push(target.x > this.snake[0].x ? "east" : "west");
    if (target.z !== this.snake[0].z) options.push(target.z > this.snake[0].z ? "south" : "north");
    options.push(this.direction.name, "east", "south", "west", "north");
    const next = options.find((name) => {
      const candidate = DIRECTIONS[name];
      if (candidate.x === -this.direction.x && candidate.z === -this.direction.z) return false;
      const cell = { x: this.snake[0].x + candidate.x, z: this.snake[0].z + candidate.z };
      return cell.x >= 0 && cell.x < BOARD_WIDTH && cell.z >= 0 && cell.z < BOARD_HEIGHT && !this.snake.slice(0, -1).some((part) => sameCell(part, cell));
    });
    if (next) this.direction = DIRECTIONS[next];
  }

  private syncVisuals() {
    const head = this.snake[0];
    this.headMesh.position = this.cellToWorld(head);
    this.headMesh.rotation.y = this.direction.name === "west" ? Math.PI : this.direction.name === "north" ? -Math.PI / 2 : this.direction.name === "south" ? Math.PI / 2 : 0;

    while (this.bodyMeshes.length < this.snake.length - 1) {
      const index = this.bodyMeshes.length;
      const segment = MeshBuilder.CreateSphere(`koi-segment-${index}`, { diameter: 0.78, segments: 12 }, this.scene);
      segment.parent = this.boardRoot;
      segment.material = index % 2 === 0 ? this.bodyMaterial : this.bodyAltMaterial;
      segment.scaling.y = 0.38;
      this.bodyMeshes.push(segment);
    }
    this.bodyMeshes.forEach((mesh, index) => {
      const segment = this.snake[index + 1];
      mesh.isVisible = Boolean(segment);
      if (segment) {
        mesh.position = this.cellToWorld(segment);
        mesh.scaling.x = index === this.bodyMeshes.length - 1 ? 0.7 : 0.86;
        mesh.scaling.z = mesh.scaling.x;
      }
    });
    const foodPosition = this.cellToWorld(this.food);
    this.foodMesh.position = foodPosition;
    this.foodVein.position = new Vector3(foodPosition.x, 0, foodPosition.z);
  }

  private cellToWorld(cell: Cell) {
    return new Vector3((cell.x - BOARD_WIDTH / 2 + 0.5) * CELL_SIZE, 0.16, (cell.z - BOARD_HEIGHT / 2 + 0.5) * CELL_SIZE);
  }

  private createPond() {
    const pond = MeshBuilder.CreateGround("pond", { width: BOARD_WIDTH * CELL_SIZE + 2.4, height: BOARD_HEIGHT * CELL_SIZE + 2.4, subdivisions: 2 }, this.scene);
    pond.material = this.waterMaterial;
    pond.parent = this.boardRoot;

    const lineMat = new StandardMaterial("grid-material", this.scene);
    lineMat.diffuseColor = new Color3(0.65, 0.88, 0.8);
    lineMat.emissiveColor = new Color3(0.13, 0.3, 0.25);
    lineMat.alpha = 0.18;
    for (let x = 0; x <= BOARD_WIDTH; x += 1) {
      const xPos = (x - BOARD_WIDTH / 2) * CELL_SIZE;
      const line = MeshBuilder.CreateLines(`grid-x-${x}`, { points: [new Vector3(xPos, 0.018, -BOARD_HEIGHT / 2), new Vector3(xPos, 0.018, BOARD_HEIGHT / 2)] }, this.scene);
      line.color = new Color3(0.42, 0.72, 0.66);
      line.alpha = 0.18;
      line.parent = this.boardRoot;
    }
    for (let z = 0; z <= BOARD_HEIGHT; z += 1) {
      const zPos = (z - BOARD_HEIGHT / 2) * CELL_SIZE;
      const line = MeshBuilder.CreateLines(`grid-z-${z}`, { points: [new Vector3(-BOARD_WIDTH / 2, 0.018, zPos), new Vector3(BOARD_WIDTH / 2, 0.018, zPos)] }, this.scene);
      line.color = new Color3(0.42, 0.72, 0.66);
      line.alpha = 0.18;
      line.parent = this.boardRoot;
    }
  }

  private createGarden() {
    const stoneMat = new StandardMaterial("stone-material", this.scene);
    stoneMat.diffuseColor = new Color3(0.24, 0.35, 0.3);
    stoneMat.emissiveColor = new Color3(0.025, 0.045, 0.035);
    const mossMat = new StandardMaterial("moss-material", this.scene);
    mossMat.diffuseColor = new Color3(0.25, 0.48, 0.3);
    mossMat.emissiveColor = new Color3(0.03, 0.08, 0.035);
    for (let x = -BOARD_WIDTH / 2 - 1.2; x <= BOARD_WIDTH / 2 + 1.2; x += 1.5) {
      for (const z of [-BOARD_HEIGHT / 2 - 1.15, BOARD_HEIGHT / 2 + 1.15]) this.createStone(new Vector3(x, 0.16, z), stoneMat, 0.9 + (Math.abs(x) % 1) * 0.25);
    }
    for (let z = -BOARD_HEIGHT / 2 + 0.2; z < BOARD_HEIGHT / 2; z += 1.65) {
      for (const x of [-BOARD_WIDTH / 2 - 1.05, BOARD_WIDTH / 2 + 1.05]) this.createStone(new Vector3(x, 0.18, z), stoneMat, 0.9);
    }

    [[-12, -7], [11, -5], [-11, 5], [11, 6]].forEach(([x, z], index) => this.createBamboo(new Vector3(x, 0.1, z), mossMat, index));
    this.createLantern(new Vector3(-13.2, 0.24, 0), -1);
    this.createLantern(new Vector3(13.2, 0.24, 0), 1);
    this.createTorii(new Vector3(0, 0.05, -9.2), mossMat);
  }

  private createStone(position: Vector3, material: StandardMaterial, scale: number) {
    const stone = MeshBuilder.CreateSphere(`stone-${position.x}-${position.z}`, { diameter: 1, segments: 10 }, this.scene);
    stone.position = position;
    stone.scaling = new Vector3(scale * 1.2, 0.42, scale * 0.72);
    stone.material = material;
    stone.parent = this.boardRoot;
  }

  private createBamboo(position: Vector3, material: StandardMaterial, index: number) {
    for (let i = 0; i < 3; i += 1) {
      const stalk = MeshBuilder.CreateCylinder(`bamboo-${index}-${i}`, { height: 3.2 + i * 0.5, diameter: 0.16, tessellation: 10 }, this.scene);
      stalk.position = new Vector3(position.x + (i - 1) * 0.42, 1.6, position.z + Math.sin(i) * 0.5);
      stalk.material = material;
      stalk.parent = this.boardRoot;
      for (let leaf = 0; leaf < 2; leaf += 1) {
        const blade = MeshBuilder.CreatePlane(`bamboo-leaf-${index}-${i}-${leaf}`, { width: 0.9, height: 0.18 }, this.scene);
        blade.position = new Vector3(stalk.position.x + (leaf ? 0.4 : -0.4), 2.4 + i * 0.12, stalk.position.z);
        blade.rotation.x = Math.PI / 2;
        blade.rotation.z = leaf ? 0.35 : -0.35;
        blade.material = material;
        blade.parent = this.boardRoot;
      }
    }
  }

  private createLantern(position: Vector3, side: number) {
    const post = MeshBuilder.CreateCylinder("lantern-post", { height: 1.9, diameter: 0.07, tessellation: 8 }, this.scene);
    post.position = new Vector3(position.x, 0.95, position.z);
    post.material = this.glowMaterial;
    post.parent = this.boardRoot;
    const glow = MeshBuilder.CreateSphere("lantern-glow", { diameter: 0.66, segments: 16 }, this.scene);
    glow.position = new Vector3(position.x, 1.68, position.z);
    glow.scaling.y = 1.25;
    glow.material = this.glowMaterial;
    glow.parent = this.boardRoot;
    const cap = MeshBuilder.CreateCylinder("lantern-cap", { height: 0.1, diameter: 0.84, tessellation: 8 }, this.scene);
    cap.position = new Vector3(position.x, 2.08, position.z);
    cap.material = this.glowMaterial;
    cap.parent = this.boardRoot;
    if (side < 0) cap.rotation.z = 0.03;
  }

  private createTorii(position: Vector3, material: StandardMaterial) {
    for (const x of [-1.55, 1.55]) {
      const post = MeshBuilder.CreateBox("torii-post", { width: 0.22, height: 2.7, depth: 0.22 }, this.scene);
      post.position = new Vector3(position.x + x, 1.35, position.z);
      post.material = material;
      post.parent = this.boardRoot;
    }
    const beam = MeshBuilder.CreateBox("torii-beam", { width: 3.8, height: 0.22, depth: 0.28 }, this.scene);
    beam.position = new Vector3(position.x, 2.45, position.z);
    beam.material = material;
    beam.parent = this.boardRoot;
    const beamTop = MeshBuilder.CreateBox("torii-top", { width: 4.35, height: 0.2, depth: 0.35 }, this.scene);
    beamTop.position = new Vector3(position.x, 2.9, position.z);
    beamTop.material = material;
    beamTop.parent = this.boardRoot;
  }

  private createKoiHead() {
    const head = MeshBuilder.CreatePlane("koi-head", { width: 1.2, height: 1.05 }, this.scene);
    head.rotation.x = Math.PI / 2;
    head.position.y = 0.22;
    head.material = this.koiMaterial;
    head.parent = this.boardRoot;
    return head;
  }

  private createFoodMesh() {
    const leaf = MeshBuilder.CreateDisc("maple-leaf", { radius: 0.34, tessellation: 6 }, this.scene);
    leaf.rotation.x = Math.PI / 2;
    leaf.position.y = 0.22;
    leaf.material = this.foodMaterial;
    leaf.parent = this.boardRoot;
    const vein = MeshBuilder.CreateLines("maple-vein", { points: [new Vector3(0, 0.24, -0.24), new Vector3(0, 0.24, 0.24)] }, this.scene);
    vein.color = new Color3(0.97, 0.76, 0.34);
    vein.parent = this.boardRoot;
    this.foodVein = vein;
    return leaf;
  }

  private animateFood() {
    if (!this.foodMesh) return;
    const wave = Math.sin(this.pulse * 3.2) * 0.08;
    this.foodMesh.scaling = new Vector3(1 + wave * 0.35, 1, 1 + wave * 0.35);
    this.foodMesh.position.y = 0.22 + Math.sin(this.pulse * 2.4) * 0.025;
    this.foodVein.position.y = Math.sin(this.pulse * 2.4) * 0.025;
  }

  private addRipple(cell: Cell) {
    const ripple = MeshBuilder.CreateTorus("ripple", { diameter: 0.9, thickness: 0.025, tessellation: 48 }, this.scene);
    ripple.rotation.x = Math.PI / 2;
    ripple.position = new Vector3(this.cellToWorld(cell).x, 0.08, this.cellToWorld(cell).z);
    ripple.material = this.rippleMaterial;
    ripple.parent = this.boardRoot;
    this.ripples.push({ mesh: ripple, age: 0 });
    if (this.ripples.length > 8) this.ripples.shift()?.mesh.dispose();
  }

  private animateRipples(deltaSeconds: number) {
    for (let index = this.ripples.length - 1; index >= 0; index -= 1) {
      const ripple = this.ripples[index];
      ripple.age += deltaSeconds;
      const progress = Math.min(ripple.age / 1.1, 1);
      ripple.mesh.scaling = new Vector3(0.75 + progress * 1.7, 1, 0.75 + progress * 1.7);
      ripple.mesh.visibility = 1 - progress;
      if (progress >= 1) {
        ripple.mesh.dispose();
        this.ripples.splice(index, 1);
      }
    }
  }

  private emitState() {
    this.onStateChange({ score: this.score, best: this.best, length: this.snake.length, status: this.status, direction: this.direction.name });
  }
}
