-- Prueft, ob die Migrationen 0007 bis 0023 vollstaendig gelandet sind.
-- Reine Leseabfrage, aendert nichts.
--
-- EINE Abfrage, ein Ergebnis: Der SQL-Editor zeigt nur das Resultat der
-- letzten Anweisung. Zwei getrennte Abfragen haetten bedeutet, dass die
-- Pruefungen unsichtbar bleiben.
--
-- Erwartung: keine Zeile mit ">>> FEHLT <<<". Ganz unten stehen die
-- tatsaechlichen Zahlen als Info.
--
-- Zwei Vorkehrungen, damit die Datei bei JEDEM Migrationsstand laeuft:
--
-- 1. coalesce(..., false): Fehlt eine Spalte, liefert die Unterabfrage
--    keine Zeile und damit NULL. Ohne coalesce wuerde ausgerechnet der
--    Fehlerfall als "—" durchrutschen.
--
-- 2. to_jsonb(zeile) ->> 'spalte' statt direkter Spaltenzugriff bei
--    allem, was aus neueren Migrationen stammt. Postgres loest
--    Spaltennamen beim Planen auf — eine fehlende Spalte laesst die
--    ganze Abfrage scheitern, auch wenn sie nur in einer Infozeile
--    vorkommt. Der Umweg ueber JSON wird erst zur Laufzeit aufgeloest
--    und liefert dann schlicht NULL.

with pruefungen(sortierung, bereich, pruefung, ist_ok) as (

  -- 0008: Muster darf leer sein, grosse Bibliothek
  select 1, '0008', 'exercises.pattern optional',
         coalesce((select is_nullable = 'YES' from information_schema.columns
          where table_name = 'exercises' and column_name = 'pattern'), false)
  union all
  select 1, '0008', 'plan_slots.pattern optional',
         coalesce((select is_nullable = 'YES' from information_schema.columns
          where table_name = 'plan_slots' and column_name = 'pattern'), false)
  union all
  select 1, '0008', 'session_slots.pattern optional',
         coalesce((select is_nullable = 'YES' from information_schema.columns
          where table_name = 'session_slots' and column_name = 'pattern'), false)
  union all
  -- 0008 lieferte 76. Spaetere Migrationen legen dazu (0014: Split Squat),
  -- deshalb hier eine Untergrenze — die genaue Zahl prueft die juengste
  -- Migration. Sonst meldet diese Zeile bei jedem Zuwachs falschen Alarm.
  select 1, '0008', 'Bibliothek hat mindestens 76 globale Uebungen',
         (select count(*) >= 76 from exercises where coach_id is null)
  union all
  select 1, '0008', 'davon 12 Rumpfuebungen ohne Muster',
         (select count(*) = 12 from exercises
          where coach_id is null and pattern is null and default_block = 'core')
  union all
  select 1, '0008', 'keine musterlose Uebung ausserhalb Rumpf',
         (select count(*) = 0 from exercises
          where pattern is null and default_block <> 'core')

  -- 0009: Ausfuehrung
  union all
  select 1, '0009', 'exercises.setup vorhanden',
         (select count(*) = 1 from information_schema.columns
          where table_name = 'exercises' and column_name = 'setup')
  union all
  select 1, '0009', 'Aufbau-Zeilen gefuellt (mind. 30)',
         (select count(*) >= 30 from exercises e
          where to_jsonb(e) ->> 'setup' is not null)
  union all
  select 1, '0009', 'plan_slots.tempo + rest_seconds',
         (select count(*) = 2 from information_schema.columns
          where table_name = 'plan_slots'
            and column_name in ('tempo', 'rest_seconds'))
  union all
  select 1, '0009', 'plan_days.is_guided',
         (select count(*) = 1 from information_schema.columns
          where table_name = 'plan_days' and column_name = 'is_guided')
  union all
  select 1, '0009', 'sessions.duration_seconds + is_complete',
         (select count(*) = 2 from information_schema.columns
          where table_name = 'sessions'
            and column_name in ('duration_seconds', 'is_complete'))
  union all
  select 1, '0009', 'session_sets.rir vorhanden',
         (select count(*) = 1 from information_schema.columns
          where table_name = 'session_sets' and column_name = 'rir')
  union all
  select 1, '0009', 'session_sets.rpe entfernt',
         (select count(*) = 0 from information_schema.columns
          where table_name = 'session_sets' and column_name = 'rpe')

  -- 0010: Koerpermasse
  union all
  select 1, '0010', 'fuenf Massspalten in check_ins',
         (select count(*) = 5 from information_schema.columns
          where table_name = 'check_ins'
            and column_name in ('shoulders_cm','chest_cm','waist_cm','arm_cm','thigh_cm'))
  union all
  select 1, '0010', 'Konfiguration je Klient',
         (select count(*) = 6 from information_schema.columns
          where table_name = 'check_in_configs'
            and column_name in ('ask_shoulders','ask_chest','ask_waist',
                                'ask_arm','ask_thigh','measure_every_weeks'))
  union all
  select 1, '0010', 'Schutz-Trigger kennt die Massspalten',
         coalesce((select prosrc like '%shoulders_cm is distinct from old.shoulders_cm%'
          from pg_proc where proname = 'guard_check_in_columns'), false)

  -- 0011/0012: Wochentage
  union all
  select 1, '0012', 'plan_days.weekdays vorhanden',
         (select count(*) = 1 from information_schema.columns
          where table_name = 'plan_days' and column_name = 'weekdays')
  union all
  select 1, '0012', 'plan_days.weekdays ist eine Liste',
         coalesce((select data_type = 'ARRAY' from information_schema.columns
          where table_name = 'plan_days' and column_name = 'weekdays'), false)
  union all
  select 1, '0012', 'plan_days.weekdays ist optional',
         coalesce((select is_nullable = 'YES' from information_schema.columns
          where table_name = 'plan_days' and column_name = 'weekdays'), false)
  union all
  select 1, '0012', 'alte Einzelspalte weekday entfernt',
         (select count(*) = 0 from information_schema.columns
          where table_name = 'plan_days' and column_name = 'weekday')
  union all
  select 1, '0012', 'Normalisierungs-Trigger aktiv',
         (select count(*) = 1 from pg_trigger
          where tgname = 'plan_days_normalize_weekdays' and not tgisinternal)
  union all
  -- Der Trigger soll genau das verhindern; findet sich doch eine Zeile,
  -- stammt sie aus der Zeit davor.
  select 1, '0012', 'keine unsortierten oder doppelten Wochentage',
         (select count(*) = 0 from plan_days d
          where jsonb_typeof(to_jsonb(d) -> 'weekdays') = 'array'
            and (select array_agg(distinct e::int order by e::int)
                 from jsonb_array_elements_text(to_jsonb(d) -> 'weekdays') e)
                is distinct from
                (select array_agg(e::int)
                 from jsonb_array_elements_text(to_jsonb(d) -> 'weekdays') e))

  -- 0013: Muskelgruppen
  union all
  select 1, '0013', 'Typ muscle_group vorhanden',
         (select count(*) = 1 from pg_type where typname = 'muscle_group')
  union all
  select 1, '0013', 'Typ hat zehn Gruppen',
         coalesce((select count(*) = 10 from pg_enum e
          join pg_type t on t.oid = e.enumtypid
          where t.typname = 'muscle_group'), false)
  union all
  select 1, '0013', 'exercises.muscle_group ist Pflicht',
         coalesce((select is_nullable = 'NO' from information_schema.columns
          where table_name = 'exercises' and column_name = 'muscle_group'), false)
  union all
  select 1, '0013', 'plan_slots.muscle_group vorhanden',
         (select count(*) = 1 from information_schema.columns
          where table_name = 'plan_slots' and column_name = 'muscle_group')
  union all
  select 1, '0013', 'session_slots.muscle_group vorhanden',
         (select count(*) = 1 from information_schema.columns
          where table_name = 'session_slots' and column_name = 'muscle_group')
  union all
  select 1, '0013', 'alle globalen Uebungen zugeordnet',
         (select count(*) = 0 from exercises e
          where coach_id is null
            and to_jsonb(e) ->> 'muscle_group' is null)
  union all
  -- Beine aufgeteilt: Wenn eine der vier Beingruppen leer bleibt, ist die
  -- Zuordnung nicht angekommen — das faellt sonst erst im Studio auf.
  select 1, '0013', 'alle zehn Gruppen sind belegt',
         (select count(distinct to_jsonb(e) ->> 'muscle_group') = 10
          from exercises e where coach_id is null)
  union all
  select 1, '0013', 'keine Uebung ohne Gruppe',
         (select count(*) = 0 from exercises e
          where to_jsonb(e) ->> 'muscle_group' is null)

  -- 0014: Nebengruppen
  union all
  select 1, '0014', 'exercises.secondary_muscle_groups vorhanden',
         (select count(*) = 1 from information_schema.columns
          where table_name = 'exercises'
            and column_name = 'secondary_muscle_groups')
  union all
  select 1, '0014', 'Normalisierungs-Trigger aktiv',
         (select count(*) = 1 from pg_trigger
          where tgname = 'exercises_normalize_muscle_groups'
            and not tgisinternal)
  union all
  -- Der Trigger soll genau das verhindern.
  select 1, '0014', 'Hauptgruppe steht nie auch als Nebengruppe',
         -- Die Klammern sind Pflicht: `->` bindet staerker als `@>`.
         -- Ohne sie liest Postgres `(a -> 'x' @> b) -> 'y'` und bricht mit
         -- „operator does not exist: boolean -> unknown" ab.
         (select count(*) = 0 from exercises e
          where jsonb_typeof(to_jsonb(e) -> 'secondary_muscle_groups') = 'array'
            and (to_jsonb(e) -> 'secondary_muscle_groups')
                @> (to_jsonb(e) -> 'muscle_group'))
  union all
  select 1, '0014', 'Joel: Langhantelrudern ist Grunduebung',
         (select count(*) = 1 from exercises
          where coach_id is null and name = 'Langhantelrudern'
            and default_block = 'compound')
  union all
  select 1, '0014', 'Joel: Bulgarian Split Squat auf Gesaess',
         (select count(*) = 1 from exercises e
          where coach_id is null and name = 'Bulgarian Split Squat'
            and to_jsonb(e) ->> 'muscle_group' = 'glutes')
  union all
  select 1, '0014', 'Joel: Gironda Dips umbenannt',
         (select count(*) = 1 from exercises
          where coach_id is null and name = 'Gironda Dips (Brustversion)')
  union all
  select 1, '0014', 'Joel: Split Squat ergaenzt (77 Uebungen)',
         (select count(*) = 77 from exercises where coach_id is null)
  union all
  select 1, '0014', '44 Uebungen mit Nebengruppe',
         (select count(*) = 44 from exercises e
          where coach_id is null
            and jsonb_typeof(to_jsonb(e) -> 'secondary_muscle_groups') = 'array')

  -- 0015: Koerpergewicht als Last
  union all
  select 1, '0015', 'exercises.bodyweight_factor vorhanden',
         (select count(*) = 1 from information_schema.columns
          where table_name = 'exercises' and column_name = 'bodyweight_factor')
  union all
  select 1, '0015', 'session_sets.body_load_kg vorhanden',
         (select count(*) = 1 from information_schema.columns
          where table_name = 'session_sets' and column_name = 'body_load_kg')
  union all
  select 1, '0015', '10 Uebungen mit Koerpergewichtsfaktor',
         (select count(*) = 10 from exercises e
          where coach_id is null
            and to_jsonb(e) ->> 'bodyweight_factor' is not null)
  union all
  select 1, '0015', 'Klimmzug traegt den ganzen Koerper',
         (select count(*) = 1 from exercises e
          where coach_id is null and name = 'Klimmzüge'
            and (to_jsonb(e) ->> 'bodyweight_factor')::numeric = 1.0)
  union all
  -- Gehaltene Uebungen bleiben bewusst ohne Faktor: „Last mal
  -- Wiederholungen" ergibt bei einer Plank keine sinnvolle Zahl.
  select 1, '0015', 'Plank bleibt ohne Faktor',
         (select count(*) = 1 from exercises e
          where coach_id is null and name = 'Plank'
            and to_jsonb(e) ->> 'bodyweight_factor' is null)
  union all
  select 1, '0015', 'kein Faktor ausserhalb des erlaubten Bereichs',
         (select count(*) = 0 from exercises e
          where (to_jsonb(e) ->> 'bodyweight_factor')::numeric
                not between 0.01 and 1.5)

  -- 0016/0017: Fortschrittsauswahl und Erfasser
  union all
  select 1, '0016', 'Tabelle progress_selections vorhanden',
         (select count(*) = 1 from information_schema.tables
          where table_schema = 'public' and table_name = 'progress_selections')
  union all
  select 1, '0016', 'progress_selections hat RLS',
         coalesce((select c.relrowsecurity from pg_class c
          join pg_namespace n on n.oid = c.relnamespace
          where n.nspname = 'public' and c.relname = 'progress_selections'), false)
  union all
  select 1, '0016', 'Zugriffsregel fuer progress_selections',
         (select count(*) >= 1 from pg_policies
          where schemaname = 'public' and tablename = 'progress_selections')
  union all
  select 1, '0018', 'progress_selections.viewer_id vorhanden',
         (select count(*) = 1 from information_schema.columns
          where table_name = 'progress_selections' and column_name = 'viewer_id')
  union all
  select 1, '0018', 'viewer_id ist Pflicht',
         coalesce((select is_nullable = 'NO' from information_schema.columns
          where table_name = 'progress_selections'
            and column_name = 'viewer_id'), false)
  union all
  -- Athlet und Trainer duerfen fuer denselben Klienten unterschiedlich
  -- waehlen. Ohne viewer_id im Schluessel ginge das nicht.
  select 1, '0018', 'Schluessel enthaelt den Betrachter',
         (select count(*) = 3 from information_schema.key_column_usage
          where table_name = 'progress_selections'
            and constraint_name like '%pkey%'
            and column_name in ('client_id', 'viewer_id', 'exercise_id'))
  union all
  -- Lesen darf, wer den Klienten sehen darf. Schreiben nur die eigene
  -- Liste — sonst koennte der Trainer die Auswahl seines Klienten
  -- umschreiben.
  select 1, '0018', 'Schreiben nur in eigenem Namen',
         (select count(*) = 1 from pg_policies
          where schemaname = 'public'
            and tablename = 'progress_selections'
            and policyname = 'progress_selections_write')
  union all
  select 1, '0017', 'sessions.recorded_by vorhanden',
         (select count(*) = 1 from information_schema.columns
          where table_name = 'sessions' and column_name = 'recorded_by')
  union all
  -- Der Coach durfte schon immer fuer seine Klienten schreiben. Diese
  -- Zeile haelt fest, dass die Regel noch da ist — ohne sie waere die
  -- Tracking-Strecke ein Knopf, der nichts tut.
  select 1, '0017', 'Coach darf Einheiten seiner Klienten schreiben',
         (select count(*) = 1 from pg_policies
          where schemaname = 'public' and tablename = 'sessions'
            and policyname = 'sessions_coach_all')

  -- 0019: eigene Anordnung der Klientenakte
  union all
  select 1, '0019', 'Tabelle client_view_sections vorhanden',
         (select count(*) = 1 from information_schema.tables
          where table_schema = 'public'
            and table_name = 'client_view_sections')
  union all
  select 1, '0019', 'client_view_sections hat RLS',
         coalesce((select c.relrowsecurity from pg_class c
          join pg_namespace n on n.oid = c.relnamespace
          where n.nspname = 'public'
            and c.relname = 'client_view_sections'), false)
  union all
  -- Nur die eigene Einstellung, kein Umweg ueber Klient oder
  -- Organisation. Faellt diese Regel weg, sieht jeder Trainer die
  -- Anordnung jedes anderen.
  select 1, '0019', 'Einstellung gehoert nur ihrem Nutzer',
         (select count(*) = 1 from pg_policies
          where schemaname = 'public'
            and tablename = 'client_view_sections'
            and policyname = 'client_view_sections_own')

  -- 0020: Fortschrittsfotos
  union all
  select 1, '0020', 'Tabellen progress_photos und photo_consents',
         (select count(*) = 2 from information_schema.tables
          where table_schema = 'public'
            and table_name in ('progress_photos', 'photo_consents'))
  union all
  select 1, '0020', 'Typ photo_pose mit drei Ansichten',
         coalesce((select count(*) = 3 from pg_enum e
          join pg_type t on t.oid = e.enumtypid
          where t.typname = 'photo_pose'), false)
  union all
  select 1, '0020', 'Funktion has_photo_consent vorhanden',
         (select count(*) = 1 from pg_proc
          where proname = 'has_photo_consent')
  union all
  -- DIE wichtigste Zeile dieses Blocks. Faellt sie weg, kann jemand
  -- ohne Einwilligung Koerperfotos ablegen — und zwar ohne dass es
  -- irgendwo auffaellt, weil die Oberflaeche trotzdem fragt.
  select 1, '0020', 'Upload braucht eine Einwilligung',
         coalesce((select with_check like '%has_photo_consent%'
          from pg_policies
          where schemaname = 'public'
            and tablename = 'progress_photos'
            and policyname = 'progress_photos_insert'), false)
  union all
  select 1, '0020', 'Ansehen braucht eine Einwilligung',
         coalesce((select qual like '%has_photo_consent%'
          from pg_policies
          where schemaname = 'public'
            and tablename = 'progress_photos'
            and policyname = 'progress_photos_read'), false)
  union all
  -- Nur der Athlet willigt ein. Eine Einwilligung, die ein anderer
  -- erteilt, ist keine.
  select 1, '0020', 'Einwilligung nur in eigenem Namen',
         coalesce((select with_check like '%granted_by = auth.uid()%'
          from pg_policies
          where schemaname = 'public'
            and tablename = 'photo_consents'
            and policyname = 'photo_consents_grant'), false)
  union all
  select 1, '0020', 'Widerruf raeumt die Zeilen weg (Trigger)',
         (select count(*) = 1 from pg_trigger
          where tgname = 'photo_consents_purge' and not tgisinternal)
  union all
  select 1, '0020', 'Bucket progress-photos ist NICHT oeffentlich',
         coalesce((select not public from storage.buckets
          where id = 'progress-photos'), false)
  union all
  select 1, '0020', 'drei Regeln auf storage.objects',
         (select count(*) = 3 from pg_policies
          where schemaname = 'storage' and tablename = 'objects'
            and policyname like 'progress_photos_object_%')
  union all
  -- Ein Bild ohne gueltige Einwilligung waere ein Datenschutzverstoss,
  -- der still im Speicher liegt. Diese Zeile findet ihn.
  select 1, '0020', 'kein Foto ohne gueltige Einwilligung',
         (select count(*) = 0 from progress_photos p
          where not exists (
            select 1 from photo_consents c
            where c.client_id = p.client_id and c.revoked_at is null))

  -- 0021: Profil des Klienten
  union all
  select 1, '0021', 'clients.birth_date + avatar_path',
         (select count(*) = 2 from information_schema.columns
          where table_name = 'clients'
            and column_name in ('birth_date', 'avatar_path'))
  union all
  -- DIE Zeile dieses Blocks. `clients_self_update` gibt es seit 0002 —
  -- der Athlet durfte seine Zeile also schon immer schreiben, samt
  -- coach_id, level und status. Zeilensicherheit entscheidet ueber
  -- Zeilen, nicht ueber Spalten; der Trigger schliesst die Luecke.
  select 1, '0021', 'Athlet kann Trainer/Level/Status NICHT umschreiben',
         (select count(*) = 1 from pg_trigger
          where tgname = 'clients_self_edit_guard' and not tgisinternal)
  union all
  select 1, '0021', 'Trigger setzt coach_id zurueck',
         coalesce((select prosrc like '%new.coach_id := old.coach_id%'
          from pg_proc where proname = 'guard_client_self_edit'), false)
  union all
  select 1, '0021', 'Bucket avatars ist NICHT oeffentlich',
         coalesce((select not public from storage.buckets
          where id = 'avatars'), false)
  union all
  select 1, '0021', 'drei Regeln fuer Profilbilder',
         (select count(*) = 3 from pg_policies
          where schemaname = 'storage' and tablename = 'objects'
            and policyname like 'avatar_object_%')
  union all
  -- Ein Profilbild im Ordner eines fremden Klienten waere ein Bild, das
  -- der Falsche sieht.
  select 1, '0021', 'kein Profilbild im fremden Ordner',
         (select count(*) = 0 from clients c
          where to_jsonb(c) ->> 'avatar_path' is not null
            and to_jsonb(c) ->> 'avatar_path' not like c.id::text || '/%')

  -- 0022: Haerten vor dem Ausrollen
  union all
  select 1, '0022', 'verwaiste_fotos rechnet mit den Rechten des Aufrufers',
         coalesce((select 'security_invoker=true' = any(reloptions)
          from pg_class where relname = 'verwaiste_fotos'), false)
  union all
  -- Zweiter Riegel. Einer allein reicht nicht: security_invoker ohne
  -- Entzug laesst die Sicht lesbar, Entzug ohne security_invoker laesst
  -- sie fuer den Eigentuemer an der Zeilensicherheit vorbeilesen.
  select 1, '0022', 'verwaiste_fotos fuer authenticated gesperrt',
         coalesce((select not has_table_privilege(
           'authenticated', 'verwaiste_fotos', 'select')), false)
  union all
  select 1, '0022', 'promote_to_coach vorhanden',
         (select count(*) = 1 from pg_proc where proname = 'promote_to_coach')
  union all
  select 1, '0022', 'promote_to_coach nicht fuer authenticated',
         coalesce((select not has_function_privilege(
           'authenticated', p.oid, 'execute')
          from pg_proc p where p.proname = 'promote_to_coach'), false)

  -- 0023: der Rollenname in handle_new_user
  union all
  -- 0022 setzte die Standardrolle auf 'client'. Diesen Wert gibt es in
  -- `user_role` nicht — jede Registrierung waere gescheitert, und zwar
  -- erst zur Laufzeit. Deshalb steht die Pruefung hier und nicht nur im
  -- Kopf von irgendwem.
  select 1, '0023', 'Standardrolle ist athlete, nicht client',
         coalesce((select prosrc like '%''athlete''::user_role%'
                     and prosrc not like '%''client''%'
          from pg_proc where proname = 'handle_new_user'), false)
  union all
  select 1, '0023', 'kein Trainerkonto aus dem Browser',
         coalesce((select prosrc like '%service_role%'
          from pg_proc where proname = 'handle_new_user'), false)
  union all
  select 1, '0023', 'Registrierungs-Trigger haengt an auth.users',
         (select count(*) = 1 from pg_trigger
          where tgname = 'on_auth_user_created' and not tgisinternal)

  -- 0007: Check-in-Schutz
  union all
  select 1, '0007', 'Check-in-Trigger aktiv',
         (select count(*) = 1 from pg_trigger
          where tgname = 'check_ins_guard' and not tgisinternal)
  union all
  select 1, '0007', 'jeder Klient hat eine Check-in-Konfiguration',
         (select count(*) = 0 from clients c
          where not exists (select 1 from check_in_configs k
                            where k.client_id = c.id))

  -- Sicherheit
  union all
  select 1, 'RLS', 'Row Level Security auf allen Tabellen',
         (select count(*) = 0 from pg_tables t
          join pg_class c on c.relname = t.tablename
          where t.schemaname = 'public' and not c.relrowsecurity)
),

-- Die echten Zahlen, damit ein FEHLT sofort erklaerbar ist.
zahlen(sortierung, bereich, pruefung, ist_ok) as (
  select 2, 'INFO', 'Uebungen global: '
         || (select count(*) from exercises where coach_id is null), null::boolean
  union all
  select 2, 'INFO', 'Uebungen eigene: '
         || (select count(*) from exercises where coach_id is not null), null::boolean
  union all
  select 2, 'INFO', 'Uebungen ohne Muster: '
         || (select count(*) from exercises where pattern is null), null::boolean
  union all
  select 2, 'INFO', 'Uebungen mit Aufbau-Zeile: '
         || (select count(*) from exercises e
             where to_jsonb(e) ->> 'setup' is not null), null::boolean
  union all
  select 2, 'INFO', 'Muskelgruppen belegt: '
         || (select count(distinct to_jsonb(e) ->> 'muscle_group')
             from exercises e where coach_id is null) || ' von 10', null::boolean
  union all
  select 2, 'INFO', 'Uebungen mit Nebengruppe: '
         || (select count(*) from exercises e
             where jsonb_typeof(to_jsonb(e) -> 'secondary_muscle_groups')
                   = 'array'), null::boolean
  union all
  select 2, 'INFO', 'Saetze mit Koerperanteil: '
         || (select count(*) from session_sets ss
             where to_jsonb(ss) ->> 'body_load_kg' is not null), null::boolean
  union all
  select 2, 'INFO', 'Einheiten vom Trainer erfasst: '
         || (select count(*) from sessions s
             where to_jsonb(s) ->> 'recorded_by' is not null), null::boolean
  union all
  select 2, 'INFO', 'Klienten: '
         || (select count(*) from clients), null::boolean
  union all
  select 2, 'INFO', 'Plaene: '
         || (select count(*) from plans), null::boolean
  union all
  select 2, 'INFO', 'Einheiten: '
         || (select count(*) from sessions), null::boolean
  union all
  select 2, 'INFO', 'Check-ins abgeschickt: '
         || (select count(*) from check_ins where submitted_at is not null), null::boolean
  union all
  select 2, 'INFO', 'Plantage mit festem Wochentag: '
         || (select count(*) from plan_days d
             where jsonb_typeof(to_jsonb(d) -> 'weekdays') = 'array'), null::boolean
  union all
  select 2, 'INFO', 'davon mehrmals pro Woche: '
         || (select count(*) from plan_days d
             where jsonb_typeof(to_jsonb(d) -> 'weekdays') = 'array'
               and jsonb_array_length(to_jsonb(d) -> 'weekdays') > 1),
         null::boolean
  union all
  select 2, 'INFO', 'Check-ins mit Massen: '
         || (select count(*) from check_ins c
             where coalesce(
                     to_jsonb(c) ->> 'shoulders_cm',
                     to_jsonb(c) ->> 'chest_cm',
                     to_jsonb(c) ->> 'waist_cm',
                     to_jsonb(c) ->> 'arm_cm',
                     to_jsonb(c) ->> 'thigh_cm'
                   ) is not null), null::boolean
)

select
  bereich,
  case
    when ist_ok is null then '—'
    when ist_ok then 'OK'
    else '>>> FEHLT <<<'
  end as status,
  pruefung
from (select * from pruefungen union all select * from zahlen) alles
order by
  sortierung,
  -- Fehlendes zuerst, damit es nicht untergeht.
  (case when ist_ok is false then 0 else 1 end),
  bereich,
  pruefung;
