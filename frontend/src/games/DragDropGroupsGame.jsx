import { useMemo, useState } from "react";

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

function DragDropGroupsGame({ question, disabled, onAnswer, feedback }) {
  const payload = question?.payload || {};
  const a = Number(payload.a || 0);
  const b = Number(payload.b || 0);
  const choices = Array.isArray(payload.choices) ? payload.choices : [];

  const [pickedChoice, setPickedChoice] = useState(null);

  const op = useMemo(() => {
    if (String(question?.text || "").includes("طرح")) return "-";
    return "+";
  }, [question?.text]);

  function onDragStart(event, choice) {
    event.dataTransfer.setData("text/plain", String(choice));
  }

  function onDropChoice(event) {
    event.preventDefault();
    const value = event.dataTransfer.getData("text/plain");
    if (value === "") return;
    const parsed = Number(value);
    setPickedChoice(Number.isNaN(parsed) ? value : parsed);
  }

  function onCheck() {
    if (pickedChoice === null || pickedChoice === undefined) return;
    onAnswer({ value: pickedChoice }, { hint_used: 0 });
  }

  const droppedLabel = pickedChoice === null || pickedChoice === undefined ? "؟" : String(pickedChoice);
  const boxClasses = [
    "answer-drop-box",
    feedback?.status === "correct" ? "choice-pop" : "",
    feedback?.status === "wrong" ? "choice-shake" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <section className="runner-card">
      <h2>{question?.text || "اسحب الإجابة الصحيحة"}</h2>

      <div className="groups-visual">
        <div className="group-box">
          <DotGroup count={a} />
          <small>{a}</small>
        </div>
        <span className="op-sign">{op}</span>
        <div className="group-box">
          <DotGroup count={b} />
          <small>{b}</small>
        </div>
      </div>

      <div className={boxClasses} onDragOver={(e) => e.preventDefault()} onDrop={onDropChoice}>
        <p>صندوق الإجابة</p>
        <strong>{droppedLabel}</strong>
      </div>

      <div className="choices-grid">
        {choices.map((choice, idx) => (
          <button
            draggable
            type="button"
            key={`${idx}-${String(choice)}`}
            className="choice-btn drag-choice-btn"
            onDragStart={(e) => onDragStart(e, choice)}
            onClick={() => setPickedChoice(choice)}
            disabled={disabled}
          >
            {String(choice)}
          </button>
        ))}
      </div>

      <button type="button" className="primary-btn" onClick={onCheck} disabled={disabled || pickedChoice === null}>
        تحقق
      </button>
    </section>
  );
}

export default DragDropGroupsGame;
