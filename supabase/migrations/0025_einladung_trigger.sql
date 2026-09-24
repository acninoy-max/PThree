-- ============================================================
-- 0025 — Der Trigger aus 0021 hat jede Einladung zurueckgenommen
-- ============================================================
--
-- WAS PASSIERT IST
-- ----------------
-- 0021 fuehrte `guard_client_self_edit` ein. Zweck: Ein Athlet, der sein
-- eigenes Profil bearbeitet, soll nicht die Felder ueberschreiben
-- koennen, die dem Trainer gehoeren. Die Zeilensicherheit von Postgres
-- entscheidet ueber Zeilen, nicht ueber Spalten — also ein Trigger.
--
-- Der Trigger setzt bei jedem Schreibvorgang, der NICHT vom Trainer
-- kommt, eine Reihe von Spalten auf ihre alten Werte zurueck. Darunter:
--
--   new.profile_id := old.profile_id;
--
-- Und genau das trifft `accept_client_invite`. Die Funktion schreibt
--
--   update clients set profile_id = auth.uid() where id = v_client;
--
-- Der Trigger laeuft danach, sieht `new.coach_id <> auth.uid()` — der
-- Athlet ist nun mal nicht sein eigener Trainer — und macht die
-- Zuweisung rueckgaengig. In derselben Anweisung.
--
-- Dass `accept_client_invite` mit `security definer` laeuft, hilft
-- nicht: Das wechselt die DATENBANKROLLE. `auth.uid()` liest dagegen den
-- Anspruch aus dem Token und bleibt der Athlet.
--
-- Nach aussen sah das so aus: Die Einladung wird angenommen, der Nutzer
-- landet in der App, und die App sagt "Zu diesem Zugang gehoert kein
-- Klientenkonto". Kein Fehler, nirgends. Die Einladung ist verbraucht.
--
-- Damit ist es das dritte Mal in diesem Projekt, dass eine Sicherung
-- im Zweifelsfall schweigt statt abzubrechen — nach dem stillen
-- `where profile_id is null` (0024) und dem 'client' in der
-- Rollen-Aufzaehlung (0023). Das Muster ist immer dasselbe: Eine
-- Bedingung, die den guten Fall richtig behandelt und den schlechten
-- gar nicht.
--
-- DIE LOESUNG
-- -----------
-- Kein Schalter, keine Ausnahme fuer bestimmte Funktionen — sondern die
-- Regel praeziser formulieren.
--
-- Verboten sein soll: einen Klienten, der jemand anderem gehoert, auf
-- sich selbst umschreiben. Erlaubt sein muss: eine Zeile OHNE Besitzer
-- fuer sich beanspruchen. Das ist genau das, was beim Annehmen einer
-- Einladung passiert.
--
-- Beide Bedingungen zusammen — vorher niemand, nachher ich — lassen
-- keinen Missbrauch zu:
--
--   * Ein fremder Klient hat einen Besitzer. `old.profile_id is null`
--     trifft nicht zu, der alte Wert bleibt.
--   * Auf einen Dritten umschreiben geht nicht: `new.profile_id` muss
--     `auth.uid()` sein.
--   * Und ueber die Zeilensicherheit kommt ein Athlet ohnehin nicht an
--     eine Zeile ohne Besitzer heran: `clients_self_update` verlangt
--     `profile_id = auth.uid()`, und das ist bei `null` nicht erfuellt.
--     Diesen Weg nimmt also einzig `accept_client_invite`.
--
-- Zwei Schloesser, die unabhaengig voneinander halten.

set search_path = public;

create or replace function guard_client_self_edit()
returns trigger language plpgsql security definer
set search_path = public as $$
begin
  -- Der Trainer darf alles; diese Sperre gilt nur dem Athleten.
  if new.coach_id = auth.uid() then
    return new;
  end if;

  new.coach_id        := old.coach_id;
  new.organisation_id := old.organisation_id;
  new.status          := old.status;
  new.level           := old.level;
  new.goal            := old.goal;
  new.started_on      := old.started_on;
  new.created_at      := old.created_at;

  -- Eine Zeile ohne Besitzer darf man fuer SICH beanspruchen — das ist
  -- das Annehmen einer Einladung. Alles andere an dieser Spalte wird
  -- zurueckgesetzt.
  if not (old.profile_id is null and new.profile_id = auth.uid()) then
    new.profile_id := old.profile_id;
  end if;

  return new;
end $$;

comment on function guard_client_self_edit() is
  'Setzt beim Selbstbearbeiten durch den Athleten alle Felder zurueck, '
  'die dem Trainer gehoeren. AUSNAHME seit 0025: Eine Zeile ohne '
  'Besitzer darf der Athlet auf sich selbst setzen — sonst nahm dieser '
  'Trigger jede angenommene Einladung sofort wieder zurueck, ohne dass '
  'irgendwo ein Fehler entstand.';

-- ------------------------------------------------------------
-- Und jetzt sagt accept_client_invite auch, wenn es nicht klappt
-- ------------------------------------------------------------
--
-- Die Lehre aus dem Vorfall: Es reicht nicht, die Ursache zu beheben.
-- Haette die Funktion nach dem Schreiben nachgesehen, ob die Zeile
-- WIRKLICH verknuepft ist, waere derselbe Fehler in der ersten Minute
-- aufgefallen statt nach vier Anlaeufen.
--
-- Eine Pruefung, die nur den Weg hin kennt und nie das Ergebnis, ist
-- keine Pruefung.

create or replace function accept_client_invite(invite_token text)
returns uuid language plpgsql security definer
set search_path = public as $$
declare
  v_client  uuid;
  v_inhaber uuid;
  v_danach  uuid;
begin
  if auth.uid() is null then
    raise exception 'Nicht angemeldet';
  end if;

  if exists (select 1 from coaches where id = auth.uid()) then
    raise exception
      'Dieses Konto ist ein Coach-Konto. Oeffne die Einladung in einem '
      'privaten Fenster und melde dich mit einer anderen Adresse an.';
  end if;

  select i.client_id into v_client
    from client_invites i
   where i.token = invite_token
     and i.accepted_at is null
     and i.expires_at > now();

  if v_client is null then
    raise exception 'Einladung ungueltig oder abgelaufen';
  end if;

  select profile_id into v_inhaber from clients where id = v_client;

  if v_inhaber is null then
    update clients set profile_id = auth.uid() where id = v_client;

  elsif v_inhaber = auth.uid() then
    null;  -- zweiter Klick auf denselben Link

  else
    raise exception
      'Dieser Klient ist bereits mit einem anderen Zugang verknuepft. '
      'Melde dich mit der Adresse an, die du zuerst benutzt hast — oder '
      'bitte deinen Trainer, die Verknuepfung zu loesen.';
  end if;

  -- NACHSEHEN, ob es gewirkt hat. Genau hier waere 0021 aufgefallen.
  select profile_id into v_danach from clients where id = v_client;
  if v_danach is distinct from auth.uid() then
    raise exception
      'Die Verknuepfung konnte nicht gesetzt werden. Bitte melde das '
      'deinem Trainer — es liegt nicht an dir.';
  end if;

  update client_invites set accepted_at = now() where token = invite_token;

  update profiles set role = 'athlete'::user_role where id = auth.uid();

  return v_client;
end;
$$;

grant execute on function accept_client_invite(text) to authenticated;

comment on function accept_client_invite(text) is
  'Verknuepft den angemeldeten Zugang mit dem eingeladenen Klienten und '
  'prueft danach nach, ob die Verknuepfung wirklich steht. Bricht ab, '
  'wenn der Klient schon einem anderen Zugang gehoert.';

-- ------------------------------------------------------------
-- Aufraeumen: Einladungen, die an diesem Fehler gescheitert sind
-- ------------------------------------------------------------
--
-- Sie stehen als angenommen in der Tabelle, haben aber nie etwas
-- verknuepft. Solange sie so dastehen, glaubt der Trainer, der Klient
-- haette abgelehnt — und ein neuer Link ist noetig, obwohl der alte
-- noch gueltig waere.
--
-- Wieder auf offen setzen, damit sie benutzbar sind. Betrifft nur
-- Klienten, die bis heute keinen Zugang haben.

update client_invites i
   set accepted_at = null
  from clients c
 where c.id = i.client_id
   and i.accepted_at is not null
   and c.profile_id is null
   and i.expires_at > now();
