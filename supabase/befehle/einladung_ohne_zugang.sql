-- Klienten mit angenommener Einladung, aber ohne Zugang (check_schema 0025).
-- Nur lesen, ändert nichts.
--
-- Zwei harmlose Ursachen:
--   * „Zugang trennen" in der Akte (unlink_client löscht nur offene
--     Einladungen, die angenommene bleibt stehen)
--   * Nutzer unter Authentication → Users gelöscht
-- Echter Fehler wäre: Es gibt den Nutzer noch (spalte „nutzer_existiert"
-- = true), aber er ist nicht verknüpft.

select
  c.full_name                         as klient,
  co.display_name                     as trainer,
  c.email                             as klient_email,
  i.accepted_at                       as einladung_angenommen,
  exists (
    select 1 from auth.users u
     where c.email is not null and lower(u.email) = lower(c.email)
  )                                   as nutzer_existiert
from client_invites i
join clients c   on c.id = i.client_id
left join coaches co on co.id = c.coach_id
where i.accepted_at is not null
  and c.profile_id is null
order by i.accepted_at desc;
