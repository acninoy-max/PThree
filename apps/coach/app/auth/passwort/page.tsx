import { AuthSchale } from "../schale";
import { AnfrageFormular } from "./anfrage-formular";

export const metadata = { title: "Passwort vergessen — PTHREE" };

export default function PasswortVergessenPage({
  searchParams,
}: {
  searchParams: { fehler?: string };
}) {
  return (
    <AuthSchale
      titel="Passwort vergessen"
      unterzeile="Wir schicken dir einen Link, mit dem du ein neues setzt."
    >
      <AnfrageFormular fehler={searchParams.fehler ?? null} />
    </AuthSchale>
  );
}
