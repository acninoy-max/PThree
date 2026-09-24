-- =====================================================================
-- PT FIVE — Einladungen
--
-- Ablauf: Der Coach legt einen Klienten an (existiert zunächst ohne Konto)
-- und erzeugt einen Einladungslink. Der Klient registriert sich darüber;
-- erst dann wird sein Profil mit dem Klientendatensatz verknüpft.
--
-- Die Verknüpfung läuft über eine security-definer-Funktion, weil ein frisch
-- registrierter Nutzer per RLS noch keinen Zugriff auf den Klientendatensatz
-- hat — er gehört ja noch niemandem.
-- =====================================================================

/** Erzeugt einen Einladungslink. Ein aktiver Token je Klient. */
create or replace function create_client_invite(target_client uuid, valid_days int default 14)
returns text language plpgsql security definer set search_path = public as $$
declare
  v_token text;
begin
  -- Nur der zuständige Coach darf einladen.
  if not exists (
    select 1 from clients c where c.id = target_client and c.coach_id = auth.uid()
  ) then
    raise exception 'Kein Zugriff auf diesen Klienten';
  end if;

  -- Offene Einladungen ersetzen, damit alte Links ungültig werden.
  delete from client_invites
   where client_id = target_client and accepted_at is null;

  -- gen_random_uuid() ist in Postgres eingebaut und braucht keine Erweiterung.
  -- Zwei UUIDs ergeben 64 Hex-Zeichen — ausreichend unratbar für einen Link.
  v_token := replace(gen_random_uuid()::text, '-', '')
          || replace(gen_random_uuid()::text, '-', '');

  insert into client_invites (client_id, token, expires_at)
  values (target_client, v_token, now() + (valid_days || ' days')::interval);

  return v_token;
end;
$$;

/** Liest die Einladung, ohne Anmeldung — für die Anzeige auf der Einladeseite. */
create or replace function peek_client_invite(invite_token text)
returns table (client_name text, coach_name text, is_valid boolean)
language sql stable security definer set search_path = public as $$
  select
    c.full_name,
    co.display_name,
    (i.accepted_at is null and i.expires_at > now())
  from client_invites i
  join clients c  on c.id = i.client_id
  join coaches co on co.id = c.coach_id
  where i.token = invite_token;
$$;

/** Verknüpft den angemeldeten Nutzer mit dem eingeladenen Klienten. */
create or replace function accept_client_invite(invite_token text)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_client uuid;
begin
  if auth.uid() is null then
    raise exception 'Nicht angemeldet';
  end if;

  select i.client_id into v_client
    from client_invites i
   where i.token = invite_token
     and i.accepted_at is null
     and i.expires_at > now();

  if v_client is null then
    raise exception 'Einladung ungültig oder abgelaufen';
  end if;

  -- Bereits vergebene Klienten nicht überschreiben.
  update clients
     set profile_id = auth.uid()
   where id = v_client
     and profile_id is null;

  update client_invites set accepted_at = now() where token = invite_token;

  -- Der Eingeladene ist Athlet, nicht Coach.
  update profiles set role = 'athlete' where id = auth.uid();
  delete from coaches where id = auth.uid();

  return v_client;
end;
$$;

-- Nicht angemeldete Besucher dürfen die Einladung ansehen.
grant execute on function peek_client_invite(text) to anon, authenticated;
grant execute on function accept_client_invite(text) to authenticated;
grant execute on function create_client_invite(uuid, int) to authenticated;
