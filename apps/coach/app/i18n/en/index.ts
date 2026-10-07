/** All UI strings, English. Shape is fixed by `Dict` in ../de. */
import { formats } from "@/app/format";
import type { Dict } from "../de";
import { auth } from "./auth";
import { fehler } from "./fehler";

export const en: Dict = {
  fmt: formats("en"),

  common: {
    appName: "PTHREE",
    save: "Save",
    saving: "Saving …",
    cancel: "Cancel",
    close: "Close",
    delete: "Delete",
    back: "Back",
    later: "Later",
    signOut: "Sign out",
    toHome: "PTHREE — home",
    metaDescription: "The operating system for freelance personal trainers",
  },

  auth,
  fehler,

  language: {
    label: "Language",
    en: "English",
    de: "Deutsch",
  },
};
