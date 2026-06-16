import { useState } from 'react';
import ParticleCanvas from './components/ParticleCanvas.jsx';
import ControlPanel from './components/ControlPanel.jsx';
import { useGestureInput } from './hooks/useGestureInput.js';
import { defaultSettings } from './settings.js';

export default function App() {
  const [settings, setSettings] = useState(defaultSettings);
  const gestureInput = useGestureInput();
  const effectiveSettings = {
    ...settings,
    mode: gestureInput.gestureMode ?? settings.mode,
  };

  // Update a single control value while keeping the other settings intact.
  function updateSetting(key, value) {
    setSettings((current) => ({
      ...current,
      [key]: value,
    }));
  }

  return (
    <main className="app-shell">
      <ParticleCanvas settings={effectiveSettings} inputPoint={gestureInput.point} />
      <div className="input-mode-badge" data-mode={gestureInput.inputMode}>
        <span>Input</span>
        <strong>{gestureInput.inputMode}</strong>
      </div>
      <ControlPanel settings={settings} onChange={updateSetting} />
    </main>
  );
}
