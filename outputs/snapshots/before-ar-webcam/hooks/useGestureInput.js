import { useEffect, useRef, useState } from 'react';
import { FilesetResolver, GestureRecognizer } from '@mediapipe/tasks-vision';

const GESTURE_WASM_URL = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm';
const GESTURE_MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/gesture_recognizer/gesture_recognizer/float16/1/gesture_recognizer.task';

const GESTURE_TO_MODE = {
  Open_Palm: 'repel',
  Closed_Fist: 'attract',
};

const POINTER_IDLE_MS = 1200;
const GESTURE_IDLE_MS = 900;

function getInitialPoint() {
  if (typeof window === 'undefined') {
    return { x: 0, y: 0 };
  }

  return {
    x: window.innerWidth / 2,
    y: window.innerHeight / 2,
  };
}

function getPalmCenter(landmarks) {
  const palmLandmarks = [landmarks[0], landmarks[5], landmarks[9], landmarks[13], landmarks[17]].filter(
    Boolean,
  );
  const total = palmLandmarks.reduce(
    (sum, landmark) => ({
      x: sum.x + landmark.x,
      y: sum.y + landmark.y,
    }),
    { x: 0, y: 0 },
  );

  return {
    x: 1 - total.x / palmLandmarks.length,
    y: total.y / palmLandmarks.length,
  };
}

function toScreenPoint(normalizedPoint) {
  return {
    x: normalizedPoint.x * window.innerWidth,
    y: normalizedPoint.y * window.innerHeight,
  };
}

export function useGestureInput() {
  const [inputMode, setInputMode] = useState('Mouse');
  const [point, setPoint] = useState(getInitialPoint);
  const [gestureMode, setGestureMode] = useState(null);
  const mousePointRef = useRef(getInitialPoint());
  const lastMouseAtRef = useRef(performance.now());
  const lastGestureAtRef = useRef(-Infinity);

  useEffect(() => {
    function handlePointerMove(event) {
      const nextPoint = {
        x: event.clientX,
        y: event.clientY,
      };

      mousePointRef.current = nextPoint;
      lastMouseAtRef.current = performance.now();

      if (performance.now() - lastGestureAtRef.current > GESTURE_IDLE_MS) {
        setInputMode('Mouse');
        setGestureMode(null);
        setPoint(nextPoint);
      }
    }

    window.addEventListener('pointermove', handlePointerMove);

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
    };
  }, []);

  useEffect(() => {
    let recognizer = null;
    let stream = null;
    let video = null;
    let animationFrame = 0;
    let cancelled = false;

    async function startGestureRecognition() {
      if (!navigator.mediaDevices?.getUserMedia) {
        setInputMode('Mouse');
        return;
      }

      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: 'user',
            width: { ideal: 640 },
            height: { ideal: 480 },
          },
          audio: false,
        });

        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        video = document.createElement('video');
        video.muted = true;
        video.playsInline = true;
        video.srcObject = stream;
        await video.play();

        const vision = await FilesetResolver.forVisionTasks(GESTURE_WASM_URL);
        recognizer = await GestureRecognizer.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: GESTURE_MODEL_URL,
          },
          runningMode: 'VIDEO',
          numHands: 1,
        });

        function recognizeFrame() {
          if (cancelled || !recognizer || !video) {
            return;
          }

          const result = recognizer.recognizeForVideo(video, performance.now());
          const categoryName = result.gestures?.[0]?.[0]?.categoryName;
          const landmarks = result.landmarks?.[0];
          const mappedMode = GESTURE_TO_MODE[categoryName];

          if (mappedMode && landmarks?.length) {
            const gesturePoint = toScreenPoint(getPalmCenter(landmarks));

            lastGestureAtRef.current = performance.now();
            setInputMode('Gesture');
            setGestureMode(mappedMode);
            setPoint(gesturePoint);
          } else if (performance.now() - lastGestureAtRef.current > GESTURE_IDLE_MS) {
            setInputMode('Mouse');
            setGestureMode(null);
            setPoint(mousePointRef.current);
          }

          animationFrame = requestAnimationFrame(recognizeFrame);
        }

        animationFrame = requestAnimationFrame(recognizeFrame);
      } catch (error) {
        setInputMode('Mouse');
        setGestureMode(null);
        setPoint(mousePointRef.current);
      }
    }

    startGestureRecognition();

    return () => {
      cancelled = true;
      cancelAnimationFrame(animationFrame);
      recognizer?.close();
      stream?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  useEffect(() => {
    const interval = window.setInterval(() => {
      const now = performance.now();

      if (now - lastGestureAtRef.current <= GESTURE_IDLE_MS) {
        return;
      }

      if (now - lastMouseAtRef.current <= POINTER_IDLE_MS) {
        setInputMode('Mouse');
        setGestureMode(null);
        setPoint(mousePointRef.current);
      }
    }, 180);

    return () => {
      window.clearInterval(interval);
    };
  }, []);

  return {
    inputMode,
    point,
    gestureMode,
  };
}
