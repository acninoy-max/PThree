/**
 * Ladekreis.
 *
 * Erbt Farbe und Größe vom Elternelement, damit er in jeden Knopf passt,
 * ohne dass man Farben nachpflegen muss. Bei „Bewegung reduzieren" pulst
 * er statt zu drehen — sichtbar bleibt er trotzdem.
 */
export function Spinner({
  size = 14,
  label = "Wird gespeichert",
}: {
  size?: number;
  label?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      role="status"
      aria-label={label}
      className="pt-spin"
      style={{ flex: "none" }}
    >
      <circle
        cx="12"
        cy="12"
        r="9"
        stroke="currentColor"
        strokeWidth="3"
        opacity="0.25"
      />
      <path
        d="M21 12a9 9 0 0 0-9-9"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}
