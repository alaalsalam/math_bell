function BubblePickGame({ question, disabled, onAnswer }) {
  const choices = Array.isArray(question?.choices) ? question.choices : [];

  return (
    <section className="runner-card">
      <h2>{question?.text || "سؤال"}</h2>
      <div className="choices-grid">
        {choices.map((choice, choiceIndex) => (
          <button
            type="button"
            key={`${choiceIndex}-${String(choice)}`}
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

export default BubblePickGame;
