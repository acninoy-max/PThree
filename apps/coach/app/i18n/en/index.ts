/** All UI strings, English. Shape is fixed by `Dict` in ../de. */
import { formats } from "../../format";
import type { Dict } from "../de";
import { auth } from "./auth";
import { fehler } from "./fehler";
import { labels } from "./labels";
import { athlete } from "./athlete";
import { engine } from "./engine";
import { coach } from "./coach";

export const en: Dict = {
  locale: "en",
  fmt: formats("en"),

  common: {
    appName: "PTHREE",
    save: "Save",
    saving: "Saving …",
    savingShort: "Saving",
    cancel: "Cancel",
    close: "Close",
    delete: "Delete",
    back: "Back",
    later: "Later",
    signOut: "Sign out",
    toHome: "PTHREE — home",
    metaDescription: "The operating system for freelance personal trainers",
    tempo: "Tempo",
    rest: "Rest",
    noFixedDay: "no fixed day",
    guided: "with coach",
    alone: "solo",
  },

  auth,
  fehler,
  labels,
  athlete,
  engine,
  coach,

  time: {
    since: (days) => {
      if (days === 0) return "started today";
      if (days === 1) return "started yesterday";
      if (days === -1) return "starts tomorrow";
      if (days < 0) return `starts in ${-days} days`;
      if (days < 14) return `${days} days in`;
      const weeks = Math.floor(days / 7);
      if (weeks < 9) return `${weeks} weeks in`;
      return `${Math.round(days / 30.44)} months in`;
    },
    duration: (minutes) => {
      if (minutes === 0) return "—";
      if (minutes < 60) return `${minutes} min`;
      if (minutes < 70) return "just over 1 h";
      const h = Math.floor(minutes / 60);
      const m = minutes % 60;
      return m === 0 ? `${h} h` : `${h}:${String(m).padStart(2, "0")} h`;
    },
    span: (days) => {
      if (days === 0) return "same day";
      if (days < 7) return `${days} ${days === 1 ? "day" : "days"}`;
      const w = Math.floor(days / 7);
      return `${w} ${w === 1 ? "week" : "weeks"}`;
    },
    approx: "approx.",
    minutes: "minutes",
    weekdayShort: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
    weekdayLong: [
      "Monday", "Tuesday", "Wednesday", "Thursday",
      "Friday", "Saturday", "Sunday",
    ],
  },

  chart: {
    ranges: { "1m": "1 month", "3m": "3 months", all: "All" },
    aria: (names) => `Trend of ${names}`,
    since: "since",
    metrics: { best: "Best", volume: "Volume" },
    metricHint: {
      best: "Best set per session, converted to a one-rep max.",
      volume:
        "All sets per session combined — load times reps. Exercises without a measurable load count in reps.",
    },
  },

  compare: {
    noPhoto: "No photo yet.",
    needTwo: "Only one photo in this view — a comparison needs two.",
    before: "Before",
    after: "After",
    notLoadable: "couldn't load",
    pick: (side) => `${side}: choose photo`,
  },

  nav: {
    main: "Main navigation",
    feed: "Feed",
    clients: "Clients",
    track: "Track",
    calendar: "Calendar",
    checkins: "Check-ins",
    exercises: "Exercises",
    today: "Today",
    plan: "Plan",
    checkin: "Check-in",
    progress: "Progress",
    profile: "Profile",
  },

  language: {
    label: "Language",
    en: "English",
    de: "Deutsch",
  },
};
