-- Alle Trainer auf einen Blick.
-- Bei jedem muss role = coach UND hat_trainersatz = true stehen.
-- last_sign_in_at bleibt leer, bis der Trainer sein Passwort gesetzt hat.

select u.email, p.full_name, p.role,
       exists (select 1 from coaches c where c.id = u.id) as hat_trainersatz,
       u.last_sign_in_at
  from auth.users u
  join profiles p on p.id = u.id
 where p.role = 'coach'
 order by u.created_at desc;
