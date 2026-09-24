-- =====================================================================
-- PT FIVE — Schutz beim Annehmen einer Einladung
--
-- Fehler in 0005: accept_client_invite hat den Coach-Eintrag des
-- angemeldeten Nutzers gelöscht. Öffnete ein Coach versehentlich seinen
-- eigenen Einladungslink, wurde sein Konto zum Athleten degradiert — und
-- weil clients.coach_id mit "on delete cascade" hängt, verschwanden dabei
-- sämtliche Klienten samt Trainingshistorie.
--
-- Diese Fassung lehnt den Vorgang für Coach-Konten ab und löscht nichts mehr.
-- =====================================================================

create or replace function accept_client_invite(invite_token text)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_client uuid;
begin
  if auth.uid() is null then
    raise exception 'Nicht angemeldet';
  end if;

  -- Ein Coach darf keine Klienten-Einladung annehmen. Sonst überschriebe er
  -- sein eigenes Konto und verlöre seine Klienten.
  if exists (select 1 from coaches where id = auth.uid()) then
    raise exception
      'Dieses Konto ist ein Coach-Konto. Öffne die Einladung in einem privaten Fenster und registriere dich mit einer anderen E-Mail-Adresse.';
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

  -- Rolle setzen, aber nichts löschen.
  update profiles set role = 'athlete' where id = auth.uid();

  return v_client;
end;
$$;

grant execute on function accept_client_invite(text) to authenticated;

-- ---------------------------------------------------------------
-- Wiederherstellung, falls ein Coach-Konto bereits umgewandelt wurde.
-- Mit der eigenen E-Mail aufrufen:
--   select restore_coach_account('deine@mail.de');
--
-- Klienten, die durch die Kaskade gelöscht wurden, sind verloren —
-- danach seed_demo_data erneut ausführen.
-- ---------------------------------------------------------------
create or replace function restore_coach_account(coach_email text)
returns text language plpgsql security definer set search_path = public as $$
declare
  v_id   uuid;
  v_name text;
begin
  select id, full_name into v_id, v_name from profiles where email = coach_email;
  if v_id is null then
    return 'Kein Profil mit dieser E-Mail gefunden.';
  end if;

  update profiles set role = 'coach' where id = v_id;

  insert into coaches (id, display_name)
  values (v_id, coalesce(v_name, split_part(coach_email, '@', 1)))
  on conflict (id) do nothing;

  -- Die Verknüpfung als Klient lösen, falls vorhanden.
  update clients set profile_id = null where profile_id = v_id;

  return 'Coach-Konto wiederhergestellt für ' || coach_email;
end;
$$;
