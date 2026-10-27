-- Ein Fall aus check_schema 0025 im Detail: Klient mit angenommener
-- Einladung, aber ohne Zugang, obwohl ein Nutzer mit seiner Adresse
-- existiert. Nur lesen, ändert nichts.
--
-- Adresse unten eintragen (die aus einladung_ohne_zugang.sql).

with gesucht as (
  select lower('bart.vosters@gmail.com') as adresse
),
nutzer as (
  select u.id, u.created_at, u.last_sign_in_at
    from auth.users u, gesucht g
   where lower(u.email) = g.adresse
)
select 'Nutzer'                         as was,
       n.id::text                       as id,
       'angelegt ' || n.created_at::text || ', zuletzt angemeldet ' || coalesce(n.last_sign_in_at::text, 'nie')
                                         as details
  from nutzer n
union all
select 'Profil-Rolle', p.id::text, coalesce(p.role::text, '–')
  from profiles p join nutzer n on n.id = p.id
union all
-- Ist der Nutzer an einen ANDEREN Klienten-Eintrag gebunden?
select 'verknüpft mit Klient', c.id::text,
       c.full_name || ' (Trainer: ' || coalesce(co.display_name, '?') || ', angelegt ' || c.created_at::date::text || ')'
  from clients c
  join nutzer n on n.id = c.profile_id
  left join coaches co on co.id = c.coach_id
union all
-- Alle Klienten-Einträge mit dieser Adresse, verknüpft oder nicht
select 'Klient mit dieser Adresse', c.id::text,
       c.full_name || ', Zugang: ' || coalesce(c.profile_id::text, 'keiner')
       || ', angelegt ' || c.created_at::date::text
  from clients c, gesucht g
 where lower(c.email) = g.adresse
union all
-- Einladungen zu diesen Einträgen
select 'Einladung', i.id::text,
       'Klient ' || c.full_name || ', gültig bis ' || i.expires_at::date::text
       || ', angenommen ' || coalesce(i.accepted_at::text, 'nein')
  from client_invites i
  join clients c on c.id = i.client_id, gesucht g
 where lower(c.email) = g.adresse
order by 1;
