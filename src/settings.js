export const colorThemes = [
  {
    name: 'Cyber Purple',
    color: '#c084fc',
    accent: '#f0abfc',
  },
  {
    name: 'Neon Blue',
    color: '#66e6ff',
    accent: '#38bdf8',
  },
  {
    name: 'Warm Gold',
    color: '#ffd166',
    accent: '#f59e0b',
  },
];

export const interactionModes = [
  {
    key: 'attract',
    label: 'Attract',
  },
  {
    key: 'repel',
    label: 'Repel',
  },
  {
    key: 'orbit',
    label: 'Orbit',
  },
  {
    key: 'explosion',
    label: 'Explosion',
  },
  {
    key: 'flow',
    label: 'Flow',
  },
];

export const defaultSettings = {
  mode: 'attract',
  particleCount: 220,
  speed: 1.2,
  spread: 150,
  trail: 0.5,
  size: 1,
  attraction: 1,
  color: colorThemes[1].color,
  accent: colorThemes[1].accent,
  theme: colorThemes[1].name,
};

export const controlDefinitions = [
  {
    key: 'particleCount',
    label: 'Particle Count',
    min: 40,
    max: 600,
    step: 10,
    format: (value) => value,
  },
  {
    key: 'speed',
    label: 'Speed',
    min: 0.2,
    max: 3,
    step: 0.1,
    format: (value) => value.toFixed(1),
  },
  {
    key: 'spread',
    label: 'Spread',
    min: 40,
    max: 320,
    step: 10,
    format: (value) => value,
  },
  {
    key: 'trail',
    label: 'Trail',
    min: 0,
    max: 1,
    step: 0.05,
    format: (value) => value.toFixed(2),
  },
  {
    key: 'size',
    label: 'Size',
    min: 0.5,
    max: 2.2,
    step: 0.1,
    format: (value) => value.toFixed(1),
  },
  {
    key: 'attraction',
    label: 'Attraction',
    min: 0,
    max: 2.5,
    step: 0.1,
    format: (value) => value.toFixed(1),
  },
];
