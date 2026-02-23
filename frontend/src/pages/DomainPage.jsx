import { useNavigate, useParams } from "react-router-dom";
import PageShell from "../components/PageShell";

const DOMAINS = [
  { key: "Addition", label: "الجمع" },
  { key: "Subtraction", label: "الطرح" },
  { key: "Fractions", label: "الكسور" },
];

const GRADE_LABELS = {
  "1": "الصف الأول",
  "2": "الصف الثاني",
};

function DomainPage() {
  const navigate = useNavigate();
  const { grade } = useParams();

  return (
    <PageShell title={GRADE_LABELS[grade] || "اختر الصف"} subtitle="اختر المجال">
      <div className="grid-buttons">
        {DOMAINS.map((item) => (
          <button
            type="button"
            key={item.key}
            className="big-btn"
            onClick={() => navigate(`/g/${grade}/d/${item.key}`)}
          >
            {item.label}
          </button>
        ))}
      </div>
    </PageShell>
  );
}

export default DomainPage;
