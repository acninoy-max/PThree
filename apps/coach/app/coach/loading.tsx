import {
  Bar,
  CardSkeleton,
  HeaderSkeleton,
  StatSkeleton,
} from "@/app/skeletons";

export default function FeedLoading() {
  return (
    <main className="pt-shell" style={{ paddingTop: 32 }}>
      <HeaderSkeleton />

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
          gap: 12,
          marginBottom: 28,
        }}
      >
        <StatSkeleton />
        <StatSkeleton />
        <StatSkeleton />
        <StatSkeleton />
      </div>

      {/* Dieselbe Klasse wie die geladene Seite — ein Ladebild, das
          anders umbricht als das Ergebnis, lässt das Layout springen. */}
      <div className="pt-split">
        <section>
          <Bar w={140} h={10} />
          <div style={{ marginTop: 12 }}>
            <CardSkeleton lines={3} />
            <CardSkeleton lines={2} />
            <CardSkeleton lines={2} />
          </div>
        </section>
        <aside>
          <Bar w={110} h={10} />
          <div style={{ marginTop: 12 }}>
            <CardSkeleton lines={1} />
          </div>
        </aside>
      </div>
    </main>
  );
}
