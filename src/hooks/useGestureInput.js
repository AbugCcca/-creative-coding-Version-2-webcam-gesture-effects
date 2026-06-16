import { useEffect, useRef, useState } from 'react';
import { FilesetResolver, GestureRecognizer } from '@mediapipe/tasks-vision';
import {
  createIdleHand,
  getComboKey,
  getSpecialGesture,
  mapGestureCategory,
} from '../utils/gestureMapping.js';

const GESTURE_WASM_URL = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm';
const GESTURE_MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/gesture_recognizer/gesture_recognizer/float16/1/gesture_recognizer.task';

const STATE_UPDATE_MS = 100;
const HAND_SMOOTHING = 0.34;
const MOUSE_STATE_UPDATE_MS = 80;

function getInitialPoint() {
  if (typeof window === 'undefined') {
    return { x: 0, y: 0 };
  }

  return {
    x: window.innerWidth / 2,
    y: window.innerHeight / 2,
  };
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function mapVideoPointToScreen(point, video) {
  const videoWidth = video.videoWidth || 640;
  const videoHeight = video.videoHeight || 480;
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const scale = Math.max(viewportWidth / videoWidth, viewportHeight / videoHeight);
  const displayedWidth = videoWidth * scale;
  const displayedHeight = videoHeight * scale;
  const offsetX = (viewportWidth - displayedWidth) / 2;
  const offsetY = (viewportHeight - displayedHeight) / 2;

  return {
    x: clamp(offsetX + (1 - point.x) * displayedWidth, 0, viewportWidth),
    y: clamp(offsetY + point.y * displayedHeight, 0, viewportHeight),
    z: point.z ?? 0,
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
    x: total.x / palmLandmarks.length,
    y: total.y / palmLandmarks.length,
  };
}

function smoothValue(previous, next) {
  return previous + (next - previous) * HAND_SMOOTHING;
}

function smoothHand(previousHand, nextHand) {
  if (!nextHand || nextHand.landmarks.length === 0) {
    return createIdleHand();
  }

  if (!previousHand || previousHand.state === 0) {
    return nextHand;
  }

  return {
    ...nextHand,
    x: smoothValue(previousHand.x, nextHand.x),
    y: smoothValue(previousHand.y, nextHand.y),
    landmarks: nextHand.landmarks.map((landmark, index) => {
      const previousLandmark = previousHand.landmarks[index];

      if (!previousLandmark) {
        return landmark;
      }

      return {
        ...landmark,
        x: smoothValue(previousLandmark.x, landmark.x),
        y: smoothValue(previousLandmark.y, landmark.y),
      };
    }),
  };
}

function createHandFromResult(category, landmarks, video) {
  const mappedGesture = mapGestureCategory(category, landmarks);
  const screenLandmarks = landmarks.map((landmark) => mapVideoPointToScreen(landmark, video));
  const palmCenter = getPalmCenter(screenLandmarks);

  return {
    ...mappedGesture,
    x: palmCenter.x,
    y: palmCenter.y,
    landmarks: screenLandmarks,
  };
}

function assignHandsByScreenPosition(hands) {
  const idleLeft = createIdleHand();
  const idleRight = createIdleHand();

  if (hands.length === 0) {
    return {
      leftHand: idleLeft,
      rightHand: idleRight,
    };
  }

  if (hands.length === 1) {
    return hands[0].x < window.innerWidth / 2
      ? { leftHand: hands[0], rightHand: idleRight }
      : { leftHand: idleLeft, rightHand: hands[0] };
  }

  const sortedHands = [...hands].sort((first, second) => first.x - second.x);

  return {
    leftHand: sortedHands[0],
    rightHand: sortedHands[1],
  };
}

function createHandsState(leftHand = createIdleHand(), rightHand = createIdleHand(), inputMode = 'Mouse') {
  return {
    inputMode,
    leftHand,
    rightHand,
    comboKey: getComboKey(leftHand, rightHand),
    specialGesture: getSpecialGesture(leftHand, rightHand),
  };
}

export function useGestureInput() {
  const videoRef = useRef(null);
  const mousePointRef = useRef(getInitialPoint());
  const handsRef = useRef(createHandsState());
  const previousHandsRef = useRef({
    leftHand: createIdleHand(),
    rightHand: createIdleHand(),
  });
  const lastStateUpdateRef = useRef(0);
  const lastMouseStateUpdateRef = useRef(0);
  const [status, setStatus] = useState(() => createHandsState());
  const [mousePoint, setMousePoint] = useState(getInitialPoint);

  useEffect(() => {
    function handlePointerMove(event) {
      const nextPoint = {
        x: event.clientX,
        y: event.clientY,
      };

      mousePointRef.current = nextPoint;

      if (performance.now() - lastMouseStateUpdateRef.current > MOUSE_STATE_UPDATE_MS) {
        lastMouseStateUpdateRef.current = performance.now();
        setMousePoint(nextPoint);
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
    let animationFrame = 0;
    let cancelled = false;

    function publish(nextStatus, force = false) {
      handsRef.current = nextStatus;

      const now = performance.now();
      if (force || now - lastStateUpdateRef.current > STATE_UPDATE_MS) {
        lastStateUpdateRef.current = now;
        setStatus(nextStatus);
      }
    }

    function fallbackToMouse(force = false) {
      const nextStatus = createHandsState(createIdleHand(), createIdleHand(), 'Mouse');
      previousHandsRef.current = {
        leftHand: createIdleHand(),
        rightHand: createIdleHand(),
      };
      publish(nextStatus, force);
    }

    async function startGestureRecognition() {
      const video = videoRef.current;

      if (!video || !navigator.mediaDevices?.getUserMedia) {
        fallbackToMouse(true);
        return;
      }

      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: 'user',
            width: { ideal: 960 },
            height: { ideal: 720 },
          },
          audio: false,
        });

        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        video.srcObject = stream;
        await video.play();

        const vision = await FilesetResolver.forVisionTasks(GESTURE_WASM_URL);
        recognizer = await GestureRecognizer.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: GESTURE_MODEL_URL,
          },
          runningMode: 'VIDEO',
          numHands: 2,
        });

        function recognizeFrame() {
          if (cancelled || !recognizer || !video) {
            return;
          }

          const result = recognizer.recognizeForVideo(video, performance.now());
          const rawHands = (result.landmarks ?? []).map((landmarks, index) =>
            createHandFromResult(result.gestures?.[index]?.[0], landmarks, video),
          );

          if (rawHands.length === 0) {
            fallbackToMouse();
          } else {
            const assignedHands = assignHandsByScreenPosition(rawHands);
            const leftHand = smoothHand(previousHandsRef.current.leftHand, assignedHands.leftHand);
            const rightHand = smoothHand(previousHandsRef.current.rightHand, assignedHands.rightHand);
            const nextStatus = createHandsState(leftHand, rightHand, 'Gesture');

            previousHandsRef.current = {
              leftHand,
              rightHand,
            };
            publish(nextStatus);
          }

          animationFrame = requestAnimationFrame(recognizeFrame);
        }

        animationFrame = requestAnimationFrame(recognizeFrame);
      } catch (error) {
        fallbackToMouse(true);
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

  return {
    ...status,
    videoRef,
    handsRef,
    mousePoint,
    mousePointRef,
  };
}
