-- Neuen Trainer freischalten. Im SQL-Editor ausfuehren, NACHDEM die
-- Einladung im Dashboard verschickt wurde:
-- Authentication → Users → Add user → Send invitation → Adresse
--
-- Adresse und Name ersetzen, eine Zeile je Trainer.

select promote_to_coach('trainer@example.com', 'Vorname Nachname');

-- Erwartet: "... ist jetzt Trainer."
-- "Kein Zugang mit ...": Einladung fehlt oder Adresse vertippt.
