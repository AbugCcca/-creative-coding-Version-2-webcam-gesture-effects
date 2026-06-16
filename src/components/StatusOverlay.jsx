function formatHand(label, hand) {
  const special = hand.specialGesture ? ` (${hand.specialGesture})` : '';

  return `${label}: ${hand.state} ${hand.gestureName}${special}`;
}

export default function StatusOverlay({ inputMode, leftHand, rightHand, comboKey, specialGesture }) {
  return (
    <aside className="status-overlay" data-mode={inputMode} aria-label="Gesture status">
      <div className="status-mode">
        <span>Input</span>
        <strong>{inputMode}</strong>
      </div>
      <div>{formatHand('Left', leftHand)}</div>
      <div>{formatHand('Right', rightHand)}</div>
      <div>Combo: {comboKey}</div>
      {specialGesture ? <div>Special: {specialGesture}</div> : null}
    </aside>
  );
}
