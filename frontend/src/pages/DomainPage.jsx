import { useParams } from "react-router-dom";
import PageShell from "../components/PageShell";

function DomainPage() {
  const { grade } = useParams();

  return (
    <PageShell title="اختيار المجال" subtitle={`الصف: ${grade || "-"}`}>
      <p>جاري تجهيز شاشة المجالات.</p>
    </PageShell>
  );
}

export default DomainPage;
