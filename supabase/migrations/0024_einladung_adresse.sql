-- ============================================================
-- 0024 — Einladung: Adresse kommt vom Trainer, und das stille
--        Scheitern hoert auf
-- ============================================================
--
-- ZWEI DINGE, DIE ZUSAMMENGEHOEREN.
--
-- 1. accept_client_invite hat stillschweigend nichts getan
-- --------------------------------------------------------
-- In 0005 (und unveraendert in 0006) stand:
--
--   update clients set profile_id = auth.uid()
--    where id = v_client and profile_id is null;
--
-- Das `and profile_id is null` ist richtig gedacht: Ohne die
-- Bedingung koennte jemand mit einem alten Link einen Klienten
-- uebernehmen, der laengst jemand anderem gehoert.
--
-- Falsch ist, was danach passiert — naemlich nichts. Trifft die
-- Bedingung nicht zu, aendert `update` null Zeilen. Postgres meldet das
-- nicht als Fehler; die Funktion laeuft weiter, markiert die Einladung
-- als angenommen und gibt die client_id zurueck. Der Aufrufer sieht
-- Erfolg.
--
-- Was der Eingeladene sieht: Er landet in der App, und die App sagt ihm
-- "Zu diesem Zugang gehoert kein Klientenkonto. Melde dich bei deinem
-- Trainer." Der Trainer sieht einen Klienten, der scheinbar nie
-- angenommen hat. Niemand kann daraus schliessen, was los ist — und die
-- Einladung ist verbraucht.
--
-- Eine Bedingung, die im Fehlerfall schweigt, ist keine Pruefung. Sie
-- ist eine Falle mit Zeitverzoegerung.
--
-- 2. Die Adresse soll nicht der Eingeladene eintippen
-- ---------------------------------------------------
-- Bisher trug der Klient auf der Einladeseite seine E-Mail selbst ein.
-- Die kann von der abweichen, die der Trainer in der Akte hinterlegt
-- hat. Dann steht in `clients.email` die eine Adresse und in
-- `auth.users` die andere — der Trainer schreibt ins Leere, und keine
-- Stelle im System bemerkt es.
--
-- Deshalb liefert `peek_client_invite` jetzt auch die hinterlegte
-- Adresse, und die Einladeseite zeigt sie fest an. Der Klient waehlt
-- nur noch ein Passwort.
--
-- Dass damit die Adresse an jeden geht, der den Link hat: Der Link
-- enthaelt 64 zufaellige Hex-Zeichen, und wer ihn hat, ist der
-- Adressat. Der Name des Klienten und der des Trainers standen ohnehin
-- schon drin.

set search_path = public;

-- ------------------------------------------------------------
-- peek_client_invite — jetzt mit Adresse
-- ------------------------------------------------------------
--
-- `create or replace` reicht hier NICHT: Die Rueckgabespalten aendern
-- sich, und die sind Teil der Signatur. Postgres lehnt das ab mit
-- "cannot change return type of existing function". Also erst weg,
-- dann neu — und danach die Rechte neu vergeben, die mit der alten
-- Funktion verschwinden.

drop function if exists peek_client_invite(text);

create function peek_client_invite(invite_token text)
returns table (
  client_name  text,
  coach_name   text,
  client_email text,
  is_valid     boolean,
  -- Ob der Klient schon einen Zugang hat. Die Einladeseite kann damit
  -- sagen "melde dich an" statt "leg ein Konto an".
  bereits_verknuepft boolean
)
language sql stable security definer set search_path = public as $$
  select
    c.full_name,
    co.display_name,
    c.email,
    (i.accepted_at is null and i.expires_at > now()),
    (c.profile_id is not null)
  from client_invites i
  join clients c  on c.id = i.client_id
  join coaches co on co.id = c.coach_id
  where i.token = invite_token;
$$;

grant execute on function peek_client_invite(text) to anon, authenticated;

comment on function peek_client_invite(text) is
  'Zeigt eine Einladung ohne Anmeldung an — Name, Trainer, hinterlegte '
  'Adresse. Der Token ist das Geheimnis, nicht der Inhalt.';

-- ------------------------------------------------------------
-- accept_client_invite — sagt jetzt, wenn es nicht geht
-- ------------------------------------------------------------

create or replace function accept_client_invite(invite_token text)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_client  uuid;
  v_inhaber uuid;
begin
  if auth.uid() is null then
    raise exception 'Nicht angemeldet';
  end if;

  -- Aus 0006: Ein Coach darf keine Klienten-Einladung annehmen. Sonst
  -- ueberschriebe er sein eigenes Konto und verloere seine Klienten.
  if exists (select 1 from coaches where id = auth.uid()) then
    raise exception
      'Dieses Konto ist ein Coach-Konto. Oeffne die Einladung in einem '
      'privaten Fenster und registriere dich mit einer anderen '
      'E-Mail-Adresse.';
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

  -- HIER stand frueher nur eine where-Bedingung. Jetzt drei Faelle, und
  -- zwei davon sagen etwas.
  if v_inhaber is null then
    update clients set profile_id = auth.uid() where id = v_client;

  elsif v_inhaber = auth.uid() then
    -- Derselbe Mensch, zweiter Klick. Kein Fehler: Wer den Link
    -- nochmal oeffnet, soll nicht ausgesperrt werden.
    null;

  else
    -- Der Klient haengt an einem ANDEREN Zugang. Das ist der Fall, der
    -- frueher still durchlief. Er entsteht bei einer zweiten Adresse
    -- desselben Menschen — und er entstuende bei einem weitergegebenen
    -- Link. Beides gehoert gemeldet, nicht verschluckt.
    raise exception
      'Dieser Klient ist bereits mit einem anderen Zugang verknuepft. '
      'Melde dich mit der Adresse an, die du zuerst benutzt hast — oder '
      'bitte deinen Trainer, die Verknuepfung zu loesen.';
  end if;

  update client_invites set accepted_at = now() where token = invite_token;

  update profiles set role = 'athlete'::user_role where id = auth.uid();

  return v_client;
end;
$$;

grant execute on function accept_client_invite(text) to authenticated;

comment on function accept_client_invite(text) is
  'Verknuepft den angemeldeten Zugang mit dem eingeladenen Klienten. '
  'Bricht ab, wenn der Klient schon einem anderen Zugang gehoert — in '
  '0005/0006 passierte in diesem Fall stillschweigend nichts, und der '
  'Eingeladene landete in einer App ohne Daten.';

-- ------------------------------------------------------------
-- Die Verknuepfung wieder loesen
-- ------------------------------------------------------------
--
-- Der Gegengriff zum Fehler oben, und der Weg fuer den Alltag: Ein
-- Klient hat sich mit der falschen Adresse angemeldet und soll neu
-- eingeladen werden.
--
-- Bewusst nur fuer den zustaendigen Trainer. Der Klientendatensatz
-- bleibt samt Historie stehen; getrennt wird nur der Zugang.

create or replace function unlink_client(target_client uuid)
returns text language plpgsql security definer set search_path = public as $$
declare
  v_alt uuid;
begin
  if not exists (
    select 1 from clients c
     where c.id = target_client and c.coach_id = auth.uid()
  ) then
    raise exception 'Kein Zugriff auf diesen Klienten';
  end if;

  select profile_id into v_alt from clients where id = target_client;
  if v_alt is null then
    return 'Dieser Klient hat noch keinen Zugang.';
  end if;

  update clients set profile_id = null where id = target_client;

  -- Offene Einladungen mitnehmen, damit ein neuer Link sauber beginnt.
  delete from client_invites
   where client_id = target_client and accepted_at is null;

  return 'Verknuepfung geloest. Jetzt einen neuen Einladungslink erzeugen.';
end;
$$;

grant execute on function unlink_client(uuid) to authenticated;
revoke all on function unlink_client(uuid) from anon;

comment on function unlink_client(uuid) is
  'Loest den Zugang vom Klienten. Historie bleibt, nur die Verbindung '
  'zu auth.users faellt weg. Nur der zustaendige Trainer.';
