import { useParams } from "react-router-dom";
import PageShell from "../components/PageShell";

function ReportPage() {
  const { sessionId } = useParams();

  return (
    <PageShell title="النتيجة" subtitle={`Session: ${sessionId || "-"}`}>
      <p>جاري تجهيز شاشة التقرير.</p>
    </PageShell>
  );
}

export default ReportPage;
