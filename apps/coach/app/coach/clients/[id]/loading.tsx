import { Bar, CardSkeleton, Circle } from "@/app/skeletons";

export default function ClientDetailLoading() {
  return (
    <main className="pt-shell" style={{ paddingTop: 32 }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 16,
          marginBottom: 26,
        }}
      >
        <Circle size={52} />
        <div>
          <Bar w={190} h={26} />
          <Bar w={260} h={12} mt={8} />
        </div>
      </div>

      {/* Dieselbe Klasse wie die geladene Akte. */}
      <div className="pt-split">
        <section>
          <Bar w={120} h={10} />
          <div style={{ marginTop: 12 }}>
            <CardSkeleton lines={3} />
            <CardSkeleton lines={2} />
          </div>
        </section>
        <div>
          <CardSkeleton lines={2} />
          <CardSkeleton lines={4} />
        </div>
      </div>
    </main>
  );
}
