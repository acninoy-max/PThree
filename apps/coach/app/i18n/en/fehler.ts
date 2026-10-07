import type { Dict } from "../de";

export const fehler: Dict["fehler"] = {
  notFound: {
    metaTitle: "Page not found — PTHREE",
    title: "This page doesn't exist",
    body: "The address is wrong — a typo, or the link is no longer valid. Invitation links expire after 14 days and only work once; in that case, ask your coach for a new one.",
    back: "Back to the app",
  },
  crash: {
    title: "Something went wrong",
    body: "The page couldn't be loaded. A second try usually helps — especially on a weak connection.",
    bodyMore:
      "If it keeps happening, send your coach the reference below. It lets us look up exactly what happened.",
    retry: "Try again",
    home: "Go to start page",
    digest: "Reference",
  },
  noClient: {
    title: "There's no client account for this login.",
    signedInAs: "You're signed in as",
    hint: "If your coach invited you under a different address, sign out here and open the invitation link again.",
  },
  action: {
    notSignedIn: "Not signed in.",
    noClient: "No client account for this login.",
    invalidPath: "Invalid storage location.",
    photoNotFound: "Photo not found.",
    noExercise: "No exercise recorded.",
    noClientProfile: "No client profile found.",
    saveFailed: "Saving failed.",
    exerciseNotSaved: "The exercise couldn't be saved.",
    weightImplausible: "That weight doesn't look plausible.",
    cmImplausible: (what, value) =>
      `${what}: ${value} cm doesn't look plausible.`,
    maxEight: "At most eight exercises at once.",
    defaultSessionTitle: "Workout",
    photosNotDeleted:
      "The photos couldn't be deleted — so the withdrawal was not recorded. Please try again.",
  },
  db: {
    notSignedIn: "Not signed in.",
    coachAccount:
      "This is a coach account. Open the invitation in a private window and sign in with a different address.",
    inviteInvalid: "Invitation invalid or expired.",
    clientTaken:
      "This client is already linked to another account. Sign in with the address you used first — or ask your coach to remove the link.",
    linkFailed:
      "The link couldn't be set. Please tell your coach — it's not your fault.",
    noAccess: "No access to this client.",
    unknown: (raw) => `That didn't work: ${raw}`,
  },
};
