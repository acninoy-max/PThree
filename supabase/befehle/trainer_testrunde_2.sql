-- Testrunde 2: zwei weitere Trainer freischalten.
-- Im SQL-Editor ausfuehren, NACHDEM beide Einladungen im Dashboard
-- verschickt wurden: Authentication → Users → Add user → Send invitation.

select promote_to_coach('jessevanderhorst@ziggo.nl',  'Jesse');
select promote_to_coach('marcussanders2000@gmail.com', 'Marcus');

-- Der SQL-Editor zeigt nur das Ergebnis der LETZTEN Zeile. Ob beide
-- durch sind, sagt erst die Pruefung danach:
-- supabase/befehle/trainer_pruefen.sql
