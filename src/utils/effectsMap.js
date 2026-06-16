export const COMBO_EFFECTS = {
  '0-0': 'hello',
  '0-1': 'xi',
  '1-0': 'xi',
  '1-1': 'heart',
  '5-5': 'orbit',
};

export function getEffectForCombo(comboKey, specialGesture) {
  if (specialGesture === 'Closed_Fist-Closed_Fist') {
    return 'rotatingBeam';
  }

  return COMBO_EFFECTS[comboKey] ?? 'particles';
}
