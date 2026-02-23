import { useMemo, useState } from "react";

function FractionBuilderGame({ question, disabled, onAnswer, feedback }) {
  const payload = question?.payload || {};
  const parts = Math.max(1, Number(payload.parts || 1));
  const filled = Math.max(0, Number(payload.filled || 0));
  const choices = Array.isArray(payload.choices) ? payload.choices : [];

  const [selectedFilled, setSelectedFilled] = useState(filled);
  const feedbackValue = useMemo(() => String(feedback?.value ?? ""), [feedback?.value]);

  function toggleSlice(index) {
    setSelectedFilled(index + 1);
  }

  return (
    <section className="runner-card">
      <h2>{question?.text || "اختر الكسر الصحيح"}</h2>

      <div className={`fraction-visual colorful ${feedback?.status === "correct" ? "fraction-sparkle" : ""}`}>
        {Array.from({ length: parts }).map((_, idx) => (
          <button
            type="button"
            key={idx}
            className={`fraction-part ${idx < selectedFilled ? "filled" : ""}`}
            onClick={() => toggleSlice(idx)}
            disabled={disabled}
          />
        ))}
      </div>
      <small className="fraction-help">اسحب/اضغط لتلوين الأجزاء ثم اختر الكسر الصحيح</small>

      <div className="choices-grid">
        {choices.map((choice, idx) => {
          const isSelected = feedbackValue !== "" && String(choice) === feedbackValue;
          const classes = [
            "choice-btn",
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
              onClick={() => onAnswer({ value: choice, filled_preview: selectedFilled }, { hint_used: 0 })}
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

export default FractionBuilderGame;
