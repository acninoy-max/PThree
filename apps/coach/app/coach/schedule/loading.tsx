import { Bar } from "@/app/skeletons";

export default function ScheduleLoading() {
  return (
    <main className="pt-shell" style={{ paddingTop: 32 }}>
      <div style={{ marginBottom: 20 }}>
        <Bar w={80} h={10} />
        <Bar w={280} h={26} mt={8} />
      </div>
      <div className="pt-week">
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="pt-daycol">
            <div style={{ marginBottom: 10 }}>
              <Bar w="60%" h={12} />
            </div>
            <Bar w="100%" h={54} />
            {i % 2 === 0 && <Bar w="100%" h={54} mt={6} />}
          </div>
        ))}
      </div>
    </main>
  );
}
