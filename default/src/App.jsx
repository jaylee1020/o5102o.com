import { useEffect, useRef, useState } from 'react';
import { startFrontCamera, stopCameraStream } from './lib/camera';
import { createGestureEngine } from './lib/gesture';
import { createSegmentationEngine } from './lib/segmentation';
import { createMosaicCompositor } from './lib/mosaicCompositor';
import { createParticlePosterEngine } from './lib/particlePoster';

const GESTURES = [
  'Victory',
  'ILoveYou',
  'Thumb_Up',
  'Closed_Fist',
  'Open_Palm',
  'Pointing_Up'
];

export default function App() {
  const videoRef = useRef(null);
  const segCanvasRef = useRef(null);
  const canvasRef = useRef(null);
  const frameRef = useRef(0);
  const streamRef = useRef(null);
  const posterRef = useRef(null);
  const gestureRef = useRef(null);
  const segRef = useRef(null);
  const compositorRef = useRef(null);
  const cachedMaskRef = useRef(null);
  const frameCountRef = useRef(0);
  const [currentText, setCurrentText] = useState('');
  const [currentColors, setCurrentColors] = useState({ text: '#ffffff', boxes: ['#ffffff'] });
  const [borderRadius, setBorderRadius] = useState(0);
  const lastTextRef = useRef('');

  useEffect(() => {
    let mounted = true;

    async function boot() {
      try {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        streamRef.current = await startFrontCamera(video);
        if (!mounted) return;

        // Init mosaic compositor
        compositorRef.current = createMosaicCompositor(segCanvasRef.current);

        // Init particle poster
        posterRef.current = createParticlePosterEngine(canvas);
        const info = posterRef.current.getInfo();
        if (info.palette) {
          setCurrentText(info.text);
          setCurrentColors({ text: info.palette.text, boxes: info.palette.boxes });
          setBorderRadius(info.borderRadius || 0);
          lastTextRef.current = info.text;
        }

        // Init gesture + segmentation in parallel
        const [gestureEngine, segEngine] = await Promise.allSettled([
          createGestureEngine(),
          createSegmentationEngine()
        ]);
        if (!mounted) return;

        if (gestureEngine.status === 'fulfilled') {
          gestureRef.current = gestureEngine.value;
        } else {
          console.error('Gesture init failed:', gestureEngine.reason);
        }
        if (segEngine.status === 'fulfilled') {
          segRef.current = segEngine.value;
        } else {
          console.error('Segmentation init failed:', segEngine.reason);
        }

        const tick = (timestamp) => {
          if (!mounted || !videoRef.current || !posterRef.current) return;
          const video = videoRef.current;
          frameCountRef.current += 1;

          // Segmentation — run every 2nd frame, reuse mask on odd frames
          if (compositorRef.current && video.readyState >= 2) {
            if (segRef.current && frameCountRef.current % 2 === 0) {
              const mask = segRef.current.segment(video, timestamp);
              if (mask) {
                cachedMaskRef.current = {
                  data: mask,
                  width: video.videoWidth,
                  height: video.videoHeight
                };
              }
            }
            const cached = cachedMaskRef.current;
            if (cached) {
              compositorRef.current.render(video, cached.data, cached.width, cached.height);
            }
          }

          // Gesture
          if (gestureRef.current && video.readyState >= 2) {
            const { hands } = gestureRef.current.detect(video, timestamp);
            posterRef.current.setHands(hands);
          }

          // Particles
          posterRef.current.update(timestamp);

          const info = posterRef.current.getInfo();
          if (info.text && info.text !== lastTextRef.current) {
            lastTextRef.current = info.text;
            setCurrentText(info.text);
            setCurrentColors({ text: info.palette.text, boxes: info.palette.boxes });
            setBorderRadius(info.borderRadius || 0);
          }

          frameRef.current = window.requestAnimationFrame(tick);
        };

        frameRef.current = window.requestAnimationFrame(tick);
      } catch (caught) {
        if (!mounted) return;
        console.error(caught);
      }
    }

    boot();

    const handleResize = () => {
      compositorRef.current?.resize();
      posterRef.current?.resize();
    };

    window.addEventListener('resize', handleResize);
    window.visualViewport?.addEventListener('resize', handleResize);

    return () => {
      mounted = false;
      if (frameRef.current) window.cancelAnimationFrame(frameRef.current);
      window.removeEventListener('resize', handleResize);
      window.visualViewport?.removeEventListener('resize', handleResize);
      gestureRef.current?.close?.();
      segRef.current?.close?.();
      compositorRef.current?.destroy?.();
      posterRef.current?.destroy?.();
      stopCameraStream(streamRef.current);
    };
  }, []);

  const handleFullscreen = () => {
    const el = document.documentElement;
    if (!document.fullscreenElement) {
      (el.requestFullscreen || el.webkitRequestFullscreen)?.call(el);
    }
  };

  return (
    <main className="app-shell" onClick={handleFullscreen}>
      <video ref={videoRef} className="camera-layer camera-hidden" autoPlay muted playsInline />
      <canvas ref={segCanvasRef} className="segmentation-layer" />
      <canvas ref={canvasRef} className="poster-layer" />

      <div className="bottom-info">
        <div
          className="current-text-block"
          style={{
            background: currentColors.boxes[0] || '#333',
            color: currentColors.text,
            borderRadius: `${Math.round(borderRadius * 0.4)}px`
          }}
        >
          {currentText}
        </div>
      </div>
    </main>
  );
}
