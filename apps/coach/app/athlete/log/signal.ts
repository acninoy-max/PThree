/**
 * Signal am Ende der Pause — Ton und Vibration.
 *
 * Kein Audiofile: Ein Ton aus dem Oszillator ist ein paar Zeilen, braucht
 * keinen Download und funktioniert im Keller ohne Empfang. Genau dort
 * steht der Athlet.
 *
 * Die Regel, die alles bestimmt: Ein AudioContext darf nur aus einer
 * Nutzergeste heraus starten. Wenn die Pause abläuft, ist die letzte
 * Geste Minuten her — dann ist es zu spät. Deshalb `prepare()` beim
 * Antippen von „Training starten": Der Context wird dort geweckt und
 * bleibt danach benutzbar.
 */

let ctx: AudioContext | null = null;

type WithWebkit = typeof globalThis & {
  webkitAudioContext?: typeof AudioContext;
};

function audioContextClass(): typeof AudioContext | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as WithWebkit;
  return window.AudioContext ?? w.webkitAudioContext ?? null;
}

/**
 * Aus einer Nutzergeste heraus aufrufen. Danach kann der Ton auch ohne
 * weitere Geste kommen. Schlägt es fehl, bleibt es still — ein stummer
 * Timer ist ärgerlich, ein Absturz wäre schlimmer.
 */
export function prepareSignal(): void {
  try {
    const Ctor = audioContextClass();
    if (!Ctor) return;
    ctx ??= new Ctor();
    if (ctx.state === "suspended") void ctx.resume();
  } catch {
    ctx = null;
  }
}

/** Ein Ton. Kurz ein- und ausgeblendet, sonst knackt es. */
function tone(at: number, hz: number, seconds: number): void {
  if (!ctx) return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = "sine";
  osc.frequency.value = hz;

  gain.gain.setValueAtTime(0, at);
  gain.gain.linearRampToValueAtTime(0.28, at + 0.015);
  gain.gain.setValueAtTime(0.28, at + seconds - 0.03);
  gain.gain.linearRampToValueAtTime(0, at + seconds);

  osc.connect(gain).connect(ctx.destination);
  osc.start(at);
  osc.stop(at + seconds + 0.02);
}

/**
 * Pause vorbei: drei aufsteigende Töne plus Vibration.
 *
 * Aufsteigend, weil das als „los geht's" gelesen wird und nicht als
 * Fehlermeldung. Drei kurze statt eines langen, damit es sich gegen
 * Hallengeräusch durchsetzt, ohne laut zu sein.
 */
export function signalRestOver(): void {
  try {
    if (ctx) {
      if (ctx.state === "suspended") void ctx.resume();
      const t = ctx.currentTime + 0.02;
      tone(t, 660, 0.11);
      tone(t + 0.16, 880, 0.11);
      tone(t + 0.32, 1170, 0.2);
    }
  } catch {
    // Ton nicht möglich — die Vibration unten ist der zweite Weg.
  }

  try {
    // Nur Android kennt das; anderswo gibt es die Funktion schlicht nicht.
    navigator.vibrate?.([180, 90, 180, 90, 300]);
  } catch {
    /* egal */
  }
}

/**
 * Bildschirm während der Einheit anlassen.
 *
 * Ohne das schläft das Handy in der Pause ein, und der Athlet entsperrt
 * nach jedem Satz. Gibt eine Funktion zum Freigeben zurück.
 *
 * Das Betriebssystem entzieht die Sperre, sobald der Tab in den
 * Hintergrund geht — deshalb wird sie beim Zurückkommen neu angefordert.
 */
export function keepScreenAwake(): () => void {
  type Sentinel = { release: () => Promise<void>; released: boolean };
  type NavigatorWithWakeLock = Navigator & {
    wakeLock?: { request: (type: "screen") => Promise<Sentinel> };
  };

  let sentinel: Sentinel | null = null;
  let stopped = false;

  async function request(): Promise<void> {
    try {
      const wakeLock = (navigator as NavigatorWithWakeLock).wakeLock;
      if (!wakeLock || stopped || document.visibilityState !== "visible")
        return;
      sentinel = await wakeLock.request("screen");
    } catch {
      // Nicht unterstützt oder abgelehnt — dann eben nicht.
      sentinel = null;
    }
  }

  function onVisible(): void {
    if (
      document.visibilityState === "visible" &&
      (!sentinel || sentinel.released)
    ) {
      void request();
    }
  }

  void request();
  document.addEventListener("visibilitychange", onVisible);

  return () => {
    stopped = true;
    document.removeEventListener("visibilitychange", onVisible);
    try {
      void sentinel?.release();
    } catch {
      /* egal */
    }
    sentinel = null;
  };
}
