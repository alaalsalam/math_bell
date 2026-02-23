import { useNavigate } from "react-router-dom";
import PageShell from "../components/PageShell";

const GRADES = [
  { key: "1", label: "الصف الأول" },
  { key: "2", label: "الصف الثاني" },
];

function HomePage() {
  const navigate = useNavigate();

  return (
    <PageShell title="جرس الرياضيات" subtitle="اختر الصف">
      <div className="grid-buttons">
        {GRADES.map((item) => (
          <button
            type="button"
            key={item.key}
            className="big-btn"
            onClick={() => navigate(`/g/${item.key}`)}
          >
            {item.label}
          </button>
        ))}
      </div>
    </PageShell>
  );
}

export default HomePage;
