-- ============================================================
-- 0035 — Ein Konto, ein Klient: Einladung bei anderem Trainer ablehnen
-- ============================================================
--
-- WAS FALSCH WAR
-- --------------
-- accept_client_invite (0025) prüfte nur, ob der KLIENTEN-EINTRAG schon
-- einen Zugang hat. Ob das KONTO schon an einen anderen Klienten
-- gebunden ist, prüfte es nicht. Wer bei Trainer A Klient ist und die
-- Einladung von Trainer B annimmt, hing danach an zwei Einträgen.
--
-- Die Athleten-App sucht ihren Klienten mit `profile_id = auth.uid()`
-- und erwartet genau einen (`maybeSingle`). Bei zwei bricht jede Seite.
-- Aufgefallen beim Gedanken an „Klienten durchreichen" (27.10.2026),
-- bevor es jemand ausgelöst hat.
--
-- WAS JETZT GILT
-- --------------
-- 1. accept_client_invite lehnt ab, wenn das Konto schon an einen
--    anderen Klienten gebunden ist — mit einer Meldung, die sagt, was
--    zu tun ist: den bisherigen Trainer um „Zugang trennen" bitten.
--    Sonst unverändert gegenüber 0025.
-- 2. unlink_client („Zugang trennen") räumt auch die angenommene
--    Einladung weg und liest nach, ob die Trennung gewirkt hat. Bisher
--    blieb die angenommene Einladung stehen, und check_schema 0025
--    meldete danach einen Fehler, der keiner war. Bestehende Fälle
--    fasst diese Migration nicht an.

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

  -- NEU in 0035: ein Konto, ein Klient.
  if exists (
    select 1 from clients
     where profile_id = auth.uid() and id <> v_client
  ) then
    raise exception
      'Dein Zugang ist schon bei einem anderen Trainer verknuepft. Bitte '
      'deinen bisherigen Trainer, in deiner Akte „Zugang trennen" zu '
      'druecken, und oeffne den Link danach noch einmal.';
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

  -- NACHSEHEN, ob es gewirkt hat (0025).
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

revoke all on function accept_client_invite(text) from public, anon;
grant execute on function accept_client_invite(text) to authenticated;

create or replace function unlink_client(target_client uuid)
returns text language plpgsql security definer set search_path = public as $$
declare
  v_alt    uuid;
  v_danach uuid;
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

  -- Nachsehen statt hoffen (Regel 3).
  select profile_id into v_danach from clients where id = target_client;
  if v_danach is not null then
    raise exception 'Die Verknuepfung konnte nicht geloest werden.';
  end if;

  -- Alle Einladungen mitnehmen, auch die angenommene: Sie beschreibt
  -- eine Verknüpfung, die es nicht mehr gibt (sonst Fehlalarm in
  -- check_schema 0025). Ein neuer Link beginnt sauber.
  delete from client_invites where client_id = target_client;

  return 'Verknuepfung geloest. Jetzt einen neuen Einladungslink erzeugen.';
end;
$$;

revoke all on function unlink_client(uuid) from public, anon;
grant execute on function unlink_client(uuid) to authenticated;

do $$
begin
  if (select prosrc from pg_proc where proname = 'accept_client_invite') not like '%profile_id = auth.uid() and id <> v_client%' then
    raise exception '0035: accept_client_invite ist nicht die neue Fassung.';
  end if;
  if (select prosrc from pg_proc where proname = 'accept_client_invite') not like '%v_danach is distinct from auth.uid()%' then
    raise exception '0035: Nachprüfung aus 0025 fehlt.';
  end if;
  if has_function_privilege('anon', 'accept_client_invite(text)', 'execute')
     or has_function_privilege('anon', 'unlink_client(uuid)', 'execute') then
    raise exception '0035: Funktionen fuer anon aufrufbar.';
  end if;
end;
$$;
