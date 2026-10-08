-- Joël als Trainer (neue Adresse). Im SQL-Editor ausfuehren,
-- NACHDEM die Einladung im Dashboard verschickt wurde:
-- Authentication → Users → Add user → Send invitation → coach@joelletics.com

select promote_to_coach('coach@joelletics.com', 'Joël Hogenkamp');

-- Erwartet: "coach@joelletics.com ist jetzt Trainer."
