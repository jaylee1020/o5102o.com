import { FilesetResolver, GestureRecognizer } from '@mediapipe/tasks-vision';

const GESTURE_MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/gesture_recognizer/gesture_recognizer/float16/1/gesture_recognizer.task';
const WASM_ROOT =
  'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.18/wasm';

export async function createGestureEngine() {
  const vision = await FilesetResolver.forVisionTasks(WASM_ROOT);
  const recognizer = await GestureRecognizer.createFromOptions(vision, {
    baseOptions: {
      modelAssetPath: GESTURE_MODEL_URL,
      delegate: 'GPU'
    },
    runningMode: 'VIDEO',
    numHands: 2
  });

  let lastTimestamp = 0;

  return {
    detect(video, timestamp) {
      const safeTimestamp = timestamp > lastTimestamp ? timestamp : lastTimestamp + 1;
      lastTimestamp = safeTimestamp;
      const result = recognizer.recognizeForVideo(video, safeTimestamp);

      return {
        hands: result.landmarks ?? [],
        gestures: (result.gestures ?? []).map((candidates) => candidates?.[0]?.categoryName ?? 'None')
      };
    },
    close() {
      recognizer.close();
    }
  };
}
