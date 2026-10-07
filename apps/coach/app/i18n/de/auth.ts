/** Anmeldung, Passwort, Einladung. */
export const auth = {
  login: {
    tagline: "Anmelden — als Coach oder Athlet",
    email: "E-Mail",
    password: "Passwort",
    submit: "Anmelden",
    busy: "Moment …",
    forgot: "Passwort vergessen?",
    noAccess:
      "Noch kein Zugang? Athleten bekommen einen Einladungslink von ihrem Coach.",
    wrongCredentials: "E-Mail oder Passwort stimmt nicht.",
    notConfirmed:
      "Diese Adresse ist noch nicht bestätigt — schau in dein Postfach.",
  },
  forgot: {
    metaTitle: "Passwort vergessen — PTHREE",
    title: "Passwort vergessen",
    subtitle: "Wir schicken dir einen Link, mit dem du ein neues setzt.",
    reasons: {
      abgelaufen:
        "Der Link ist abgelaufen oder wurde schon benutzt. Fordere unten einfach einen neuen an — das geht beliebig oft.",
      ungueltig:
        "Mit diesem Link stimmt etwas nicht. Fordere unten einen neuen an.",
      browser:
        "Der Link wurde in einem anderen Browser geöffnet, als du ihn angefordert hast. Fordere hier einen neuen an und öffne die Mail dann auf demselben Gerät.",
    },
    rateLimited:
      "Gerade wurde schon eine Mail an diese Adresse geschickt. Warte eine Minute und versuch es dann noch einmal.",
    sentTitle: "Mail ist unterwegs.",
    sentBody: (adresse: string | null) =>
      `Falls ein Konto zu ${adresse ?? "dieser Adresse"} gehört, liegt gleich eine Mail im Postfach. Der Link darin gilt eine Stunde und funktioniert einmal.`,
    sentHint:
      "Nichts da? Schau in den Spam-Ordner — und öffne die Mail auf demselben Gerät, auf dem du gerade bist.",
    backToLogin: "Zurück zur Anmeldung",
    submit: "Link schicken",
    remembered: "Wieder eingefallen?",
    signIn: "Anmelden",
  },
  newPassword: {
    metaTitle: "Neues Passwort — PTHREE",
    title: "Neues Passwort",
    forAccount: (email: string | null) => `Für ${email ?? "dein Konto"}.`,
    label: "Neues Passwort",
    placeholder: (n: number) => `mindestens ${n} Zeichen`,
    repeat: "Nochmal zur Sicherheit",
    show: "Passwort anzeigen",
    sameAsOld: "Das ist dein bisheriges Passwort. Wähle ein anderes.",
    missing: (n: number) => `Noch ${n} Zeichen.`,
    mismatch: "Die beiden Eingaben sind nicht gleich.",
    submit: "Passwort speichern",
  },
  invite: {
    invalidTitle: "Einladung ungültig",
    invalidBody:
      "Der Link ist abgelaufen oder wurde bereits verwendet. Bitte frag deinen Coach nach einem neuen.",
    invitedBy: "hat dich eingeladen.",
    alreadyLinked:
      "Zu deinem Namen gibt es schon einen Zugang — melde dich damit an.",
    choosePassword:
      "Wähl ein Passwort, dann siehst du deine Pläne, Termine und Fortschritte.",
    accountExists:
      "Zu dieser Adresse gibt es schon ein Konto. Trag dein bisheriges Passwort ein — oder setz es unter „Passwort vergessen“ neu und komm dann hierher zurück.",
    doneTitle: (name: string) => `Alles klar, ${name}.`,
    doneBody:
      "Dein Konto ist mit deinem Coach verknüpft. Wir bringen dich zu deinem Trainingsbereich …",
    emailFixed:
      "Die Adresse hat dein Coach hinterlegt. Stimmt sie nicht, sag ihm Bescheid — er schickt dir dann eine neue Einladung.",
    alreadySignedIn:
      "Du bist bereits unter dieser Adresse angemeldet — kein Passwort nötig.",
    yourPassword: "Dein Passwort",
    pickPassword: "Passwort wählen",
    minChars: "mindestens 8 Zeichen",
    resetPassword: "Passwort zurücksetzen",
    accept: "Einladung annehmen",
    signIn: "Anmelden",
    createAccount: "Konto anlegen",
  },
};
