export const GESTURE_STATE = {
  Idle: 0,
  Pointing_Up: 1,
  Victory: 2,
  Three_Fingers: 3,
  Four_Fingers: 4,
  Open_Palm: 5,
};

export const GESTURE_LABELS = {
  0: 'Idle',
  1: 'Pointing_Up',
  2: 'Victory',
  3: 'Three_Fingers',
  4: 'Four_Fingers',
  5: 'Open_Palm',
};

const MIN_GESTURE_SCORE = 0.52;

export function createIdleHand() {
  return {
    state: 0,
    gestureName: 'Idle',
    specialGesture: null,
    score: 0,
    x: 0,
    y: 0,
    landmarks: [],
  };
}

function distance(first, second) {
  return Math.hypot(first.x - second.x, first.y - second.y);
}

function isFingerExtended(landmarks, tipIndex, pipIndex) {
  return landmarks[tipIndex].y < landmarks[pipIndex].y - 0.018;
}

function isThumbExtended(landmarks) {
  const wrist = landmarks[0];
  const thumbTip = landmarks[4];
  const thumbIp = landmarks[3];

  return distance(thumbTip, wrist) > distance(thumbIp, wrist) + 0.035;
}

export function countExtendedFingers(landmarks) {
  if (!landmarks?.length) {
    return 0;
  }

  const fingers = [
    isThumbExtended(landmarks),
    isFingerExtended(landmarks, 8, 6),
    isFingerExtended(landmarks, 12, 10),
    isFingerExtended(landmarks, 16, 14),
    isFingerExtended(landmarks, 20, 18),
  ];

  return fingers.filter(Boolean).length;
}

export function mapGestureCategory(category, landmarks) {
  const score = category?.score ?? 0;
  const categoryName = category?.categoryName ?? 'Unknown';
  const isConfident = score >= MIN_GESTURE_SCORE;
  const specialGesture = isConfident && categoryName === 'Closed_Fist' ? 'Closed_Fist' : null;
  let fingerCount = countExtendedFingers(landmarks);

  if (isConfident && categoryName === 'Pointing_Up') {
    fingerCount = 1;
  }

  if (isConfident && categoryName === 'Victory') {
    fingerCount = 2;
  }

  if (isConfident && categoryName === 'Open_Palm') {
    fingerCount = 5;
  }

  const state = fingerCount >= 1 && fingerCount <= 5 ? fingerCount : 0;
  const gestureName = specialGesture ?? (state === 0 ? 'Unknown' : GESTURE_LABELS[state]);

  return {
    state,
    gestureName,
    specialGesture,
    score,
  };
}

export function getComboKey(leftHand, rightHand) {
  return `${leftHand.state}-${rightHand.state}`;
}

export function getSpecialGesture(leftHand, rightHand) {
  if (leftHand.specialGesture === 'Closed_Fist' && rightHand.specialGesture === 'Closed_Fist') {
    return 'Closed_Fist-Closed_Fist';
  }

  if (leftHand.specialGesture === 'Closed_Fist') {
    return 'Left_Closed_Fist';
  }

  if (rightHand.specialGesture === 'Closed_Fist') {
    return 'Right_Closed_Fist';
  }

  return null;
}
