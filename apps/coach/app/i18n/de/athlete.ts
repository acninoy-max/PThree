/** Die Mobil-Oberfläche des Klienten. */
export const athlete = {
  home: {
    greeting: (hour: number): string =>
      hour < 11 ? "Guten Morgen" : hour < 18 ? "Hey 👋" : "Guten Abend",
    fallbackName: "Athlet",
    training: "Training",
    doneToday: "Heute erledigt",
    exercises: (n: number) => `${n} ${n === 1 ? "Übung" : "Übungen"}`,
    sets: (n: number) => `${n} ${n === 1 ? "Satz" : "Sätze"}`,
    nothingYet: "Heute noch nichts geloggt",
    justStart: "Leg einfach los — dein Coach sieht mit.",
    upNext: "Als Nächstes: ",
    addMore: "Noch was nachtragen",
    startDay: (title: string) => `${title} starten`,
    startTraining: "Training starten",
    viewPlan: "Ganzen Plan ansehen",
    nextAppointments: "Deine nächsten Termine",
    nextAppointment: "Nächster Termin",
    noAppointment: "Kein Termin geplant. Dein Coach meldet sich.",
    checkinThisWeek: "Check-in diese Woche",
    coachReplied: "Dein Coach hat geantwortet",
    submitted: "Abgeschickt",
    coachWillLook: "Dein Coach schaut drauf und meldet sich.",
    stillOpen: "Noch offen",
    twoMinutes: "Zwei Minuten: Gewicht, Energie, Schlaf, Stress.",
    lastTrained: "Zuletzt trainiert",
    byCoach: " · von deinem Trainer eingetragen",
    reps: (n: number) => `${n} Wdh.`,
  },
  plan: {
    yourPlan: "Dein Plan",
    noPlan: "Noch kein Plan",
    noPlanBody:
      "Dein Coach hat noch keinen Trainingsplan hinterlegt. Bis dahin kannst du frei trainieren — deine Einheiten zählen trotzdem.",
    freeTraining: "Freies Training",
    yourWeek: "Deine Woche",
    sessionsThisWeek: (done: number, of: number) =>
      `${done} von ${of} Einheiten diese Woche`,
    thisWeek: "diese Woche",
    flexibleHint:
      "Tage ohne festen Wochentag machst du, wann es passt — sie tauchen in der Leiste oben nicht auf.",
  },
  schedule: {
    back: "Zurück",
    title: "Deine Termine",
    nothing: "Nichts geplant",
    nothingBody: "Sobald dein Coach einen Termin einträgt, erscheint er hier.",
    recent: "Zuletzt",
    minutesShort: "Min",
    /** Wie viele Tage bis zum Termin — als Alltagssprache. */
    inDays: (days: number): string =>
      days === 0
        ? "heute"
        : days === 1
          ? "morgen"
          : days < 7
            ? `in ${days} Tagen`
            : days < 14
              ? "nächste Woche"
              : `in ${Math.round(days / 7)} Wochen`,
    status: {
      completed: "Stattgefunden",
      no_show: "Verpasst",
      cancelled: "Abgesagt",
      rescheduled: "Verschoben",
    } as Record<string, string>,
  },
  checkin: {
    back: "Zurück",
    title: "Check-in",
    week: (range: string) => `Woche ${range}`,
    coachReplies: "Antworten deines Coaches",
    coachReply: "Antwort deines Coaches",
    scales: {
      energy: { label: "Energie", low: "am Boden", high: "voll da" },
      sleep: { label: "Schlaf", low: "schlecht", high: "erholsam" },
      stress: { label: "Stress", low: "entspannt", high: "am Limit" },
    },
    scaleAria: (label: string, n: number) => `${label}: ${n} von 5`,
    savedTitle: "Änderung gespeichert",
    sentTitle: "Check-in abgeschickt",
    savedBody: "Dein Coach sieht die aktualisierten Angaben.",
    sentBody:
      "Dein Coach schaut drauf und meldet sich bei dir. Die Antwort erscheint hier und auf deiner Startseite.",
    toHome: "Zur Startseite",
    stayHere: "Hier bleiben",
    alreadySent: "Abgeschickt — du kannst noch korrigieren.",
    weightPlaceholder: "z. B. 78,4",
    optional: "Freiwillig. Leer lassen ist völlig in Ordnung.",
    tape: "Maßband",
    tapeHint: (weeks: number) =>
      `Alle ${weeks} Wochen. Miss so, wie es darunter steht — immer gleich, sonst ist der Verlauf nur Zufall.`,
    cmPlaceholder: "z. B. 106,5",
    noteLabel: "Was soll dein Coach wissen?",
    notePlaceholder:
      "Knie zwickt beim Squat, Woche war stressig, Ernährung lief gut …",
    saveChange: "Änderung speichern",
    send: "Check-in abschicken",
  },
  progress: {
    title: "Dein Fortschritt",
    sessions: (n: number) => `${n} ${n === 1 ? "Einheit" : "Einheiten"}`,
    setsTotal: (n: number) => `${n} Sätze insgesamt`,
    beforeAfter: "Vorher — Nachher",
    allPhotos: "Alle Fotos",
    photos: "Fotos",
    firstPhoto:
      "Lad dein erstes Bild hoch — ab dem zweiten siehst du hier den Vergleich.",
    photoInvite:
      "Vorher und Nachher nebeneinander. Nur du und dein Trainer sehen sie.",
    volumePerDay: "Volumen je Trainingstag",
    noDayTwice: "Noch kein Trainingstag zweimal gemacht.",
    /** Zeile unter dem Volumen eines Trainingstags. */
    dayChange: (prozent: number | null, n: number): string =>
      prozent === null
        ? `${n} Einheiten erfasst`
        : prozent === 0
          ? `Wie beim letzten Mal · ${n} Einheiten`
          : `${Math.abs(prozent)} % ${prozent > 0 ? "mehr" : "weniger"} als beim letzten Mal · ${n} Einheiten`,
    bodyweightSets: (sets: number, reps: number) =>
      ` · dazu ${sets} Sätze mit Körpergewicht (${reps} Wdh.)`,
    bodyValues: "Körperwerte",
    noValues: "Noch keine Werte gemeldet.",
    reported: "Gemeldet",
    yourExercises: "Deine Übungen",
    choose: "Auswählen",
    nothingYet: "Noch nichts da",
    nothingYetBody:
      "Sobald du dein erstes Training loggst, siehst du hier deine Entwicklung — für jede Übung, die du machst.",
    noneChosen: "Keine Übung gewählt",
    noneChosenBody:
      "Tipp oben auf „Auswählen“ und such dir aus, was dich interessiert. Alles, was du je getrackt hast, steht dort.",
    curveShows: "Was die Kurve zeigt",
    noSessionsForThese: "Noch keine Einheiten für diese Übungen.",
    curveMeta: (n: number, zuletzt: string) =>
      `${n} ${n === 1 ? "Einheit" : "Einheiten"} · zuletzt ${zuletzt}`,
    countedInReps: " · gezählt in Wiederholungen",
    otherScale: (n: number) =>
      ` · ${n} ältere ${n === 1 ? "Einheit" : "Einheiten"} auf anderer Skala, nicht vergleichbar`,
    fallbackExercise: "Übung",
    picker: {
      tooMany: (max: number) => `Mehr als ${max} Kurven kann man nicht mehr lesen.`,
      aria: "Übungen für den Fortschritt wählen",
      intro: (n: number, max: number) =>
        `Alles, was du je getrackt hast. Wähl die aus, die dich interessieren — ${n} von höchstens ${max}.`,
      search: "Suchen",
      searchAria: "Übung suchen",
      nothingFound: "Nichts gefunden.",
      meta: (muskel: string, sets: number, zuletzt: string) =>
        `${muskel} · ${sets} ${sets === 1 ? "Satz" : "Sätze"} · zuletzt ${zuletzt}`,
      apply: "Übernehmen",
      saving: "Speichert",
    },
  },
  photos: {
    area: "Fotos",
    backToProgress: "‹ Fortschritt",
    agree: "Einverstanden",
    moment: "Moment",
    noChange:
      "Wenn du nicht einverstanden bist, ändert sich nichts — der Rest der App funktioniert genauso.",
    uploadFailed: (grund: string) => `Hochladen fehlgeschlagen: ${grund}`,
    saved: "Bild gespeichert",
    unknownError: "Unbekannter Fehler.",
    deleted: "Bild gelöscht",
    count: (n: number) =>
      n === 0 ? "Noch keine Bilder" : `${n} ${n === 1 ? "Bild" : "Bilder"}`,
    onlyYou: "Nur du und dein Trainer sehen sie.",
    newPhoto: "Neues Bild",
    takenOn: "Aufgenommen am",
    uploading: "Lädt hoch",
    capture: (pose: string) => `${pose} aufnehmen`,
    shrinkHint:
      "Das Bild wird auf deinem Gerät verkleinert, bevor es hochgeht. Aufnahmeort und Gerätedaten bleiben dabei hier.",
    allPhotos: "Alle Bilder",
    deletePhoto: "Bild löschen",
    revokeTitle: "Einwilligung zurücknehmen",
    grantedOn: (datum: string) => `Erteilt am ${datum}. `,
    revokeBefore: "Dabei werden ",
    revokeAll: "alle",
    revokeAfter:
      " deine Bilder gelöscht — nicht ausgeblendet, sondern gelöscht. Das lässt sich nicht rückgängig machen.",
    deleting: "Löscht",
    confirmDelete: (n: number) => `Ja, ${n} ${n === 1 ? "Bild" : "Bilder"} löschen`,
    revoke: "Zurücknehmen",
    shrink: {
      process: "Bild konnte nicht verarbeitet werden.",
      save: "Bild konnte nicht gespeichert werden.",
      read: "Die Datei konnte nicht als Bild gelesen werden.",
    },
  },
  profile: {
    area: "Profil",
    title: "Deine Daten",
    saved: "Profil gespeichert",
    photoSaved: "Bild gespeichert",
    photoRemoved: "Bild entfernt",
    otherPhoto: "Anderes Bild",
    choosePhoto: "Bild wählen",
    remove: "Entfernen",
    name: "Name",
    birthDate: "Geburtsdatum",
    email: "E-Mail",
    emailPlaceholder: "du@example.com",
    loginHint: (adresse: string) =>
      `Anmelden tust du dich mit ${adresse}. Änderst du die Adresse hier, schicken wir dir einen Bestätigungslink — erst danach gilt die neue.`,
    contactHint: "Hierhin schreibt dir dein Trainer.",
    save: "Speichern",
    savedState: "Gespeichert",
    since: (datum: string) => `Dabei seit ${datum}. `,
    coachMaintains:
      "Level, Ziele und deinen Trainingsplan pflegt dein Trainer — die siehst du, aber änderst sie nicht hier.",
    errors: {
      nameMissing: "Bitte trag deinen Namen ein.",
      emailInvalid: "Diese E-Mail-Adresse sieht nicht gültig aus.",
      birthDateImplausible: "Das Geburtsdatum kann nicht stimmen.",
      loginNotChanged:
        "Gespeichert. Deine Anmeldeadresse konnte nicht umgestellt werden — melde dich bei deinem Trainer.",
      confirmSent: (adresse: string) =>
        `Gespeichert. An ${adresse} ist eine Bestätigungsmail unterwegs. Bis du den Link anklickst, meldest du dich weiter mit deiner alten Adresse an.`,
    },
  },
  log: {
    needOneSet: "Trag mindestens einen Satz mit Wiederholungen ein.",
    whatsUp: "Was steht an?",
    coachPrepared:
      "Dein Coach hat die Tage vorbereitet. Übungen darin kannst du tauschen.",
    due: "DRAN",
    flexible: "flexibel",
    withCoach: "Mit Trainer",
    alone: "Allein",
    exercises: (n: number) => `${n} ${n === 1 ? "Übung" : "Übungen"}`,
    freeTraining: "Freies Training",
    startSession: "Einheit starten",
    confirmBody: (n: number, dauer: string, mitTrainer: boolean) =>
      `${n} ${n === 1 ? "Übung" : "Übungen"}, etwa ${dauer}${
        mitTrainer ? ", mit deinem Trainer" : ""
      }. Die Uhr läuft ab jetzt mit.`,
    letsGo: "Los geht's",
    back: "‹ Zurück",
    whatTraining: "Was trainierst du?",
    swapHint: "Andere Übung im selben Muster — dein Verlauf läuft weiter.",
    recentlyUsed: "Zuletzt benutzt",
    byMuscle: "Nach Muskelgruppe",
    bestColon: "Bestleistung:",
    best: "Bestleistung",
    today: "Heute",
    resumeClock: "Uhr fortsetzen",
    pauseClock: "Uhr anhalten",
    resume: "Fortsetzen",
    pause: "Pause",
    firstExercise:
      "Füg deine erste Übung hinzu. Die Reihenfolge ist dir überlassen — dein Coach sieht später, welche Muster du trainiert hast.",
    swap: "tauschen",
    removeExercise: "Übung entfernen",
    carryFrom: (datum: string) => `vom ${datum} — übernehmen`,
    bodyLoad: (kg: string) =>
      `Zählt mit ${kg} kg Körpergewicht. Ins kg-Feld nur, was du zusätzlich dranhängst.`,
    noBodyWeight:
      "Trag dein Gewicht im Check-in ein — dann zählt diese Übung mit Last statt nur mit Wiederholungen.",
    deleteSet: (n: number) => `Satz ${n} löschen`,
    lastSetStays: "Der letzte Satz bleibt — nimm sonst die Übung raus",
    deviation: (ist: number, soll: number) =>
      `${ist} statt ${soll} Sätzen — nur für heute. Dein Plan bleibt, wie er ist; dein Coach sieht, was du tatsächlich gemacht hast.`,
    on: (datum: string) => `am ${datum}`,
    addSet: "Satz hinzufügen",
    startRest: (dauer: string) => `Pause starten: ${dauer}`,
    addExercise: "Übung hinzufügen",
    setsOf: (n: number, von: number) =>
      `${n} ${n === 1 ? "Satz" : "Sätze"}${von > 0 ? ` von ${von}` : ""}`,
    totalKg: (kg: string) => `${kg} kg gesamt`,
    saving: "Speichert …",
    finish: "Training abschließen",
    allIn: "Alles drin",
    notAllFilled: "Noch nicht alles ausgefüllt",
    doneBody: (saetze: number, zeit: string) =>
      `${saetze} Sätze in ${zeit} Minuten. Sauber.`,
    incompleteBody: (ist: number, soll: number) =>
      `${ist} von ${soll} geplanten Sätzen sind eingetragen. Du kannst trotzdem abschließen — die Einheit wird dann als unvollständig gezählt.`,
    sameAsLast: "Genauso viel wie letztes Mal.",
    volumeVsLast: (prozent: number, delta: string) =>
      `${Math.abs(prozent)} % ${prozent > 0 ? "mehr" : "weniger"} als letztes Mal (${delta}).`,
    newBests: (n: number) =>
      n === 1 ? "Neue Bestleistung" : `${n} neue Bestleistungen`,
    save: "Speichern",
    finishAnyway: "Trotzdem abschließen",
    backToTraining: "Zurück zum Training",
    restOver: "Pause vorbei",
    rest: "Pause",
    restShorter: "Pause um 15 Sekunden kürzen",
    restLonger: "Pause um 15 Sekunden verlängern",
    hide: "Ausblenden",
    skipRest: "Pause überspringen",
    next: "Weiter",
    skip: "Skip",
  },
  numpad: {
    label: { weight: "Last (kg)", reps: "Wiederholungen", rir: "RIR" },
    hint: {
      weight: "Bei Körpergewicht leer lassen oder Zusatzlast eintragen.",
      reps: "Wie viele hast du geschafft?",
      rir: "Wie viele wären noch gegangen? 0 heißt: keine mehr.",
    },
    addedAria: "Zusatzgewicht (kg)",
    added: "Zusatz (kg)",
    /** Das Zeichen auf der Taste und im Feld. Gelesen wird beides. */
    decimalSep: ",",
    decimalAria: "Komma",
    backspace: "Löschen",
    done: "Fertig",
    next: "Weiter",
  },
};
