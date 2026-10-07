import { Bar } from "@/app/skeletons";

export default function ExercisesLoading() {
  return (
    <main className="pt-shell" style={{ paddingTop: 32 }}>
      <Bar w={80} h={10} />
      <Bar w={280} h={26} mt={8} />
      <Bar w={320} h={38} mt={20} />
      <div style={{ maxWidth: 720, marginTop: 20, display: "grid", gap: 6 }}>
        {Array.from({ length: 10 }).map((_, i) => (
          <Bar key={i} w="100%" h={52} />
        ))}
      </div>
    </main>
  );
}
