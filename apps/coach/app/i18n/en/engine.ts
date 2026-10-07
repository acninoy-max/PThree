import { formats } from "../../format";
import type { Dict } from "../de";
import { labels } from "./labels";

const f = formats("en");

export const engine: Dict["engine"] = {
  units: { kg: "kg", reps: "reps", cm: "cm" },
  volume: (kg) => `${f.integer(kg)} kg`,
  best: (b) =>
    b.isFirst ? "First result for this exercise" : `New best · +${b.percent} %`,
  bestShort: (b) => (b.isFirst ? "First time" : `+${b.percent} %`),
  insight: (i, name) => {
    const pattern = i.pattern ? labels.pattern[i.pattern] : labels.patternCore;
    const f = i.facts;
    if (f.kind === "plateau") {
      return {
        title: `${pattern} flat for ${f.window} sessions`,
        body: `${name} is no longer making measurable progress in this pattern. That's normal — time to pick a lever.`,
        action:
          "Increase volume, use an intensity technique, choose an exercise variation or switch equipment. Keep the pattern, change the angle.",
      };
    }
    if (f.kind === "inactive") {
      return f.daysSince === null
        ? {
            title: "No workout logged yet",
            body: `${name} hasn't logged anything since starting.`,
            action: "Send a short message and confirm the next appointment.",
          }
        : {
            title: `No workout logged for ${f.daysSince} days`,
            body: `${name}'s last session was ${f.daysSince} days ago.`,
            action: "Send a short message and confirm the next appointment.",
          };
    }
    return {
      title: `${pattern}: up ${f.growthPercent} percent`,
      body: `${name} improved compared to the previous session.`,
      action: null,
    };
  },
  volumeChange: (c) => {
    if (!c.previous) {
      return c.current.volumeKg > 0
        ? "First time on this day — this is your benchmark."
        : "First time on this day.";
    }
    if (c.percent === null) return "No weight last time — nothing to compare.";
    if (c.percent === 0) return "Same as last time.";
    const kg = f.integer(Math.abs(c.deltaKg));
    return c.percent > 0
      ? `${c.percent} % more than last time (+${kg} kg)`
      : `${Math.abs(c.percent)} % less than last time (−${kg} kg)`;
  },
};
