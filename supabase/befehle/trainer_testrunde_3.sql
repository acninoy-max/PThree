-- Testrunde 3: Joel Boafo freischalten.
-- Im SQL-Editor ausfuehren, NACHDEM die Einladung im Dashboard
-- verschickt wurde: Authentication → Users → Add user → Send invitation.
--
-- Name aus der Adresse abgeleitet — bei Bedarf vor dem Ausfuehren
-- anpassen.

select promote_to_coach('joel.boafo@hotmail.com', 'Joel Boafo');

-- Erwartet: "joel.boafo@hotmail.com ist jetzt Trainer."
