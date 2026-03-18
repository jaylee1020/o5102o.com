import {
  FilesetResolver,
  HandLandmarker
} from "../vendor/mediapipe/tasks-vision/vision_bundle.mjs";

const WASM_ROOT = new URL("../vendor/mediapipe/tasks-vision/wasm/", import.meta.url).toString();
const MODEL_ASSET_PATH = new URL("../assets/models/hand_landmarker.task", import.meta.url).toString();

export function createHandTracker() {
  let handLandmarker = null;
  let ready = false;
  let initializationPromise = null;
  let lifecycleToken = 0;

  async function initialize() {
    if (ready && handLandmarker) {
      return;
    }

    if (!initializationPromise) {
      const token = lifecycleToken;
      initializationPromise = (async () => {
        const vision = await FilesetResolver.forVisionTasks(WASM_ROOT);
        const nextHandLandmarker = await HandLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: MODEL_ASSET_PATH
          },
          runningMode: "VIDEO",
          numHands: 2,
          minHandDetectionConfidence: 0.45,
          minHandPresenceConfidence: 0.45,
          minTrackingConfidence: 0.45
        });

        if (token !== lifecycleToken) {
          nextHandLandmarker.close?.();
          return;
        }

        handLandmarker = nextHandLandmarker;
        ready = true;
      })().finally(() => {
        initializationPromise = null;
      });
    }

    await initializationPromise;
  }

  function detect(video, timestamp) {
    if (!ready || !handLandmarker) {
      return {
        landmarks: [],
        handedness: []
      };
    }

    return handLandmarker.detectForVideo(video, timestamp);
  }

  function isReady() {
    return ready;
  }

  function reset() {
    close();
  }

  function close() {
    lifecycleToken += 1;
    if (handLandmarker?.close) {
      handLandmarker.close();
    }

    handLandmarker = null;
    ready = false;
  }

  return {
    initialize,
    detect,
    isReady,
    reset,
    close
  };
}
