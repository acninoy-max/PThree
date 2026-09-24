import { GymBar, GymCardSkeleton } from "./skeleton";

export default function AthleteLoading() {
  return (
    <main className="gym-shell" style={{ paddingTop: 26 }}>
      <GymBar w={100} h={10} />
      <GymBar w={160} h={26} mt={8} />
      <div style={{ marginTop: 22 }}>
        <GymCardSkeleton lines={1} />
        <GymCardSkeleton lines={1} />
        <GymCardSkeleton lines={0} />
      </div>
    </main>
  );
}
