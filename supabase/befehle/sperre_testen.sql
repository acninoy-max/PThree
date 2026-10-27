-- Test: Ist eine bestätigte Einheit wirklich gesperrt? (0033)
--
-- Spielt den Trainer so, wie die App ihn an die Datenbank schickt
-- (Rolle „authenticated", eigene Nutzer-ID), und versucht an der
-- bestätigten Einheit von „Aaron TestClient3":
--   1. die Dauer zu ändern
--   2. die Bestätigung zurückzunehmen
--   3. sie zu löschen
-- Erwartet: alle drei „gesperrt".
--
-- Ändert NICHTS: Jeder Versuch läuft in einem eigenen Unterblock, der
-- in jedem Fall mit einem Fehler endet und damit zurückgerollt wird —
-- auch wenn die Sperre wider Erwarten nicht greift. Ergebnis steht in
-- der Tabelle unten.

create temp table if not exists sperrtest (versuch text, ergebnis text);
delete from sperrtest;

do $$
declare
  v_trainer uuid := 'e113483b-479e-4455-b709-2bc47889886b';
  v_einheit uuid;
  v_ergebnis text[] := '{}';
begin
  select id into v_einheit
    from sessions
   where client_id = '5442dde9-81f8-421c-a2ac-e3963f3e7788'
     and confirmed_at is not null
   order by performed_at desc
   limit 1;

  if v_einheit is null then
    insert into sperrtest values ('Vorbedingung', 'keine bestätigte Einheit gefunden');
    return;
  end if;

  -- Ab hier wie die App: Rolle authenticated, angemeldet als Trainer.
  perform set_config('request.jwt.claims',
    json_build_object('sub', v_trainer, 'role', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', v_trainer::text, true);
  execute 'set local role authenticated';

  begin
    update sessions set duration_seconds = 1 where id = v_einheit;
    -- Immer abbrechen: rollt den Versuch zurück, auch wenn er durchging.
    raise exception 'DURCHGEGANGEN';
  exception when others then
    if sqlerrm = 'DURCHGEGANGEN' then
      v_ergebnis := v_ergebnis || 'Dauer ändern: ERLAUBT (Fehler!), zurückgerollt';
    else
      v_ergebnis := v_ergebnis || ('Dauer ändern: gesperrt (' || sqlerrm || ')');
    end if;
  end;

  begin
    update sessions set confirmed_at = null where id = v_einheit;
    -- Immer abbrechen: rollt den Versuch zurück, auch wenn er durchging.
    raise exception 'DURCHGEGANGEN';
  exception when others then
    if sqlerrm = 'DURCHGEGANGEN' then
      v_ergebnis := v_ergebnis || 'Bestätigung zurücknehmen: ERLAUBT (Fehler!), zurückgerollt';
    else
      v_ergebnis := v_ergebnis || ('Bestätigung zurücknehmen: gesperrt (' || sqlerrm || ')');
    end if;
  end;

  begin
    delete from sessions where id = v_einheit;
    -- Immer abbrechen: rollt den Versuch zurück, auch wenn er durchging.
    raise exception 'DURCHGEGANGEN';
  exception when others then
    if sqlerrm = 'DURCHGEGANGEN' then
      v_ergebnis := v_ergebnis || 'Löschen: ERLAUBT (Fehler!), zurückgerollt';
    else
      v_ergebnis := v_ergebnis || ('Löschen: gesperrt (' || sqlerrm || ')');
    end if;
  end;

  execute 'reset role';
  insert into sperrtest
    select split_part(e, ': ', 1), split_part(e, ': ', 2) from unnest(v_ergebnis) e;
end;
$$;

select * from sperrtest;
