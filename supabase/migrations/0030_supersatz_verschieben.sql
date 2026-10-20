-- ============================================================
-- 0030 — Supersätze als Block verschieben
-- ============================================================
--
-- WAS FALSCH WAR
-- --------------
-- Der Plan-Editor verschob einen Slot, indem er mit dem direkten
-- Nachbarn die Position tauschte: zwei unabhängige `update`s aus der
-- App, ohne nachzulesen. Zwei Folgen, beide im Test vom 15.10.2026:
--
-- 1. Supersätze brachen auseinander. A1 + A2 stehen zusammen; wer A2
--    nach oben schiebt, zieht ihn an A1 vorbei — oder schiebt B
--    zwischen A1 und A2. Danach ist es kein Supersatz mehr, nur zwei
--    Übungen mit demselben Buchstaben.
-- 2. Ging das zweite `update` schief, standen zwei Slots auf derselben
--    Position und die Reihenfolge war Zufall. Die App meldete Erfolg.
--
-- WIE ES JETZT LÄUFT
-- ------------------
-- Ein Tag besteht aus Blöcken: aufeinanderfolgende Slots mit demselben
-- Supersatz-Buchstaben bilden einen Block, jeder Slot ohne Buchstaben
-- ist ein Block für sich. Verschoben wird immer der ganze Block, und
-- zwar an dem ganzen Nachbarblock vorbei. Danach werden alle Positionen
-- des Tages lückenlos neu vergeben (1, 2, 3 …) — in einer Transaktion.
--
-- Zum Schluss liest die Funktion nach, ob jede Zeile die neue Position
-- trägt, und bricht sonst ab (Regel 3). Ein Abbruch rollt alles zurück;
-- es bleibt der alte Stand, nie ein halber.
--
-- RECHTE
-- ------
-- security invoker wie assign_template (0028): Die Zeilensicherheit von
-- plan_slots entscheidet, wer verschieben darf — der Trainer des Plans
-- bzw. der Besitzer des Programms. Ein Athlet sieht die Slots seines
-- Plans, darf sie aber nicht schreiben; bei ihm ändert das `update`
-- null Zeilen, und die Nachprüfung schlägt an, statt Erfolg zu melden.

create or replace function move_slot_block(
  p_slot uuid,
  p_richtung text
)
returns int
language plpgsql security invoker
set search_path = public as $$
declare
  v_tag      uuid;
  v_ids      uuid[] := '{}';
  v_block    int[]  := '{}';
  v_gruppe   text;
  v_vorher   text;
  v_nr       int := 0;
  v_mein     int;
  v_ziel     int;
  v_quelle   int;
  v_neu      uuid[] := '{}';
  v_geaendert int;
  v_falsch   int;
  r          record;
begin
  if p_richtung not in ('up', 'down') then
    raise exception 'move_slot_block: Richtung muss up oder down sein';
  end if;

  select plan_day_id into v_tag from plan_slots where id = p_slot;
  if v_tag is null then
    raise exception 'move_slot_block: Slot nicht gefunden';
  end if;

  -- Sperren, damit zwei schnelle Klicks nicht gegeneinander rechnen.
  perform 1 from plan_slots where plan_day_id = v_tag for update;

  -- Blöcke bilden. `id` als zweiter Schlüssel: Bei doppelter Position
  -- (Altlast des alten Tauschs) ist die Reihenfolge so wenigstens stabil.
  v_vorher := null;
  for r in
    select id, nullif(trim(superset_group), '') as gruppe
      from plan_slots
     where plan_day_id = v_tag
     order by position, id
  loop
    v_gruppe := r.gruppe;
    if v_gruppe is null or v_vorher is null or upper(v_gruppe) <> upper(v_vorher) then
      v_nr := v_nr + 1;
    end if;
    v_vorher := v_gruppe;
    v_ids   := v_ids || r.id;
    v_block := v_block || v_nr;
    if r.id = p_slot then
      v_mein := v_nr;
    end if;
  end loop;

  v_ziel := case when p_richtung = 'up' then v_mein - 1 else v_mein + 1 end;

  -- Am Rand: nichts zu tun, kein Fehler.
  if v_ziel < 1 or v_ziel > v_nr then
    return 0;
  end if;

  -- Neue Reihenfolge: Blöcke in alter Folge, nur v_mein und v_ziel
  -- getauscht. Innerhalb eines Blocks bleibt die Folge (A1 vor A2).
  --
  -- Der Block für Platz b steht in einer eigenen Variable: Ein `case`
  -- direkt in der `if`-Bedingung zerbricht PL/pgSQL, weil es die
  -- Bedingung nur bis zum ersten `then` liest — auch dem im `case`.
  for b in 1..v_nr loop
    v_quelle := case when b = v_mein then v_ziel
                     when b = v_ziel then v_mein
                     else b end;
    for i in 1..array_length(v_ids, 1) loop
      if v_block[i] = v_quelle then
        v_neu := v_neu || v_ids[i];
      end if;
    end loop;
  end loop;

  update plan_slots s
     set position = n.pos
    from unnest(v_neu) with ordinality as n(id, pos)
   where s.id = n.id;
  get diagnostics v_geaendert = row_count;

  if v_geaendert <> array_length(v_ids, 1) then
    raise exception 'move_slot_block: % von % Slots geändert — keine Berechtigung?',
      v_geaendert, array_length(v_ids, 1);
  end if;

  -- Nachlesen statt hoffen.
  select count(*) into v_falsch
    from unnest(v_neu) with ordinality as n(id, pos)
    join plan_slots s on s.id = n.id
   where s.position <> n.pos;
  if v_falsch > 0 then
    raise exception 'move_slot_block: % Slots stehen nicht, wo sie sollen', v_falsch;
  end if;

  return v_geaendert;
end;
$$;

-- PUBLIC zuerst — siehe 0029, warum anon allein nicht reicht.
revoke all on function move_slot_block(uuid, text) from public, anon;
grant execute on function move_slot_block(uuid, text) to authenticated;

do $$
begin
  if has_function_privilege('anon', 'move_slot_block(uuid, text)', 'execute') then
    raise exception '0030: move_slot_block ist fuer anon aufrufbar.';
  end if;
  if not has_function_privilege('authenticated', 'move_slot_block(uuid, text)', 'execute') then
    raise exception '0030: move_slot_block ist fuer Angemeldete nicht aufrufbar.';
  end if;
end;
$$;
