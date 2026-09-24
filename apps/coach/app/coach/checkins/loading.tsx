import { Bar } from "@/app/skeletons";

export default function CheckInsLoading() {
  return (
    <main className="pt-shell" style={{ paddingTop: 32 }}>
      <div style={{ marginBottom: 20 }}>
        <Bar w={80} h={10} />
        <Bar w={240} h={26} mt={8} />
      </div>
      <div style={{ maxWidth: 680 }}>
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="pt-card" style={{ marginBottom: 12 }}>
            <Bar w={160} h={16} />
            <Bar w="45%" h={11} mt={8} />
            <Bar w="100%" h={40} mt={16} />
            <Bar w="80%" h={12} mt={14} />
            <Bar w="100%" h={64} mt={14} />
          </div>
        ))}
      </div>
    </main>
  );
}
