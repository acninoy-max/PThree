/** Ladeplatzhalter im Gym-Theme. */
export function GymBar({
  w = "100%",
  h = 14,
  mt = 0,
}: {
  w?: string | number;
  h?: number;
  mt?: number;
}) {
  return (
    <div className="gym-skel" style={{ width: w, height: h, marginTop: mt }} />
  );
}

export function GymCardSkeleton({ lines = 2 }: { lines?: number }) {
  return (
    <div className="gym-card" style={{ marginBottom: 12 }}>
      <GymBar w={80} h={10} />
      <GymBar w="70%" h={19} mt={12} />
      {Array.from({ length: lines }).map((_, i) => (
        <GymBar key={i} w={i === lines - 1 ? "50%" : "85%"} h={12} mt={8} />
      ))}
    </div>
  );
}
