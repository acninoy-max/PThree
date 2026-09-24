import { Bar } from "@/app/skeletons";

export default function PlanLoading() {
  return (
    <main className="pt-shell" style={{ paddingTop: 32 }}>
      <Bar w={120} h={11} />
      <Bar w={90} h={10} mt={16} />
      <Bar w={260} h={26} mt={8} />
      <Bar w={200} h={12} mt={8} />
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
          gap: 14,
          marginTop: 24,
        }}
      >
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="pt-card">
            <Bar w="55%" h={16} />
            <Bar w="100%" h={54} mt={14} />
            <Bar w="100%" h={54} mt={6} />
            <Bar w="100%" h={38} mt={12} />
          </div>
        ))}
      </div>
    </main>
  );
}
