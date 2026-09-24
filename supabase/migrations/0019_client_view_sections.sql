-- ============================================================
-- 0019 — Der Trainer baut sich die Klientenakte selbst
-- ============================================================
--
-- Aus dem Meeting 16.09: "Zahnrad rechtsbuendig ganz oben auf Klient um
-- sich das Klienten Fenster selber zu Bauen bzw anwaehlen abwaehlen der
-- Metriken weil sonst zu voll. Und auch selber Reihenfolge festlegen
-- koennen."
--
-- Die Akte ist gewachsen: Ziele, Hinweise, Check-ins, Fortschritt,
-- Volumen, Koerperwerte, letzte Einheiten. Fuer den einen Trainer ist
-- das alles wichtig, fuer den naechsten sind drei davon Rauschen, das er
-- jedes Mal wegscrollt. Auf dem Handy kostet jeder ungewollte Block eine
-- Bildschirmlaenge.
--
-- ZWEI ENTSCHEIDUNGEN
--
-- 1. Pro Betrachter, NICHT pro Klient.
--    "Bei Anna will ich die Koerperwerte oben, bei Ben unten" ist kein
--    Beduerfnis, das jemand hat — wer so arbeitet, arbeitet bei jedem
--    Klienten gleich. Eine Einstellung je Klient hiesse, sie zwanzigmal
--    zu pflegen, und die zwanzigste waere nie richtig.
--
-- 2. Eine Zeile je Abschnitt, nicht ein JSON-Feld mit der ganzen
--    Anordnung.
--    Kommt spaeter ein Abschnitt dazu, muesste ein JSON-Feld in jeder
--    Zeile nachgezogen werden — oder der neue Abschnitt bliebe fuer
--    alle unsichtbar, die schon einmal etwas eingestellt haben. Mit
--    einer Zeile je Abschnitt gilt: Was nicht in der Tabelle steht,
--    steht an seinem Standardplatz und ist sichtbar. Neue Abschnitte
--    tauchen also von selbst auf.
--
-- Der Schluessel der Abschnitte ist bewusst Text und kein Enum: Ein
-- Enum haette fuer jeden neuen Abschnitt eine Migration erzwungen, und
-- die Oberflaeche kennt ohnehin nur ihre eigene Liste. Unbekannte
-- Schluessel ignoriert sie.

set search_path = public;

create table if not exists client_view_sections (
  viewer_id uuid not null references auth.users(id) on delete cascade,
  -- Schluessel des Abschnitts, wie ihn die Oberflaeche nennt:
  -- goal, insights, checkins, progress, volume, body, sessions.
  section text not null,
  position int not null,
  is_visible boolean not null default true,
  updated_at timestamptz not null default now(),
  primary key (viewer_id, section),
  constraint client_view_sections_section_len
    check (char_length(section) between 1 and 40),
  constraint client_view_sections_position_range
    check (position between 0 and 99)
);

create index if not exists client_view_sections_viewer_idx
  on client_view_sections (viewer_id, position);

-- ------------------------------------------------------------
-- Rechte
-- ------------------------------------------------------------
--
-- Die einfachste Zeilensicherheit im ganzen Schema: Es gibt keinen
-- Klienten, keine Organisation, keine Freigabe. Es ist die Einstellung
-- eines Nutzers fuer sich selbst — lesen und schreiben darf nur er.

alter table client_view_sections enable row level security;

drop policy if exists client_view_sections_own on client_view_sections;

create policy client_view_sections_own on client_view_sections
  for all using (viewer_id = auth.uid())
  with check (viewer_id = auth.uid());

comment on table client_view_sections is
  'Welche Abschnitte der Klientenakte ein Trainer sieht und in welcher '
  'Reihenfolge. Pro Betrachter, nicht pro Klient. Fehlende Abschnitte '
  'gelten als sichtbar an ihrem Standardplatz — so tauchen neue '
  'Abschnitte auch bei Nutzern auf, die schon einmal etwas eingestellt '
  'haben.';
