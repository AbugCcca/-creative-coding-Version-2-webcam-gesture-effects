export default function ControlPanel({ settings, onChange }) {
  // Convert slider strings back to numbers before saving them in React state.
  function handleNumberChange(key, value) {
    onChange(key, Number(value));
  }

  return (
    <aside className="control-panel" aria-label="粒子控制面板">
      <div className="panel-header">
        <span className="panel-kicker">Vibe Coding</span>
        <h1>Particle Field</h1>
      </div>

      <label className="control-row">
        <span>粒子数量</span>
        <strong>{settings.particleCount}</strong>
        <input
          type="range"
          min="40"
          max="600"
          step="10"
          value={settings.particleCount}
          onChange={(event) => handleNumberChange('particleCount', event.target.value)}
        />
      </label>

      <label className="control-row">
        <span>粒子速度</span>
        <strong>{settings.speed.toFixed(1)}</strong>
        <input
          type="range"
          min="0.2"
          max="3"
          step="0.1"
          value={settings.speed}
          onChange={(event) => handleNumberChange('speed', event.target.value)}
        />
      </label>

      <label className="control-row">
        <span>扩散半径</span>
        <strong>{settings.radius}</strong>
        <input
          type="range"
          min="40"
          max="320"
          step="10"
          value={settings.radius}
          onChange={(event) => handleNumberChange('radius', event.target.value)}
        />
      </label>

      <label className="color-row">
        <span>颜色</span>
        <input
          type="color"
          value={settings.color}
          onChange={(event) => onChange('color', event.target.value)}
        />
      </label>
    </aside>
  );
}
