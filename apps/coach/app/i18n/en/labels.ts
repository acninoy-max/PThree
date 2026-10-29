import type { Dict } from "../de";

export const labels: Dict["labels"] = {
  muscle: {
    chest: "Chest",
    back: "Back",
    shoulders: "Shoulders",
    biceps: "Biceps",
    triceps: "Triceps",
    quads: "Quads",
    hamstrings: "Hamstrings",
    calves: "Calves",
    glutes: "Glutes",
    core: "Core",
  },
  muscleOpen: "open",
  muscleAlso: "also",
  pattern: {
    push: "Upper-body push",
    pull: "Upper-body pull",
    squat: "Lower-body push",
    hinge: "Hip hinge",
    overhead: "Overhead press",
  },
  patternCore: "Core",
  block: {
    compound: "Compound",
    functional: "Functional",
    isolation: "Isolation",
    core: "Core",
  },
  coachingType: {
    personal: "Personal training: you measure in the gym",
    online: "Online coaching: client measures themselves",
    hybrid: "Both",
  },
  level: {
    beginner: "Beginner",
    intermediate: "Intermediate",
    pro: "Advanced",
  },
  measure: {
    shoulders: {
      label: "Shoulders",
      how: "Around the widest point, arms hanging loosely.",
    },
    chest: {
      label: "Chest",
      how: "At nipple height, at the end of a normal breath out.",
    },
    waist: { label: "Waist", how: "At belly-button height, don't suck in." },
    arm: {
      label: "Upper arm",
      how: "Right arm, flexed, at the thickest point.",
    },
    thigh: {
      label: "Thigh",
      how: "Right leg, one hand's width below the crotch.",
    },
    neck: {
      label: "Neck",
      how: "Just below the larynx, tape sloping slightly downward to the front.",
    },
    hip: {
      label: "Hips",
      how: "At the widest point of the buttocks, feet together.",
    },
  },
  bodyFatEstimated: "Body fat (estimated)",
  weight: "Weight",
  pose: { front: "Front", side: "Side", back: "Back" },
  location: {
    gym: "Gym",
    park: "Park",
    home: "Home",
    online: "Online",
  },
  apptStatus: {
    scheduled: "Scheduled",
    completed: "Completed",
    rescheduled: "Rescheduled",
    cancelled: "Cancelled",
    no_show: "No-show",
  },
  clientStatus: {
    active: "Active",
    paused: "Paused",
    archived: "Archived",
  },
  insightKind: {
    plateau: "Plateau",
    inactive: "Inactive",
    progress: "Progress",
  },
};
