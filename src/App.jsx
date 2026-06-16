import { useState } from 'react';
import ARCanvas from './components/ARCanvas.jsx';
import CameraBackground from './components/CameraBackground.jsx';
import ControlPanel from './components/ControlPanel.jsx';
import StatusOverlay from './components/StatusOverlay.jsx';
import { useGestureInput } from './hooks/useGestureInput.js';
import { defaultSettings } from './settings.js';

export default function App() {
  const [settings, setSettings] = useState(defaultSettings);
  const gestureInput = useGestureInput();

  // Update a single control value while keeping the other settings intact.
  function updateSetting(key, value) {
    setSettings((current) => ({
      ...current,
      [key]: value,
    }));
  }

  return (
    <main className="app-shell">
      <CameraBackground videoRef={gestureInput.videoRef} />
      <ARCanvas
        leftHand={gestureInput.leftHand}
        rightHand={gestureInput.rightHand}
        comboKey={gestureInput.comboKey}
        specialGesture={gestureInput.specialGesture}
        inputMode={gestureInput.inputMode}
        mousePoint={gestureInput.mousePoint}
        mousePointRef={gestureInput.mousePointRef}
        handsRef={gestureInput.handsRef}
        settings={settings}
      />
      <StatusOverlay
        inputMode={gestureInput.inputMode}
        leftHand={gestureInput.leftHand}
        rightHand={gestureInput.rightHand}
        comboKey={gestureInput.comboKey}
        specialGesture={gestureInput.specialGesture}
      />
      <ControlPanel settings={settings} onChange={updateSetting} />
    </main>
  );
}
