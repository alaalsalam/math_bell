import { useParams } from "react-router-dom";
import PageShell from "../components/PageShell";

function SkillsPage() {
  const { grade, domain } = useParams();

  return (
    <PageShell title="المهارات" subtitle={`الصف ${grade || "-"} / ${domain || "-"}`}>
      <p>جاري تجهيز شاشة المهارات.</p>
    </PageShell>
  );
}

export default SkillsPage;
