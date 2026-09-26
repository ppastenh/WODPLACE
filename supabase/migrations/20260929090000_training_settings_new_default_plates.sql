-- ============================================================================
-- training_settings — new default plate set + preferred unit
-- ----------------------------------------------------------------------------
-- STATUS: applied — do not re-run.
-- APPLIED: to wiwpaekdykxernegicdv directly via api-server's DATABASE_URL.
-- ----------------------------------------------------------------------------
-- New default for accounts that never configured training_settings: a mixed
-- lb/kg set (lb for the main plates, kg fractionals for fine adjustment),
-- with preferred_unit defaulting to 'lb' to match (was an all-kg set with
-- 'kg' as the unit).
--
-- Existing rows: only backfilled when BOTH preferred_unit = 'kg' AND plates
-- exactly matches the OLD default array — that combination is the signal
-- that an account never touched training_settings at all. Any row that
-- customized either field (even just switching to 'lb' while keeping the
-- kg plate set, or vice versa) is left untouched.
-- ============================================================================

begin;

alter table public.training_settings
  alter column preferred_unit set default 'lb';

alter table public.training_settings
  alter column plates set default '[
    {"unit":"lb","weight":55,"pairs":2},
    {"unit":"lb","weight":45,"pairs":2},
    {"unit":"lb","weight":35,"pairs":2},
    {"unit":"lb","weight":25,"pairs":4},
    {"unit":"lb","weight":15,"pairs":4},
    {"unit":"lb","weight":10,"pairs":2},
    {"unit":"kg","weight":2,"pairs":2},
    {"unit":"kg","weight":1.5,"pairs":2},
    {"unit":"kg","weight":1,"pairs":2}
  ]'::jsonb;

update public.training_settings
set
  preferred_unit = 'lb',
  plates = '[
    {"unit":"lb","weight":55,"pairs":2},
    {"unit":"lb","weight":45,"pairs":2},
    {"unit":"lb","weight":35,"pairs":2},
    {"unit":"lb","weight":25,"pairs":4},
    {"unit":"lb","weight":15,"pairs":4},
    {"unit":"lb","weight":10,"pairs":2},
    {"unit":"kg","weight":2,"pairs":2},
    {"unit":"kg","weight":1.5,"pairs":2},
    {"unit":"kg","weight":1,"pairs":2}
  ]'::jsonb,
  updated_at = now()
where preferred_unit = 'kg'
  and plates = '[
    {"unit": "kg", "pairs": 4, "weight": 25},
    {"unit": "kg", "pairs": 4, "weight": 20},
    {"unit": "kg", "pairs": 2, "weight": 15},
    {"unit": "kg", "pairs": 2, "weight": 10},
    {"unit": "kg", "pairs": 2, "weight": 5},
    {"unit": "kg", "pairs": 2, "weight": 2.5},
    {"unit": "kg", "pairs": 2, "weight": 1.25},
    {"unit": "kg", "pairs": 2, "weight": 1},
    {"unit": "kg", "pairs": 2, "weight": 0.5}
  ]'::jsonb;

commit;
