export async function startFrontCamera(video) {
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error('Camera API is not available in this browser.');
  }

  const stream = await navigator.mediaDevices.getUserMedia({
    audio: false,
    video: {
      facingMode: 'user',
      width: { ideal: 1280 },
      height: { ideal: 720 }
    }
  });

  video.srcObject = stream;

  await new Promise((resolve) => {
    video.onloadedmetadata = async () => {
      await video.play();
      resolve();
    };
  });

  return stream;
}

export function stopCameraStream(stream) {
  if (!stream) return;
  stream.getTracks().forEach((track) => track.stop());
}
