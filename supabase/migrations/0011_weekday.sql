-- ============================================================
-- 0011 — Wochentag am Trainingstag
-- ============================================================
--
-- Aus dem Meeting mit Joel: Der Athlet braucht eine Wochenstruktur.
--
-- `weekday` bleibt bewusst optional. Manche Klienten trainieren fest
-- Montag, Mittwoch, Freitag — andere, wenn es passt. Ein Pflichtfeld
-- wuerde die zweite Gruppe zu einer Luege zwingen.
--
-- 1 = Montag bis 7 = Sonntag, wie ISO 8601. Das passt zu
-- extract(isodow from ...) und erspart Umrechnerei.

set search_path = public;

alter table plan_days add column if not exists weekday int;

alter table plan_days drop constraint if exists plan_days_weekday_range;
alter table plan_days add constraint plan_days_weekday_range
  check (weekday is null or (weekday between 1 and 7));

-- Zwei Trainingstage duerfen denselben Wochentag tragen (Vormittag und
-- Abend kommen vor), deshalb hier bewusst kein unique.

comment on column plan_days.weekday is
  'ISO-Wochentag 1=Montag bis 7=Sonntag. Null = ohne festen Tag.';
