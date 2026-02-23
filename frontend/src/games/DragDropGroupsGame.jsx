function DotGroup({ count }) {
  const dots = Array.from({ length: Number(count || 0) });
  return (
    <div className="dot-group">
      {dots.map((_, idx) => (
        <span key={idx} className="dot" />
      ))}
    </div>
  );
}

function DragDropGroupsGame({ question, disabled, onAnswer }) {
  const payload = question?.payload || {};
  const a = Number(payload.a || 0);
  const b = Number(payload.b || 0);
  const choices = Array.isArray(payload.choices) ? payload.choices : [];

  return (
    <section className="runner-card">
      <h2>{question?.text || "اختر ناتج الجمع أو الطرح"}</h2>

      <div className="groups-visual">
        <div className="group-box">
          <DotGroup count={a} />
          <small>{a}</small>
        </div>
        <span className="op-sign">+</span>
        <div className="group-box">
          <DotGroup count={b} />
          <small>{b}</small>
        </div>
      </div>

      <div className="choices-grid">
        {choices.map((choice, idx) => (
          <button
            type="button"
            key={`${idx}-${String(choice)}`}
            className="choice-btn"
            onClick={() => onAnswer({ value: choice }, { hint_used: 0 })}
            disabled={disabled}
          >
            {String(choice)}
          </button>
        ))}
      </div>
    </section>
  );
}

export default DragDropGroupsGame;
