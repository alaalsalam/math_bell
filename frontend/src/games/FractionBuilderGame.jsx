function FractionBuilderGame({ question, disabled, onAnswer }) {
  const payload = question?.payload || {};
  const parts = Math.max(1, Number(payload.parts || 1));
  const filled = Math.max(0, Number(payload.filled || 0));
  const choices = Array.isArray(payload.choices) ? payload.choices : [];

  return (
    <section className="runner-card">
      <h2>{question?.text || "اختر الكسر الصحيح"}</h2>

      <div className="fraction-visual">
        {Array.from({ length: parts }).map((_, idx) => (
          <span key={idx} className={`fraction-part ${idx < filled ? "filled" : ""}`} />
        ))}
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

export default FractionBuilderGame;
