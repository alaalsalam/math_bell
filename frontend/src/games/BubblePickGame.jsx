import { useMemo } from "react";

function BubblePickGame({ question, disabled, onAnswer, feedback, questionIndex = 0, totalQuestions = 1 }) {
  const choices = Array.isArray(question?.choices) ? question.choices : [];
  const current = Number(questionIndex || 0) + 1;
  const total = Math.max(1, Number(totalQuestions || 1));
  const progress = Math.min(100, Math.round((current / total) * 100));

  const feedbackValue = useMemo(() => String(feedback?.value ?? ""), [feedback?.value]);

  return (
    <section className="runner-card">
      <h2>{question?.text || "سؤال"}</h2>
      <div className="kid-progress-wrap">
        <span>😄</span>
        <div className="kid-progress-track">
          <div className="kid-progress-fill" style={{ width: `${progress}%` }} />
        </div>
        <span>🚀</span>
      </div>
      <div className="choices-grid">
        {choices.map((choice, choiceIndex) => {
          const isSelected = feedbackValue !== "" && String(choice) === feedbackValue;
          const classes = [
            "choice-btn",
            "bubble-choice-btn",
            feedback?.status === "correct" && isSelected ? "choice-pop" : "",
            feedback?.status === "wrong" && isSelected ? "choice-shake" : "",
          ]
            .filter(Boolean)
            .join(" ");

          return (
            <button
              type="button"
              key={`${choiceIndex}-${String(choice)}`}
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

export default BubblePickGame;
