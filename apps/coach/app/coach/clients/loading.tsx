import { Bar, Circle, HeaderSkeleton } from "@/app/skeletons";

export default function ClientsLoading() {
  return (
    <main className="pt-shell" style={{ paddingTop: 32 }}>
      <HeaderSkeleton />
      <div style={{ display: "grid", gap: 10 }}>
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="pt-card"
            style={{ display: "flex", alignItems: "center", gap: 14 }}
          >
            <Circle size={38} />
            <div style={{ flex: 1 }}>
              <Bar w={150} h={14} />
              <Bar w={230} h={11} mt={7} />
            </div>
            <Bar w={70} h={20} />
          </div>
        ))}
      </div>
    </main>
  );
}
