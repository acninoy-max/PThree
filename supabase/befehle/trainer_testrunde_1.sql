-- Testrunde 1: drei Trainer freischalten.
-- Im SQL-Editor ausfuehren, NACHDEM alle drei Einladungen im Dashboard
-- verschickt wurden: Authentication → Users → Add user → Send invitation.

select promote_to_coach('adrijesi15@gmail.com', 'Ajv lifestyle');
select promote_to_coach('worksb17@gmail.com',   'Shawn Byrne');
select promote_to_coach('code9.fit@gmail.com',  'hybrid.impact');

-- Der SQL-Editor zeigt nur das Ergebnis der LETZTEN Zeile. Ob alle drei
-- durch sind, sagt deshalb erst die Pruefung danach:
-- supabase/befehle/trainer_pruefen.sql
