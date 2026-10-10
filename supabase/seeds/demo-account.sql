-- Demo account seed — demo@mosaicstudioapps.com
--
-- This is the account handed to Apple App Review and Google Play review, and
-- the account the store screenshots are shot on. It needs to look like a real
-- collection: a wide date range for the dashboard hero, steady growth across
-- the last twelve months so the chart is a curve rather than one spike, enough
-- countries to light the world map, and albums that are partly — not fully —
-- filled, because a finished album is a worse advertisement than one with slots
-- left to fill.
--
-- Deliberately synthetic. No images: the demo coins have never been
-- photographed, so every disc renders as a placeholder. Shooting real photos
-- onto this account is a separate manual job.
--
-- Album membership is left to the heuristics in albumService (name, year, mint
-- mark, denomination, country) rather than written into series_id /
-- specific_coin_id. That is what a real collector's data looks like after a
-- scan, and it means this seed exercises the matching code instead of
-- bypassing it. supabase/seeds/README.md records the expected fill counts.
--
-- Re-running this file duplicates rows. It is a one-shot, not a migration.
-- Run with: psql "$DATABASE_URL" -f supabase/seeds/demo-account.sql

begin;

-- Guard: fail loudly rather than seed the wrong account.
do $$
begin
  if not exists (
    select 1 from collections c
    join auth.users u on u.id = c.user_id
    where u.email = 'demo@mosaicstudioapps.com'
  ) then
    raise exception 'demo collection not found — is demo@mosaicstudioapps.com set up?';
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- 1. Spread the twelve original rows back across late 2024 / early 2025.
--
-- They were all inserted in one transaction, which put twelve coins in a
-- single month and made the growth chart a vertical line. These dates put them
-- before the chart's twelve-month cutoff so they read as the collection the
-- user already had when the window opens.
-- ---------------------------------------------------------------------------

with demo as (
  select c.id from collections c
  join auth.users u on u.id = c.user_id
  where u.email = 'demo@mosaicstudioapps.com'
),
backdate(name, year, created_at) as (
  values
    ('Delaware State Quarter',                       1999, '2024-11-12 15:20:00+00'::timestamptz),
    ('Pennsylvania State Quarter',                   1999, '2024-11-26 18:05:00+00'),
    ('Massachusetts State Quarter',                  2000, '2024-12-10 14:40:00+00'),
    ('Lincoln Wheat Cent',                           1943, '2024-12-19 20:15:00+00'),
    ('Oregon State Quarter',                         2005, '2025-01-05 16:30:00+00'),
    ('Lincoln Wheat Cent',                           1955, '2025-02-14 13:55:00+00'),
    ('Lincoln Bicentennial Cent — Formative Years',  2009, '2025-03-28 19:10:00+00'),
    ('Kennedy Half Dollar',                          1964, '2025-04-16 17:25:00+00'),
    ('Morgan Silver Dollar',                         1921, '2025-05-07 15:00:00+00'),
    ('Centennial Silver Dollar',                     1967, '2025-06-02 21:35:00+00'),
    ('Two New Pence',                                1971, '2025-07-08 12:45:00+00'),
    ('100 Pesos',                                    1980, '2025-08-20 18:50:00+00')
)
update coins c
set created_at = b.created_at,
    updated_at = b.created_at
from backdate b, demo d
where c.collection_id = d.id
  and c.name = b.name
  and c.year = b.year;

-- ---------------------------------------------------------------------------
-- 2. The rest of the collection.
--
-- purchase_price is set on roughly half the rows on purpose. It is an optional
-- field most collectors never fill in, and the UI has to look right when it is
-- absent — leaving it null everywhere would hide that, and filling it in
-- everywhere would misrepresent the app as a valuation tool.
--
-- face_value is left null on non-US coins: it is a bare number with no currency
-- attached, so a French franc rendered through the user's USD formatter would
-- read as "$1.00", which is simply wrong.
-- ---------------------------------------------------------------------------

with demo as (
  select c.id from collections c
  join auth.users u on u.id = c.user_id
  where u.email = 'demo@mosaicstudioapps.com'
)
insert into coins (
  collection_id, name, country, year, mint_mark, denomination,
  series, category, grade, face_value, purchase_price, notes,
  created_at, updated_at
)
select
  d.id, v.name, v.country, v.year, v.mint_mark, v.denomination,
  v.series, v.category, v.grade, v.face_value, v.purchase_price, v.notes,
  v.created_at, v.created_at
from demo d,
(values
  -- ==== Early US type coins — these set the dashboard's date range ========
  ('Liberty Head Nickel'::text, 'United States'::text, 1883, 'NONE'::text, 'Nickel'::text,
   'Liberty Head Nickel'::text, 'circulating'::text, 'G-6'::text, 0.05::numeric, 14.00::numeric,
   'First year of the type, before the "cents" was added to the reverse.'::text,
   '2025-01-14 16:20:00+00'::timestamptz),
  ('Indian Head Cent', 'United States', 1900, 'NONE', 'Cent',
   'Indian Head Cent', 'circulating', 'VG-10', 0.01, 6.50, null,
   '2025-02-08 14:05:00+00'),
  ('Barber Dime', 'United States', 1907, 'NONE', 'Dime',
   'Barber Dime', 'circulating', 'F-12', 0.10, 9.00, null,
   '2025-03-19 18:40:00+00'),
  ('Buffalo Nickel', 'United States', 1936, 'NONE', 'Nickel',
   'Buffalo Nickel', 'circulating', 'VF-20', 0.05, 3.25,
   'Date still full. Most of these are worn smooth.',
   '2025-04-02 13:15:00+00'),
  ('Standing Liberty Quarter', 'United States', 1927, 'NONE', 'Quarter',
   'Standing Liberty Quarter', 'circulating', 'VG-10', 0.25, 8.50, null,
   '2026-01-09 17:50:00+00'),
  ('Walking Liberty Half Dollar', 'United States', 1943, 'NONE', 'Half Dollar',
   'Walking Liberty Half Dollar', 'circulating', 'XF-40', 0.50, 22.00, null,
   '2026-07-02 15:35:00+00'),

  -- ==== Lincoln wheat cents — fills the Wheat album ======================
  ('Lincoln Wheat Cent', 'United States', 1919, 'D', 'Cent',
   'Lincoln Wheat Cent', 'circulating', 'F-12', 0.01, 2.00, null,
   '2025-05-11 19:25:00+00'),
  ('Lincoln Wheat Cent', 'United States', 1920, 'NONE', 'Cent',
   'Lincoln Wheat Cent', 'circulating', 'VF-20', 0.01, null, null,
   '2025-06-23 14:50:00+00'),
  ('Lincoln Wheat Cent', 'United States', 1927, 'NONE', 'Cent',
   'Lincoln Wheat Cent', 'circulating', 'F-15', 0.01, 1.25, null,
   '2025-07-30 16:10:00+00'),
  ('Lincoln Wheat Cent', 'United States', 1935, 'NONE', 'Cent',
   'Lincoln Wheat Cent', 'circulating', 'XF-40', 0.01, null, null,
   '2025-08-14 20:00:00+00'),
  ('Lincoln Wheat Cent', 'United States', 1940, 'S', 'Cent',
   'Lincoln Wheat Cent', 'circulating', 'VF-30', 0.01, 0.90, null,
   '2025-10-09 15:45:00+00'),
  ('Lincoln Wheat Cent', 'United States', 1941, 'NONE', 'Cent',
   'Lincoln Wheat Cent', 'circulating', 'XF-45', 0.01, null, null,
   '2025-12-02 18:20:00+00'),
  ('Lincoln Wheat Cent', 'United States', 1944, 'D', 'Cent',
   'Lincoln Wheat Cent', 'circulating', 'AU-50', 0.01, 1.10,
   'Struck on a recycled shell-case planchet — slightly warmer colour than a normal cent.',
   '2026-02-17 13:30:00+00'),
  ('Lincoln Wheat Cent', 'United States', 1945, 'NONE', 'Cent',
   'Lincoln Wheat Cent', 'circulating', 'VF-25', 0.01, null, null,
   '2026-04-06 17:05:00+00'),
  ('Lincoln Wheat Cent', 'United States', 1952, 'D', 'Cent',
   'Lincoln Wheat Cent', 'circulating', 'MS-60', 0.01, 2.25, null,
   '2026-06-11 14:15:00+00'),
  ('Lincoln Wheat Cent', 'United States', 1918, 'NONE', 'Cent',
   'Lincoln Wheat Cent', 'circulating', 'VG-8', 0.01, 1.50, null,
   '2026-08-05 16:55:00+00'),

  -- ==== American Women Quarters — 14 of 20 designs =======================
  ('Maya Angelou Quarter', 'United States', 2022, 'P', 'Quarter',
   'American Women Quarters', 'commemorative', 'MS-65', 0.25, 1.00,
   'The first coin in the series, and the first US quarter to show a Black woman.',
   '2025-09-04 15:10:00+00'),
  ('Dr. Sally Ride Quarter', 'United States', 2022, 'D', 'Quarter',
   'American Women Quarters', 'commemorative', 'MS-64', 0.25, 1.00, null,
   '2025-09-12 18:35:00+00'),
  ('Wilma Mankiller Quarter', 'United States', 2022, 'P', 'Quarter',
   'American Women Quarters', 'commemorative', 'MS-63', 0.25, null, null,
   '2025-09-21 13:45:00+00'),
  ('Nina Otero-Warren Quarter', 'United States', 2022, 'P', 'Quarter',
   'American Women Quarters', 'commemorative', 'MS-65', 0.25, 1.25, null,
   '2025-10-02 16:25:00+00'),
  ('Anna May Wong Quarter', 'United States', 2022, 'D', 'Quarter',
   'American Women Quarters', 'commemorative', 'MS-64', 0.25, null, null,
   '2025-10-18 19:50:00+00'),
  ('Bessie Coleman Quarter', 'United States', 2023, 'P', 'Quarter',
   'American Women Quarters', 'commemorative', 'MS-66', 0.25, 1.50, null,
   '2025-11-06 14:30:00+00'),
  ('Edith Kanakaʻole Quarter', 'United States', 2023, 'P', 'Quarter',
   'American Women Quarters', 'commemorative', 'MS-65', 0.25, null, null,
   '2025-11-24 17:15:00+00'),
  ('Eleanor Roosevelt Quarter', 'United States', 2023, 'D', 'Quarter',
   'American Women Quarters', 'commemorative', 'MS-64', 0.25, 1.00, null,
   '2025-12-09 15:40:00+00'),
  ('Jovita Idár Quarter', 'United States', 2023, 'P', 'Quarter',
   'American Women Quarters', 'commemorative', 'MS-65', 0.25, null, null,
   '2026-01-15 18:00:00+00'),
  ('Maria Tallchief Quarter', 'United States', 2023, 'P', 'Quarter',
   'American Women Quarters', 'commemorative', 'MS-63', 0.25, 1.25, null,
   '2026-02-03 13:20:00+00'),
  ('Reverend Dr. Pauli Murray Quarter', 'United States', 2024, 'P', 'Quarter',
   'American Women Quarters', 'commemorative', 'MS-66', 0.25, null, null,
   '2026-03-11 16:45:00+00'),
  ('Patsy Takemoto Mink Quarter', 'United States', 2024, 'D', 'Quarter',
   'American Women Quarters', 'commemorative', 'MS-65', 0.25, 1.00, null,
   '2026-04-19 19:05:00+00'),
  ('Dr. Mary Edwards Walker Quarter', 'United States', 2024, 'P', 'Quarter',
   'American Women Quarters', 'commemorative', 'MS-64', 0.25, null, null,
   '2026-06-27 14:55:00+00'),
  ('Celia Cruz Quarter', 'United States', 2024, 'P', 'Quarter',
   'American Women Quarters', 'commemorative', 'MS-66', 0.25, 1.50,
   'Bought at a coin show in change from the parking meter, of all places.',
   '2026-08-21 17:30:00+00'),

  -- ==== 50 State Quarters — 18 more, on top of the four already there ====
  ('New Jersey State Quarter', 'United States', 1999, 'P', 'Quarter',
   'State Quarters', 'commemorative', 'MS-63', 0.25, 1.75, null,
   '2025-09-28 15:55:00+00'),
  ('Georgia State Quarter', 'United States', 1999, 'D', 'Quarter',
   'State Quarters', 'commemorative', 'AU-58', 0.25, null, null,
   '2025-10-25 18:10:00+00'),
  ('Connecticut State Quarter', 'United States', 1999, 'P', 'Quarter',
   'State Quarters', 'commemorative', 'MS-62', 0.25, 1.50, null,
   '2025-11-14 13:35:00+00'),
  ('Maryland State Quarter', 'United States', 2000, 'P', 'Quarter',
   'State Quarters', 'commemorative', 'MS-64', 0.25, null, null,
   '2025-12-16 16:50:00+00'),
  ('South Carolina State Quarter', 'United States', 2000, 'D', 'Quarter',
   'State Quarters', 'commemorative', 'MS-63', 0.25, 1.25, null,
   '2025-12-22 20:25:00+00'),
  ('New Hampshire State Quarter', 'United States', 2000, 'P', 'Quarter',
   'State Quarters', 'commemorative', 'AU-55', 0.25, null,
   'The Old Man of the Mountain, four years before the rock face collapsed.',
   '2025-12-29 14:00:00+00'),
  ('Virginia State Quarter', 'United States', 2000, 'D', 'Quarter',
   'State Quarters', 'commemorative', 'MS-62', 0.25, 1.50, null,
   '2026-01-07 17:40:00+00'),
  ('New York State Quarter', 'United States', 2001, 'P', 'Quarter',
   'State Quarters', 'commemorative', 'MS-65', 0.25, null, null,
   '2026-01-23 15:15:00+00'),
  ('North Carolina State Quarter', 'United States', 2001, 'D', 'Quarter',
   'State Quarters', 'commemorative', 'MS-63', 0.25, 1.25, null,
   '2026-02-11 18:45:00+00'),
  ('Rhode Island State Quarter', 'United States', 2001, 'P', 'Quarter',
   'State Quarters', 'commemorative', 'AU-58', 0.25, null, null,
   '2026-02-26 13:50:00+00'),
  ('Vermont State Quarter', 'United States', 2001, 'P', 'Quarter',
   'State Quarters', 'commemorative', 'MS-64', 0.25, 1.75, null,
   '2026-03-05 16:05:00+00'),
  ('Kentucky State Quarter', 'United States', 2001, 'D', 'Quarter',
   'State Quarters', 'commemorative', 'MS-62', 0.25, null, null,
   '2026-03-27 19:30:00+00'),
  ('Tennessee State Quarter', 'United States', 2002, 'P', 'Quarter',
   'State Quarters', 'commemorative', 'MS-63', 0.25, 1.50, null,
   '2026-04-08 14:20:00+00'),
  ('Ohio State Quarter', 'United States', 2002, 'D', 'Quarter',
   'State Quarters', 'commemorative', 'MS-65', 0.25, null, null,
   '2026-04-24 17:55:00+00'),
  ('Illinois State Quarter', 'United States', 2003, 'P', 'Quarter',
   'State Quarters', 'commemorative', 'MS-64', 0.25, 1.25, null,
   '2026-05-12 15:25:00+00'),
  ('Alabama State Quarter', 'United States', 2003, 'D', 'Quarter',
   'State Quarters', 'commemorative', 'AU-55', 0.25, null, null,
   '2026-05-29 18:15:00+00'),
  ('California State Quarter', 'United States', 2005, 'P', 'Quarter',
   'State Quarters', 'commemorative', 'MS-66', 0.25, 2.00, null,
   '2026-06-18 13:40:00+00'),
  ('Minnesota State Quarter', 'United States', 2005, 'D', 'Quarter',
   'State Quarters', 'commemorative', 'MS-63', 0.25, null, null,
   '2026-07-09 16:35:00+00'),

  -- ==== World coins — one per country, to fill the World album and map ===
  ('1 Franc', 'France', 1960, 'NONE', 'Franc',
   'Fifth Republic', 'circulating', 'XF-40', null, 1.25, null,
   '2025-01-28 15:30:00+00'),
  ('1 Deutsche Mark', 'Germany', 1974, 'NONE', 'Mark',
   'Deutsche Mark', 'circulating', 'AU-50', null, 2.00, null,
   '2025-02-19 18:25:00+00'),
  ('100 Lire', 'Italy', 1979, 'NONE', 'Lire',
   'Republic Coinage', 'circulating', 'VF-30', null, null, null,
   '2025-03-06 14:10:00+00'),
  ('5 Pesetas', 'Spain', 1975, 'NONE', 'Pesetas',
   'Juan Carlos I', 'circulating', 'XF-45', null, 1.50, null,
   '2025-04-21 17:20:00+00'),
  ('1 Franc', 'Switzerland', 1968, 'NONE', 'Franc',
   'Helvetia', 'circulating', 'AU-55', null, 3.00, null,
   '2025-05-30 13:05:00+00'),
  ('1 Gulden', 'Netherlands', 1980, 'NONE', 'Gulden',
   'Beatrix Coinage', 'circulating', 'MS-62', null, null, null,
   '2025-06-09 19:40:00+00'),
  ('1 Krona', 'Sweden', 1972, 'NONE', 'Krona',
   'Gustaf VI Adolf', 'circulating', 'VF-35', null, 1.75, null,
   '2025-07-17 16:15:00+00'),
  ('100 Złotych', 'Poland', 1988, 'NONE', 'Złotych',
   'People''s Republic', 'circulating', 'AU-50', null, null, null,
   '2025-08-03 14:45:00+00'),
  ('20 Drachmas', 'Greece', 1990, 'NONE', 'Drachmas',
   'Hellenic Republic', 'circulating', 'XF-40', null, 1.00, null,
   '2025-09-16 18:55:00+00'),
  ('1 Rouble', 'Russia', 1980, 'NONE', 'Rouble',
   'Moscow Olympics', 'commemorative', 'MS-63', null, 12.00, null,
   '2025-10-30 15:20:00+00'),
  ('1 Yuan', 'China', 1991, 'NONE', 'Yuan',
   'People''s Republic', 'circulating', 'AU-58', null, 2.50, null,
   '2025-11-19 17:35:00+00'),
  ('1 Rupee', 'India', 1985, 'NONE', 'Rupee',
   'Republic Coinage', 'circulating', 'VF-30', null, null, null,
   '2025-12-27 13:25:00+00'),
  ('500 Won', 'South Korea', 1993, 'NONE', 'Won',
   'Republic Coinage', 'circulating', 'AU-55', null, 2.00, null,
   '2026-01-30 16:40:00+00'),
  ('5 Baht', 'Thailand', 1988, 'NONE', 'Baht',
   'Rama IX', 'circulating', 'XF-40', null, null, null,
   '2026-02-20 19:15:00+00'),
  ('1 Piso', 'Philippines', 1995, 'NONE', 'Piso',
   'Republic Coinage', 'circulating', 'VF-25', null, 1.25, null,
   '2026-03-18 14:35:00+00'),
  ('1000 Rupiah', 'Indonesia', 2010, 'NONE', 'Rupiah',
   'Republic Coinage', 'circulating', 'MS-62', null, null, null,
   '2026-04-14 17:00:00+00'),
  ('5000 Dong', 'Vietnam', 2003, 'NONE', 'Dong',
   'Socialist Republic', 'circulating', 'AU-50', null, 1.50, null,
   '2026-05-05 15:50:00+00'),
  ('50 Cents', 'Australia', 1966, 'NONE', 'Cents',
   'Decimal Coinage', 'circulating', 'XF-45', null, 9.00,
   'Round, and 80% silver — only struck for one year before the twelve-sided version.',
   '2026-05-21 18:30:00+00'),
  ('1 Dollar', 'New Zealand', 1990, 'NONE', 'Dollar',
   'Commemorative Dollar', 'commemorative', 'MS-64', null, 6.00, null,
   '2026-06-04 13:10:00+00'),
  ('1 Rand', 'South Africa', 1990, 'NONE', 'Rand',
   'Republic Coinage', 'circulating', 'AU-55', null, null, null,
   '2026-06-30 16:20:00+00'),
  ('1 Cruzeiro', 'Brazil', 1980, 'NONE', 'Cruzeiro',
   'Republic Coinage', 'circulating', 'XF-35', null, 1.25, null,
   '2026-06-22 19:45:00+00'),
  ('10 Pesos', 'Argentina', 1977, 'NONE', 'Pesos',
   'Republic Coinage', 'circulating', 'VF-30', null, null, null,
   '2026-05-16 14:25:00+00'),
  ('1 Sol', 'Peru', 1975, 'NONE', 'Sol',
   'Republic Coinage', 'circulating', 'AU-50', null, 2.00, null,
   '2026-04-29 17:10:00+00'),
  ('100 Pesos', 'Chile', 1995, 'NONE', 'Pesos',
   'Republic Coinage', 'circulating', 'XF-45', null, null, null,
   '2026-03-24 15:05:00+00'),
  ('25 Kuruş', 'Turkey', 2009, 'NONE', 'Kuruş',
   'Republic Coinage', 'circulating', 'MS-62', null, 1.00, null,
   '2026-02-06 18:40:00+00'),
  ('5 Shillings', 'Kenya', 1985, 'NONE', 'Shillings',
   'Republic Coinage', 'circulating', 'VF-30', null, 1.00, null,
   '2026-07-16 13:55:00+00'),
  ('10 Piastres', 'Egypt', 1984, 'NONE', 'Piastres',
   'Arab Republic', 'circulating', 'XF-40', null, null, null,
   '2026-07-24 16:30:00+00'),
  ('1 Dirham', 'Morocco', 1987, 'NONE', 'Dirham',
   'Hassan II', 'circulating', 'AU-50', null, 1.75, null,
   '2026-07-31 19:20:00+00'),
  ('1 Naira', 'Nigeria', 1991, 'NONE', 'Naira',
   'Federal Republic', 'circulating', 'VF-25', null, null, null,
   '2026-08-08 14:45:00+00'),
  ('Victoria Silver Crown', 'United Kingdom', 1889, 'NONE', 'Crown',
   'Victoria Jubilee Head', 'circulating', 'VF-30', null, 240.00,
   'The most I have paid for a single coin. Jubilee head portrait, St George on the reverse.',
   '2026-08-18 17:25:00+00')
) as v(
  name, country, year, mint_mark, denomination,
  series, category, grade, face_value, purchase_price, notes, created_at
);

-- ---------------------------------------------------------------------------
-- 3. Modern Lincoln cents.
--
-- Added after checking the fill counts: without these the Memorial album read
-- 0/104 and the Shield album 1/42, and an album sitting at zero is the one
-- thing on that screen a screenshot cannot show. A handful of common dates is
-- enough to put a real number on every album in the list.
-- ---------------------------------------------------------------------------

with demo as (
  select c.id from collections c
  join auth.users u on u.id = c.user_id
  where u.email = 'demo@mosaicstudioapps.com'
)
insert into coins (
  collection_id, name, country, year, mint_mark, denomination,
  series, category, grade, face_value, purchase_price, notes,
  created_at, updated_at
)
select
  d.id, v.name, v.country, v.year, v.mint_mark, v.denomination,
  v.series, v.category, v.grade, v.face_value, v.purchase_price, v.notes,
  v.created_at, v.created_at
from demo d,
(values
  ('Lincoln Memorial Cent'::text, 'United States'::text, 1960, 'D'::text, 'Cent'::text,
   'Lincoln Memorial Cent'::text, 'circulating'::text, 'XF-40'::text, 0.01::numeric,
   null::numeric, null::text, '2025-03-12 15:40:00+00'::timestamptz),
  ('Lincoln Memorial Cent', 'United States', 1969, 'S', 'Cent',
   'Lincoln Memorial Cent', 'circulating', 'AU-50', 0.01, 0.75, null,
   '2025-04-28 17:10:00+00'),
  ('Lincoln Memorial Cent', 'United States', 1972, 'NONE', 'Cent',
   'Lincoln Memorial Cent', 'circulating', 'VF-30', 0.01, null, null,
   '2025-06-17 13:50:00+00'),
  ('Lincoln Memorial Cent', 'United States', 1974, 'D', 'Cent',
   'Lincoln Memorial Cent', 'circulating', 'MS-60', 0.01, 0.50, null,
   '2025-08-06 19:05:00+00'),
  ('Lincoln Memorial Cent', 'United States', 1982, 'NONE', 'Cent',
   'Lincoln Memorial Cent', 'circulating', 'MS-62', 0.01, null,
   'The year the composition changed from bronze to copper-plated zinc.',
   '2025-11-28 14:25:00+00'),
  ('Lincoln Memorial Cent', 'United States', 1989, 'D', 'Cent',
   'Lincoln Memorial Cent', 'circulating', 'MS-63', 0.01, 0.40, null,
   '2026-01-19 16:15:00+00'),
  ('Lincoln Memorial Cent', 'United States', 1995, 'NONE', 'Cent',
   'Lincoln Memorial Cent', 'circulating', 'MS-64', 0.01, null, null,
   '2026-03-31 18:35:00+00'),
  ('Lincoln Memorial Cent', 'United States', 2001, 'D', 'Cent',
   'Lincoln Memorial Cent', 'circulating', 'MS-65', 0.01, 0.35, null,
   '2026-06-08 13:20:00+00'),
  ('Lincoln Shield Cent', 'United States', 2010, 'NONE', 'Cent',
   'Lincoln Shield Cent', 'circulating', 'MS-64', 0.01, null, null,
   '2025-10-14 17:45:00+00'),
  ('Lincoln Shield Cent', 'United States', 2014, 'D', 'Cent',
   'Lincoln Shield Cent', 'circulating', 'MS-65', 0.01, 0.30, null,
   '2025-12-19 15:05:00+00'),
  ('Lincoln Shield Cent', 'United States', 2019, 'NONE', 'Cent',
   'Lincoln Shield Cent', 'circulating', 'MS-66', 0.01, null, null,
   '2026-02-24 19:30:00+00'),
  ('Lincoln Shield Cent', 'United States', 2021, 'D', 'Cent',
   'Lincoln Shield Cent', 'circulating', 'MS-65', 0.01, 0.25, null,
   '2026-05-26 14:10:00+00'),
  ('Lincoln Shield Cent', 'United States', 2024, 'NONE', 'Cent',
   'Lincoln Shield Cent', 'circulating', 'MS-67', 0.01, null, null,
   '2026-07-21 16:50:00+00'),
  ('Lincoln Wheat Cent', 'United States', 1911, 'NONE', 'Cent',
   'Lincoln Wheat Cent', 'circulating', 'G-6', 0.01, 3.50, null,
   '2025-05-19 18:00:00+00'),
  ('Lincoln Wheat Cent', 'United States', 1929, 'D', 'Cent',
   'Lincoln Wheat Cent', 'circulating', 'VG-10', 0.01, null, null,
   '2025-07-24 13:35:00+00'),
  ('Lincoln Wheat Cent', 'United States', 1946, 'S', 'Cent',
   'Lincoln Wheat Cent', 'circulating', 'XF-45', 0.01, 1.00, null,
   '2026-04-02 17:20:00+00'),
  ('Lincoln Wheat Cent', 'United States', 1957, 'D', 'Cent',
   'Lincoln Wheat Cent', 'circulating', 'MS-62', 0.01, null, null,
   '2026-08-14 15:55:00+00')
) as v(
  name, country, year, mint_mark, denomination,
  series, category, grade, face_value, purchase_price, notes, created_at
);

commit;
