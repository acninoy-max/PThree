import { GymBar, GymCardSkeleton } from "../skeleton";

export default function AthleteScheduleLoading() {
  return (
    <main className="gym-shell" style={{ paddingTop: 22 }}>
      <GymBar w={70} h={12} />
      <GymBar w={170} h={24} mt={14} />
      <div style={{ marginTop: 20 }}>
        <GymCardSkeleton lines={1} />
        <GymCardSkeleton lines={1} />
        <GymCardSkeleton lines={1} />
      </div>
    </main>
  );
}
