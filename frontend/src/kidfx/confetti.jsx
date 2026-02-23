function Confetti({ active }) {
  if (!active) return null;

  return (
    <div className="fx-layer" aria-hidden="true">
      {Array.from({ length: 24 }).map((_, idx) => (
        <span key={idx} className="confetti-piece" style={{ left: `${(idx * 4) % 100}%` }} />
      ))}
    </div>
  );
}

export default Confetti;
