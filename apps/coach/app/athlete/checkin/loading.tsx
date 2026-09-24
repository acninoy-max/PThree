import { GymBar, GymCardSkeleton } from "../skeleton";

export default function AthleteCheckInLoading() {
  return (
    <main className="gym-shell" style={{ paddingTop: 22 }}>
      <GymBar w={70} h={12} />
      <GymBar w={140} h={24} mt={14} />
      <GymBar w={200} h={12} mt={8} />
      <div style={{ marginTop: 20 }}>
        <GymCardSkeleton lines={6} />
      </div>
    </main>
  );
}
