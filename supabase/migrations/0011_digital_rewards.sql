-- ============================================================
-- 0011 DIGITAL REWARDS: catalog goes digital-only.
-- Gifts can link to an in-app item (item_key) the RN app knows how to
-- deliver: character cosmetics (hat_*, face_*, trail_*), game themes
-- (theme_*) and the in-game extra-life boost. Equipped cosmetics are
-- stored per profile so they sync across devices.
-- ============================================================

alter table gifts add column if not exists item_key text;
create unique index if not exists gifts_item_key_idx on gifts(item_key) where item_key is not null;

-- {"hat": "hat_crown", "face": null, "trail": "trail_sparkle", "theme": "theme_night"}
alter table profiles add column if not exists equipped_items jsonb not null default '{}';

-- Retire the placeholder catalog: all physical gifts and the digital ones
-- that need external content (storybook, printable pack, birthday card…).
-- Safe: zero redemptions exist at the time of this migration.
update gifts set status = 'archived' where status = 'published';

insert into gifts (name, description, cost, category, emoji, color, bg_color, requires_approval, status, item_key, sort_order) values
  -- ── hats ──
  ('Αθλητικό καπέλο',      'Σπορ στυλ για γρήγορες πτήσεις! Φόρεσέ το στην ηρωίδα σου.',                 150, 'digital', '🧢', '#2F80ED', '#EAF2FE', false, 'published', 'hat_cap',       10),
  ('Ροζ φιόγκος',          'Ένας γλυκός φιόγκος για τις πιο κομψές πτήσεις.',                            150, 'digital', '🎀', '#F062A0', '#FDEFF6', false, 'published', 'hat_bow',       11),
  ('Μαγικό καπέλο',        'Αμπρα-κατάμπρα! Το καπέλο των μάγων της Φρουτοτρέλας.',                      250, 'digital', '🎩', '#9B51E0', '#F5EEFC', false, 'published', 'hat_wizard',    12),
  ('Καπέλο της σοφίας',    'Για τους πιο έξυπνους πιλότους της παρέας.',                                 300, 'digital', '🎓', '#1E63B5', '#EAF2FE', false, 'published', 'hat_grad',      13),
  ('Χρυσή κορώνα',         'Η βασιλική κορώνα — μόνο για αληθινούς πρωταθλητές!',                        500, 'digital', '👑', '#F5820D', '#FFF5E8', false, 'published', 'hat_crown',     14),
  -- ── face accessories ──
  ('Γυαλιά πτήσης',        'Γυαλιά πιλότου για να βλέπεις κάθε φρούτο από μακριά.',                      150, 'digital', '🥽', '#27AE60', '#EDF9F1', false, 'published', 'face_goggles',  20),
  ('Γυαλιά ηλίου',         'Cool εμφάνιση ακόμα και στις πιο ηλιόλουστες πίστες.',                       200, 'digital', '🕶️', '#2D2D3A', '#F0F0EC', false, 'published', 'face_shades',   21),
  -- ── flying trails ──
  ('Αστραφτερό ίχνος',     'Άφησε πίσω σου αστεράκια που λάμπουν όσο πετάς!',                            300, 'digital', '✨', '#B8860B', '#FFF8D9', false, 'published', 'trail_sparkle', 30),
  ('Ίχνος από καρδούλες',  'Καρδούλες ακολουθούν κάθε σου πτήση.',                                       350, 'digital', '💖', '#F062A0', '#FDEFF6', false, 'published', 'trail_hearts',  31),
  ('Ουράνιο τόξο',         'Το πιο εντυπωσιακό ίχνος — ένα ολόκληρο ουράνιο τόξο!',                      450, 'digital', '🌈', '#9B51E0', '#F5EEFC', false, 'published', 'trail_rainbow', 32),
  -- ── game map themes ──
  ('Πίστα «Ηλιοβασίλεμα»', 'Η Φρουτοτρέλα βάφεται πορτοκαλί — πέτα μέσα στο ηλιοβασίλεμα.',              400, 'digital', '🌅', '#F5820D', '#FFF5E8', false, 'published', 'theme_sunset',  40),
  ('Πίστα «Νυχτερινή πτήση»', 'Φεγγάρι, αστέρια και νυχτερινός ουρανός για μυστικές αποστολές.',         500, 'digital', '🌙', '#1E63B5', '#EAF2FE', false, 'published', 'theme_night',   41),
  ('Πίστα «Χιονισμένη»',   'Νιφάδες πέφτουν καθώς πετάς — τυλίξου καλά!',                                450, 'digital', '❄️', '#2F80ED', '#EAF2FE', false, 'published', 'theme_snow',    42),
  -- ── boosts (bought in-game, hidden from the catalog list) ──
  ('Έξτρα ζωή',            'Συνέχισε το παιχνίδι με μία ακόμη ζωή. Αγοράζεται μέσα στο παιχνίδι όταν χάσεις.', 25, 'digital', '❤️', '#E60C10', '#FFF0EE', false, 'published', 'extra_life',   90);
