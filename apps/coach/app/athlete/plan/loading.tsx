import { GymBar, GymCardSkeleton } from "../skeleton";

export default function AthletePlanLoading() {
  return (
    <main className="gym-shell" style={{ paddingTop: 26 }}>
      <GymBar w={110} h={12} />
      <GymBar w={170} h={24} mt={12} />
      <GymBar w="100%" h={56} mt={18} />
      <div style={{ marginTop: 26 }}>
        <GymCardSkeleton lines={4} />
        <GymCardSkeleton lines={4} />
      </div>
    </main>
  );
}
