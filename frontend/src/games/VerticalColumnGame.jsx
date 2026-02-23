function VerticalColumnGame({ question, disabled, onAnswer, feedback }) {
  const payload = question?.payload || {};
  const op = payload.op || "+";
  const a = Number(payload.a || 0);
  const b = Number(payload.b || 0);
  const choices = Array.isArray(payload.choices) ? payload.choices : [];

  const feedbackValue = String(feedback?.value ?? "");

  return (
    <section className="runner-card">
      <h2>{question?.text || "احسب عموديًا"}</h2>

      <div className="column-math playful-column">
        <div className="row">{a}</div>
        <div className="row">{op} {b}</div>
        <div className="line" />
        <div className="row">؟</div>
        <small className="carry-hint">تلميح بصري: تابعي الأعمدة من اليمين ✏️</small>
      </div>

      <div className="choices-grid">
        {choices.map((choice, idx) => {
          const isSelected = feedbackValue !== "" && String(choice) === feedbackValue;
          const classes = [
            "choice-btn",
            "pencil-choice-btn",
            feedback?.status === "correct" && isSelected ? "choice-pop" : "",
            feedback?.status === "wrong" && isSelected ? "choice-shake" : "",
          ]
            .filter(Boolean)
            .join(" ");

          return (
            <button
              type="button"
              key={`${idx}-${String(choice)}`}
              className={classes}
              onClick={() => onAnswer({ value: choice }, { hint_used: 0 })}
              disabled={disabled}
            >
              {String(choice)}
            </button>
          );
        })}
      </div>
    </section>
  );
}

export default VerticalColumnGame;
