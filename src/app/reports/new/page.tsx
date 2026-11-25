import { getRefs } from "@/lib/data";
import { hasDb } from "@/lib/supabase";
import { hasAI } from "@/lib/gemini";
import { PageTitle, SetupNotice } from "@/components/ui";
import NewReportForm from "@/components/NewReportForm";

export const dynamic = "force-dynamic";

export default async function NewReport() {
  if (!hasDb()) return <SetupNotice what="db" />;
  const refs = await getRefs();
  return (
    <div>
      <PageTitle title="보고서 작성" sub="정비 메모를 적으면 AI가 비슷한 과거 보고서를 참고해 양식에 맞는 초안을 만듭니다. 고친 뒤 저장하세요." />
      {!hasAI() && <div className="mb-4"><SetupNotice what="ai" /></div>}
      <NewReportForm departments={refs.departments} vehicles={refs.vehicles} parts={refs.parts} aiEnabled={hasAI()} />
    </div>
  );
}
