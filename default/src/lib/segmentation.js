import { FilesetResolver, ImageSegmenter } from '@mediapipe/tasks-vision';

const MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_segmenter/float16/latest/selfie_segmenter.tflite';
const WASM_ROOT =
  'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.18/wasm';

export async function createSegmentationEngine() {
  const vision = await FilesetResolver.forVisionTasks(WASM_ROOT);
  const segmenter = await ImageSegmenter.createFromOptions(vision, {
    baseOptions: {
      modelAssetPath: MODEL_URL,
      delegate: 'GPU'
    },
    runningMode: 'VIDEO',
    outputConfidenceMasks: true,
    outputCategoryMask: false
  });

  let lastTimestamp = 0;

  return {
    segment(video, timestamp) {
      const safeTimestamp = timestamp > lastTimestamp ? timestamp : lastTimestamp + 1;
      lastTimestamp = safeTimestamp;
      const result = segmenter.segmentForVideo(video, safeTimestamp);
      if (!result.confidenceMasks || result.confidenceMasks.length === 0) return null;
      const raw = result.confidenceMasks[0].getAsFloat32Array();
      return new Float32Array(raw);
    },
    close() {
      segmenter.close();
    }
  };
}
