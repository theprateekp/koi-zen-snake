import { ArcRotateCamera, Color3, Engine, HemisphericLight, Scene, Vector3 } from "@babylonjs/core";
import { GameSnapshot, GameWorld } from "./world";
import { DirectionName } from "./input";

export type GameHandle = {
  scene: Scene;
  dispose: () => void;
  start: () => void;
  togglePause: () => void;
  restart: () => void;
  setDirection: (direction: DirectionName) => void;
};

export type GameCallbacks = {
  onStateChange?: (snapshot: GameSnapshot) => void;
};

export async function createGameScene(engine: Engine, canvas: HTMLCanvasElement, callbacks: GameCallbacks = {}): Promise<GameHandle> {
  const scene = new Scene(engine);
  scene.clearColor = new Color3(0.028, 0.06, 0.09).toColor4(1);
  scene.ambientColor = new Color3(0.14, 0.19, 0.17);

  const camera = new ArcRotateCamera("zen-camera", -Math.PI / 2, 0.02, 20.5, Vector3.Zero(), scene);
  camera.mode = ArcRotateCamera.ORTHOGRAPHIC_CAMERA;
  camera.orthoLeft = -15;
  camera.orthoRight = 15;
  camera.orthoTop = 8.8;
  camera.orthoBottom = -8.8;
  camera.lowerRadiusLimit = camera.upperRadiusLimit = 20.5;
  camera.attachControl(canvas, false);
  camera.inputs.clear();

  const hemi = new HemisphericLight("garden-light", new Vector3(0.2, 1, -0.25), scene);
  hemi.intensity = 1.15;
  hemi.diffuse = new Color3(0.72, 0.86, 0.8);
  hemi.groundColor = new Color3(0.06, 0.12, 0.15);

  const world = new GameWorld(scene, callbacks.onStateChange ?? (() => undefined));
  const observer = scene.onBeforeRenderObservable.add(() => {
    world.update(scene.getEngine().getDeltaTime() / 1000);
  });

  return {
    scene,
    dispose: () => {
      scene.onBeforeRenderObservable.remove(observer);
      world.dispose();
      scene.dispose();
    },
    start: () => world.start(),
    togglePause: () => world.togglePause(),
    restart: () => world.restart(),
    setDirection: (direction) => world.queueDirection(direction),
  };
}
