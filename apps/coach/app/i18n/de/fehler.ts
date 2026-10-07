/** Fehlerseiten und Meldungen aus der Datenbank. */
export const fehler = {
  notFound: {
    metaTitle: "Seite nicht gefunden — PTHREE",
    title: "Diese Seite gibt es nicht",
    body: "Die Adresse stimmt nicht — vertippt, oder der Link ist nicht mehr gültig. Einladungslinks laufen nach 14 Tagen ab und funktionieren nur einmal; frag in dem Fall deinen Trainer nach einem neuen.",
    back: "Zurück zur App",
  },
  crash: {
    title: "Da ist etwas schiefgelaufen",
    body: "Die Seite konnte nicht geladen werden. Meistens hilft ein zweiter Versuch — gerade wenn das Netz gerade schwach ist.",
    bodyMore:
      "Bleibt es dabei, schick deinem Trainer die Kennung unten. Damit lässt sich nachsehen, was genau passiert ist.",
    retry: "Nochmal versuchen",
    home: "Zur Startseite",
    digest: "Kennung",
  },
  noClient: {
    title: "Zu diesem Zugang gehört kein Klientenkonto.",
    signedInAs: "Du bist angemeldet als",
    hint: "Wenn dein Trainer dich unter einer anderen Adresse eingeladen hat, meld dich hier ab und öffne den Einladungslink noch einmal.",
  },
  db: {
    notSignedIn: "Nicht angemeldet.",
    coachAccount:
      "Dieses Konto ist ein Coach-Konto. Öffne die Einladung in einem privaten Fenster und melde dich mit einer anderen Adresse an.",
    inviteInvalid: "Einladung ungültig oder abgelaufen.",
    clientTaken:
      "Dieser Klient ist bereits mit einem anderen Zugang verknüpft. Melde dich mit der Adresse an, die du zuerst benutzt hast — oder bitte deinen Trainer, die Verknüpfung zu lösen.",
    linkFailed:
      "Die Verknüpfung konnte nicht gesetzt werden. Bitte melde das deinem Trainer — es liegt nicht an dir.",
    noAccess: "Kein Zugriff auf diesen Klienten.",
    unknown: (roh: string) => `Das hat nicht geklappt: ${roh}`,
  },
};
