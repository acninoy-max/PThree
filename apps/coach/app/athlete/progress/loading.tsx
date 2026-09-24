import { GymBar, GymCardSkeleton } from "../skeleton";

export default function ProgressLoading() {
  return (
    <main className="gym-shell" style={{ paddingTop: 26 }}>
      <GymBar w={120} h={10} />
      <GymBar w={180} h={26} mt={8} />
      <GymBar w={130} h={12} mt={8} />
      <div style={{ marginTop: 22 }}>
        <GymCardSkeleton lines={1} />
        <GymCardSkeleton lines={1} />
        <GymCardSkeleton lines={1} />
      </div>
    </main>
  );
}
