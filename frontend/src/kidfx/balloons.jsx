function Balloons({ active }) {
  if (!active) return null;

  return (
    <div className="fx-layer balloons-layer" aria-hidden="true">
      {Array.from({ length: 8 }).map((_, idx) => (
        <span key={idx} className={`balloon balloon-${(idx % 4) + 1}`} style={{ left: `${10 + idx * 11}%` }} />
      ))}
    </div>
  );
}

export default Balloons;
