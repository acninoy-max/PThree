import { GymBar, GymCardSkeleton } from "../skeleton";

export default function LogLoading() {
  return (
    <main className="gym-shell" style={{ paddingTop: 26 }}>
      <GymBar w={130} h={10} />
      <GymBar w={140} h={26} mt={8} />
      <div style={{ marginTop: 22 }}>
        <GymCardSkeleton lines={1} />
        <GymCardSkeleton lines={2} />
      </div>
    </main>
  );
}
