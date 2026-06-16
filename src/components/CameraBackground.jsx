export default function CameraBackground({ videoRef }) {
  return (
    <video
      ref={videoRef}
      className="camera-background"
      autoPlay
      muted
      playsInline
      aria-hidden="true"
    />
  );
}
