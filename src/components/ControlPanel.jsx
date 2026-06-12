import { colorThemes, controlDefinitions, interactionModes } from '../settings.js';

export default function ControlPanel({ settings, onChange }) {
  // Convert slider strings back to numbers before saving them in React state.
  function handleNumberChange(key, value) {
    onChange(key, Number(value));
  }

  function handleThemeChange(theme) {
    onChange('theme', theme.name);
    onChange('color', theme.color);
    onChange('accent', theme.accent);
  }

  function handleCustomColor(color) {
    onChange('theme', 'Custom');
    onChange('color', color);
    onChange('accent', color);
  }

  return (
    <aside
      className="control-panel"
      aria-label="Particle control panel"
      style={{ '--panel-accent': settings.accent }}
    >
      <div className="panel-header">
        <span className="panel-kicker">Vibe Coding</span>
        <h1>Particle Field</h1>
      </div>

      <div className="mode-row" aria-label="Interaction modes">
        {interactionModes.map((mode) => (
          <button
            className="mode-button"
            data-active={settings.mode === mode.key}
            key={mode.key}
            onClick={() => onChange('mode', mode.key)}
            type="button"
          >
            {mode.label}
          </button>
        ))}
      </div>

      <div className="theme-row" aria-label="Color themes">
        {colorThemes.map((theme) => (
          <button
            className="theme-button"
            data-active={settings.theme === theme.name}
            key={theme.name}
            onClick={() => handleThemeChange(theme)}
            style={{ '--theme-color': theme.color, '--theme-accent': theme.accent }}
            type="button"
          >
            {theme.name}
          </button>
        ))}
      </div>

      <label className="color-row">
        <span>Custom Color</span>
        <input
          type="color"
          value={settings.color}
          onChange={(event) => handleCustomColor(event.target.value)}
        />
      </label>

      {controlDefinitions.map((control) => (
        <label className="control-row" key={control.key}>
          <span>{control.label}</span>
          <strong>{control.format(settings[control.key])}</strong>
          <input
            type="range"
            min={control.min}
            max={control.max}
            step={control.step}
            value={settings[control.key]}
            onChange={(event) => handleNumberChange(control.key, event.target.value)}
          />
        </label>
      ))}
    </aside>
  );
}
