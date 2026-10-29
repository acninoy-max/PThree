-- ============================================================
-- 0037 — Geschlecht für die Körperfett-Formel
-- ============================================================
--
-- Meeting 29.10.2026: Die App schätzt den Körperfettanteil aus Taille
-- und Gewicht (YMCA-Formel, app/koerperfett.ts). Die Formel hat für
-- Männer und Frauen verschiedene Konstanten — dafür, und nur dafür,
-- dieses Feld. null = nicht angegeben, dann zeigt die App keinen
-- Körperfettwert.
--
-- Der Trainer trägt es in den Stammdaten ein. Es ist eine Angabe für
-- eine Rechenformel, kein Profilmerkmal, und wird nirgends sonst
-- angezeigt.

alter table clients
  add column if not exists formula_sex text;

alter table clients drop constraint if exists clients_formula_sex_gueltig;
alter table clients add constraint clients_formula_sex_gueltig
  check (formula_sex is null or formula_sex in ('male', 'female'));

comment on column clients.formula_sex is
  'Nur für die Körperfett-Formel (YMCA): male/female, null = nicht angegeben (0037).';

do $$
begin
  if not exists (select 1 from information_schema.columns
                  where table_name = 'clients' and column_name = 'formula_sex') then
    raise exception '0037: clients.formula_sex fehlt.';
  end if;
end;
$$;
