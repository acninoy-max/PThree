-- Testrunde 4: Koemeester Performance freischalten.
-- Im SQL-Editor ausfuehren, NACHDEM die Einladung im Dashboard
-- verschickt wurde: Authentication → Users → Add user → Send invitation.
--
-- Name aus der Adresse abgeleitet — bei Bedarf vor dem Ausfuehren
-- anpassen.

select promote_to_coach('info@koemeesterperformance.nl', 'Koemeester Performance');

-- Erwartet: "info@koemeesterperformance.nl ist jetzt Trainer."
