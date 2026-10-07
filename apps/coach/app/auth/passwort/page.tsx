import { AuthSchale } from "../schale";
import { AnfrageFormular } from "./anfrage-formular";

import { getT } from "@/app/i18n/server";

export function generateMetadata() {
  return { title: getT().auth.forgot.metaTitle };
}

export default function PasswortVergessenPage({
  searchParams,
}: {
  searchParams: { fehler?: string };
}) {
  const t = getT();
  return (
    <AuthSchale titel={t.auth.forgot.title} unterzeile={t.auth.forgot.subtitle}>
      <AnfrageFormular fehler={searchParams.fehler ?? null} />
    </AuthSchale>
  );
}
