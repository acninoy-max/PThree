-- Status eines Nutzerkontos: Rolle, an welche Klienten-Einträge gebunden.
-- Nur lesen, ändert nichts. Adresse unten eintragen.
--
-- Für eine Einladung durch einen (neuen) Trainer muss gelten:
--   * Rolle ist nicht „coach"
--   * an KEINEN Klienten gebunden — sonst erst beim alten Trainer
--     „Zugang trennen"

with gesucht as (select lower('vaaba13@gmail.com') as adresse),
nutzer as (
  select u.id, u.created_at, u.last_sign_in_at
    from auth.users u, gesucht g
   where lower(u.email) = g.adresse
)
select 'Nutzer' as was,
       'angelegt ' || n.created_at::date::text || ', zuletzt angemeldet '
       || coalesce(n.last_sign_in_at::date::text, 'nie') as details
  from nutzer n
union all
select 'Rolle', coalesce(p.role::text, '–')
  from profiles p join nutzer n on n.id = p.id
union all
select 'gebunden an Klient',
       c.full_name || ' bei Trainer ' || coalesce(co.display_name, '?')
  from clients c
  join nutzer n on n.id = c.profile_id
  left join coaches co on co.id = c.coach_id
union all
select 'kein Klient gebunden', 'frei für eine Einladung'
 where not exists (select 1 from clients c join nutzer n on n.id = c.profile_id)
   and exists (select 1 from nutzer);
