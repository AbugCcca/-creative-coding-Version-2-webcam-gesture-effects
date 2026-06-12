import { useState } from 'react';
import ParticleCanvas from './components/ParticleCanvas.jsx';
import ControlPanel from './components/ControlPanel.jsx';

const defaultSettings = {
  particleCount: 220,
  speed: 1.2,
  radius: 150,
  color: '#66e6ff',
};

export default function App() {
  const [settings, setSettings] = useState(defaultSettings);

  // Update a single control value while keeping the other settings intact.
  function updateSetting(key, value) {
    setSettings((current) => ({
      ...current,
      [key]: value,
    }));
  }

  return (
    <main className="app-shell">
      <ParticleCanvas settings={settings} />
      <ControlPanel settings={settings} onChange={updateSetting} />
    </main>
  );
}
