-- ============================================================
-- 0012 — Ein Trainingstag an mehreren Wochentagen
-- ============================================================
--
-- Upper/Lower ist der Normalfall, nicht die Ausnahme: Ober montags und
-- donnerstags, Unter dienstags und freitags. Mit einem einzelnen
-- `weekday` ging das nur, indem man den Tag dupliziert — zwei Zeilen mit
-- denselben Slots.
--
-- Das waere teuer erkauft. Ein Plantag ist die Einheit, an der die
-- Fortschreibung haengt: Slot, Uebung, letzte Last. Zwei Kopien heissen
-- zwei getrennte Historien fuer dasselbe Training, und die Uebernahme des
-- letzten Gewichts greift nur noch jede zweite Woche. Der Trainer muesste
-- ausserdem jede Aenderung zweimal pflegen und wuerde es irgendwann
-- vergessen.
--
-- Also andersherum: Der Trainingstag bleibt einer, seine Termine werden
-- zur Liste. `weekdays` beantwortet die Frage „wann findet das statt",
-- nicht „was ist das".
--
-- Warum ein Array und keine eigene Tabelle: Plantage werden ausnahmslos
-- verschachtelt unter dem Plan geladen. Eine Verknuepfungstabelle haette
-- eigene RLS-Regeln, einen weiteren Join in jeder Abfrage und eine
-- zweite Stelle, an der Rechte falsch sein koennen — fuer hoechstens
-- sieben kleine Zahlen ohne eigene Attribute.

set search_path = public;

-- ------------------------------------------------------------
-- Neue Spalte, Bestand uebernehmen
-- ------------------------------------------------------------

alter table plan_days add column if not exists weekdays smallint[];

-- Der bisherige Einzelwert wird zur einelementigen Liste. Laeuft nur,
-- solange die alte Spalte noch existiert — die Migration bleibt damit
-- wiederholbar.
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'plan_days'
      and column_name = 'weekday'
  ) then
    execute $sql$
      update plan_days
         set weekdays = array[weekday]::smallint[]
       where weekday is not null
         and weekdays is null
    $sql$;
    execute 'alter table plan_days drop constraint if exists plan_days_weekday_range';
    execute 'alter table plan_days drop column weekday';
  end if;
end $$;

-- ------------------------------------------------------------
-- Normalisierung
-- ------------------------------------------------------------
--
-- Sortiert und doppelfrei, bevor der Wert liegen bleibt. Die Alternative
-- waere, unsaubere Eingaben abzulehnen — aber „Montag zweimal
-- angeklickt" ist keine Fehleingabe, sondern eine Absicht, die man
-- eindeutig lesen kann. Und die Anzeige darf sich darauf verlassen, dass
-- die Reihenfolge stimmt, statt an jeder Stelle neu zu sortieren.
--
-- Eine leere Liste wird zu NULL: „kein fester Tag" soll genau eine
-- Schreibweise haben, sonst muss jede Abfrage beide pruefen.

create or replace function normalize_plan_day_weekdays()
returns trigger
language plpgsql
as $$
begin
  if new.weekdays is not null then
    select array_agg(distinct w order by w)
      into new.weekdays
      from unnest(new.weekdays) as w;
  end if;

  -- array_agg ueber eine leere Menge liefert bereits NULL; die zweite
  -- Bedingung faengt den Fall ab, dass jemand '{}' direkt schreibt.
  if new.weekdays is not null and cardinality(new.weekdays) = 0 then
    new.weekdays := null;
  end if;

  return new;
end;
$$;

drop trigger if exists plan_days_normalize_weekdays on plan_days;
create trigger plan_days_normalize_weekdays
  before insert or update of weekdays on plan_days
  for each row execute function normalize_plan_day_weekdays();

-- ------------------------------------------------------------
-- Wertebereich
-- ------------------------------------------------------------
--
-- Nur 1 bis 7. Doppelte Eintraege pruefen wir hier nicht: Das ginge nur
-- mit einer Unterabfrage, und die sind in CHECK-Bedingungen nicht
-- erlaubt. Der Trigger oben laeuft ohnehin vorher und laesst gar keine
-- durch.

alter table plan_days drop constraint if exists plan_days_weekdays_range;
alter table plan_days add constraint plan_days_weekdays_range
  check (
    weekdays is null
    or (
      cardinality(weekdays) between 1 and 7
      and weekdays <@ array[1,2,3,4,5,6,7]::smallint[]
    )
  );

-- Bestand nachziehen, falls dort schon etwas Unsortiertes liegt.
update plan_days set weekdays = weekdays where weekdays is not null;

-- „Welcher Tag liegt auf Donnerstag" — mit `3 = any(weekdays)` bzw.
-- `weekdays @> array[3]` nutzbar.
create index if not exists plan_days_weekdays_idx
  on plan_days using gin (weekdays);

comment on column plan_days.weekdays is
  'ISO-Wochentage 1=Montag bis 7=Sonntag, aufsteigend und doppelfrei. '
  'Null = ohne festen Tag. Mehrere Eintraege = derselbe Trainingstag '
  'mehrmals pro Woche (Upper/Lower).';
