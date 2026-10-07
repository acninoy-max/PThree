import type { Dict } from "../de";

export const athlete: Dict["athlete"] = {
  home: {
    greeting: (hour) =>
      hour < 11 ? "Good morning" : hour < 18 ? "Hey 👋" : "Good evening",
    fallbackName: "Athlete",
    training: "Training",
    doneToday: "Done for today",
    exercises: (n) => `${n} ${n === 1 ? "exercise" : "exercises"}`,
    sets: (n) => `${n} ${n === 1 ? "set" : "sets"}`,
    nothingYet: "Nothing logged yet today",
    justStart: "Just get going — your coach can see it.",
    upNext: "Up next: ",
    addMore: "Add something",
    startDay: (title) => `Start ${title}`,
    startTraining: "Start training",
    viewPlan: "View full plan",
    nextAppointments: "Your next appointments",
    nextAppointment: "Next appointment",
    noAppointment: "No appointment scheduled. Your coach will be in touch.",
    checkinThisWeek: "This week's check-in",
    coachReplied: "Your coach replied",
    submitted: "Submitted",
    coachWillLook: "Your coach will take a look and get back to you.",
    stillOpen: "Still open",
    twoMinutes: "Two minutes: weight, energy, sleep, stress.",
    lastTrained: "Last session",
    byCoach: " · entered by your coach",
    reps: (n) => `${n} reps`,
  },
  plan: {
    yourPlan: "Your plan",
    noPlan: "No plan yet",
    noPlanBody:
      "Your coach hasn't set up a training plan yet. Until then you can train freely — your sessions still count.",
    freeTraining: "Free training",
    yourWeek: "Your week",
    sessionsThisWeek: (done, of) => `${done} of ${of} sessions this week`,
    thisWeek: "this week",
    flexibleHint:
      "Days without a fixed weekday are done whenever it suits you — they don't appear in the bar above.",
  },
  schedule: {
    back: "Back",
    title: "Your appointments",
    nothing: "Nothing scheduled",
    nothingBody: "As soon as your coach adds an appointment, it shows up here.",
    recent: "Recent",
    minutesShort: "min",
    inDays: (days) =>
      days === 0
        ? "today"
        : days === 1
          ? "tomorrow"
          : days < 7
            ? `in ${days} days`
            : days < 14
              ? "next week"
              : `in ${Math.round(days / 7)} weeks`,
    status: {
      completed: "Took place",
      no_show: "Missed",
      cancelled: "Cancelled",
      rescheduled: "Rescheduled",
    },
  },
  checkin: {
    back: "Back",
    title: "Check-in",
    week: (range) => `Week ${range}`,
    coachReplies: "Your coach's replies",
    coachReply: "Your coach's reply",
    scales: {
      energy: { label: "Energy", low: "drained", high: "fully charged" },
      sleep: { label: "Sleep", low: "poor", high: "restful" },
      stress: { label: "Stress", low: "relaxed", high: "maxed out" },
    },
    scaleAria: (label, n) => `${label}: ${n} of 5`,
    savedTitle: "Changes saved",
    sentTitle: "Check-in sent",
    savedBody: "Your coach will see the updated details.",
    sentBody:
      "Your coach will take a look and get back to you. The reply will appear here and on your start page.",
    toHome: "Go to start page",
    stayHere: "Stay here",
    alreadySent: "Sent — you can still make corrections.",
    weightPlaceholder: "e.g. 78.4",
    optional: "Optional. Leaving it empty is completely fine.",
    tape: "Tape measure",
    tapeHint: (weeks) =>
      `Every ${weeks} weeks. Measure exactly as described below — always the same way, otherwise the trend is just noise.`,
    cmPlaceholder: "e.g. 106.5",
    noteLabel: "What should your coach know?",
    notePlaceholder:
      "Knee twinges on squats, stressful week, nutrition went well …",
    saveChange: "Save changes",
    send: "Send check-in",
  },
  progress: {
    title: "Your progress",
    sessions: (n) => `${n} ${n === 1 ? "session" : "sessions"}`,
    setsTotal: (n) => `${n} sets in total`,
    beforeAfter: "Before — after",
    allPhotos: "All photos",
    photos: "Photos",
    firstPhoto:
      "Upload your first photo — from the second one on you'll see the comparison here.",
    photoInvite:
      "Before and after side by side. Only you and your coach can see them.",
    volumePerDay: "Volume per training day",
    noDayTwice: "No training day done twice yet.",
    dayChange: (percent, n) =>
      percent === null
        ? `${n} sessions recorded`
        : percent === 0
          ? `Same as last time · ${n} sessions`
          : `${Math.abs(percent)} % ${percent > 0 ? "more" : "less"} than last time · ${n} sessions`,
    bodyweightSets: (sets, reps) =>
      ` · plus ${sets} bodyweight sets (${reps} reps)`,
    bodyValues: "Body measurements",
    noValues: "No values reported yet.",
    reported: "Reported",
    yourExercises: "Your exercises",
    choose: "Choose",
    nothingYet: "Nothing here yet",
    nothingYetBody:
      "As soon as you log your first workout, you'll see your progress here — for every exercise you do.",
    noneChosen: "No exercise chosen",
    noneChosenBody:
      "Tap “Choose” above and pick what interests you. Everything you've ever tracked is listed there.",
    curveShows: "What the curve shows",
    noSessionsForThese: "No sessions for these exercises yet.",
    curveMeta: (n, last) =>
      `${n} ${n === 1 ? "session" : "sessions"} · last ${last}`,
    countedInReps: " · counted in reps",
    otherScale: (n) =>
      ` · ${n} older ${n === 1 ? "session" : "sessions"} on a different scale, not comparable`,
    fallbackExercise: "Exercise",
    picker: {
      tooMany: (max) => `More than ${max} curves become unreadable.`,
      aria: "Choose exercises for progress",
      intro: (n, max) =>
        `Everything you've ever tracked. Pick the ones that interest you — ${n} of at most ${max}.`,
      search: "Search",
      searchAria: "Search exercise",
      nothingFound: "Nothing found.",
      meta: (muscle, sets, last) =>
        `${muscle} · ${sets} ${sets === 1 ? "set" : "sets"} · last ${last}`,
      apply: "Apply",
      saving: "Saving",
    },
  },
  photos: {
    area: "Photos",
    backToProgress: "‹ Progress",
    agree: "I agree",
    moment: "One moment",
    noChange:
      "If you don't agree, nothing changes — the rest of the app works exactly the same.",
    uploadFailed: (reason) => `Upload failed: ${reason}`,
    saved: "Photo saved",
    unknownError: "Unknown error.",
    deleted: "Photo deleted",
    count: (n) =>
      n === 0 ? "No photos yet" : `${n} ${n === 1 ? "photo" : "photos"}`,
    onlyYou: "Only you and your coach can see them.",
    newPhoto: "New photo",
    takenOn: "Taken on",
    uploading: "Uploading",
    capture: (pose) => `Capture ${pose.toLowerCase()}`,
    shrinkHint:
      "The photo is resized on your device before it's uploaded. Location and device data stay here.",
    allPhotos: "All photos",
    deletePhoto: "Delete photo",
    revokeTitle: "Withdraw consent",
    grantedOn: (date) => `Given on ${date}. `,
    revokeBefore: "This deletes ",
    revokeAll: "all",
    revokeAfter:
      " of your photos — not hidden, but deleted. This can't be undone.",
    deleting: "Deleting",
    confirmDelete: (n) => `Yes, delete ${n} ${n === 1 ? "photo" : "photos"}`,
    revoke: "Withdraw",
    shrink: {
      process: "The photo couldn't be processed.",
      save: "The photo couldn't be saved.",
      read: "The file couldn't be read as an image.",
    },
  },
  profile: {
    area: "Profile",
    title: "Your details",
    saved: "Profile saved",
    photoSaved: "Photo saved",
    photoRemoved: "Photo removed",
    otherPhoto: "Different photo",
    choosePhoto: "Choose photo",
    remove: "Remove",
    name: "Name",
    birthDate: "Date of birth",
    email: "Email",
    emailPlaceholder: "you@example.com",
    loginHint: (address) =>
      `You sign in with ${address}. If you change the address here, we'll send you a confirmation link — only then does the new one apply.`,
    contactHint: "This is where your coach writes to you.",
    save: "Save",
    savedState: "Saved",
    since: (date) => `With us since ${date}. `,
    coachMaintains:
      "Your coach manages your level, goals and training plan — you can see them, but not change them here.",
    errors: {
      nameMissing: "Please enter your name.",
      emailInvalid: "This email address doesn't look valid.",
      birthDateImplausible: "That date of birth can't be right.",
      loginNotChanged:
        "Saved. Your sign-in address couldn't be changed — please contact your coach.",
      confirmSent: (address) =>
        `Saved. A confirmation email is on its way to ${address}. Until you click the link, you keep signing in with your old address.`,
    },
  },
  log: {
    needOneSet: "Enter at least one set with reps.",
    whatsUp: "What's on today?",
    coachPrepared:
      "Your coach has prepared the days. You can swap exercises within them.",
    due: "UP NEXT",
    flexible: "flexible",
    withCoach: "With coach",
    alone: "Solo",
    exercises: (n) => `${n} ${n === 1 ? "exercise" : "exercises"}`,
    freeTraining: "Free training",
    startSession: "Start session",
    confirmBody: (n, duration, withCoach) =>
      `${n} ${n === 1 ? "exercise" : "exercises"}, about ${duration}${
        withCoach ? ", with your coach" : ""
      }. The clock starts now.`,
    letsGo: "Let's go",
    back: "‹ Back",
    whatTraining: "What are you training?",
    swapHint: "Another exercise with the same pattern — your history continues.",
    recentlyUsed: "Recently used",
    byMuscle: "By muscle group",
    bestColon: "Best:",
    best: "Best",
    today: "Today",
    resumeClock: "Resume clock",
    pauseClock: "Pause clock",
    resume: "Resume",
    pause: "Pause",
    firstExercise:
      "Add your first exercise. The order is up to you — your coach will see later which patterns you trained.",
    swap: "swap",
    removeExercise: "Remove exercise",
    carryFrom: (date) => `from ${date} — use again`,
    bodyLoad: (kg) =>
      `Counts ${kg} kg of body weight. Only enter in the kg field what you add on top.`,
    noBodyWeight:
      "Enter your weight in the check-in — then this exercise counts with load instead of reps only.",
    deleteSet: (n) => `Delete set ${n}`,
    lastSetStays: "The last set stays — remove the exercise instead",
    deviation: (actual, planned) =>
      `${actual} instead of ${planned} sets — just for today. Your plan stays as it is; your coach sees what you actually did.`,
    on: (date) => `on ${date}`,
    addSet: "Add set",
    startRest: (duration) => `Start rest: ${duration}`,
    addExercise: "Add exercise",
    setsOf: (n, of) =>
      `${n} ${n === 1 ? "set" : "sets"}${of > 0 ? ` of ${of}` : ""}`,
    totalKg: (kg) => `${kg} kg total`,
    saving: "Saving …",
    finish: "Finish workout",
    allIn: "All done",
    notAllFilled: "Not everything filled in yet",
    doneBody: (sets, time) => `${sets} sets in ${time} minutes. Clean.`,
    incompleteBody: (actual, planned) =>
      `${actual} of ${planned} planned sets are entered. You can still finish — the session will then count as incomplete.`,
    sameAsLast: "Same as last time.",
    volumeVsLast: (percent, delta) =>
      `${Math.abs(percent)} % ${percent > 0 ? "more" : "less"} than last time (${delta}).`,
    newBests: (n) => (n === 1 ? "New best" : `${n} new bests`),
    save: "Save",
    finishAnyway: "Finish anyway",
    backToTraining: "Back to workout",
    restOver: "Rest over",
    rest: "Rest",
    restShorter: "Shorten rest by 15 seconds",
    restLonger: "Extend rest by 15 seconds",
    hide: "Hide",
    skipRest: "Skip rest",
    next: "Next",
    skip: "Skip",
  },
  numpad: {
    label: { weight: "Load (kg)", reps: "Reps", rir: "RIR" },
    hint: {
      weight: "Leave empty for bodyweight, or enter the added load.",
      reps: "How many did you do?",
      rir: "How many more could you have done? 0 means: none.",
    },
    addedAria: "Added weight (kg)",
    added: "Added (kg)",
    decimalSep: ".",
    decimalAria: "Decimal point",
    backspace: "Delete",
    done: "Done",
    next: "Next",
  },
};
