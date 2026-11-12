-- Synthetic data matching backend/src/store.ts.
-- Demo password for all seeded users: Demo1234!
-- The committed value below is a scrypt hash for that public demo password.

begin;

insert into public.users (id, name, email, password_hash)
values
  ('usr-00000001', 'Quick Navigator', 'quick@demo.flexbank.test', 'scrypt$JsZLGFuNcGzDu2lCh3EeXA==$45vF/Hon229ECIfswAH35orNjDK59tBErMOj4iv0QXOKyjAhWcnq+RsCprMdzlVuX0xAl/fbp3BYIh+p2zkFig=='),
  ('usr-00000002', 'Careful Checker', 'careful@demo.flexbank.test', 'scrypt$JsZLGFuNcGzDu2lCh3EeXA==$45vF/Hon229ECIfswAH35orNjDK59tBErMOj4iv0QXOKyjAhWcnq+RsCprMdzlVuX0xAl/fbp3BYIh+p2zkFig=='),
  ('usr-00000003', 'Readability First', 'readable@demo.flexbank.test', 'scrypt$JsZLGFuNcGzDu2lCh3EeXA==$45vF/Hon229ECIfswAH35orNjDK59tBErMOj4iv0QXOKyjAhWcnq+RsCprMdzlVuX0xAl/fbp3BYIh+p2zkFig==')
on conflict (id) do update set
  name = excluded.name,
  email = excluded.email,
  password_hash = excluded.password_hash;

insert into public.user_preferences (user_id, guidance_level, display_mode, language)
values
  ('usr-00000001', 'quick', 'standard', 'en'),
  ('usr-00000002', 'guided', 'standard', 'en'),
  ('usr-00000003', 'balanced', 'largeText', 'zh')
on conflict (user_id) do update set
  guidance_level = excluded.guidance_level,
  display_mode = excluded.display_mode,
  language = excluded.language;

insert into public.user_priorities (user_id, priority_key, sort_order)
values
  ('usr-00000001', 'transfers', 0),
  ('usr-00000002', 'transfers', 0),
  ('usr-00000002', 'accountOverview', 1),
  ('usr-00000003', 'accountOverview', 0),
  ('usr-00000003', 'billPayments', 1)
on conflict (user_id, priority_key) do update set
  sort_order = excluded.sort_order;

insert into public.accounts (id, user_id, name, masked_number, balance, currency)
values
  ('acc-usr-00000001', 'usr-00000001', 'Everyday Account', U&'\2022\2022\2022\2022 2847', 8420.55, 'SGD'),
  ('acc-usr-00000002', 'usr-00000002', 'Everyday Account', U&'\2022\2022\2022\2022 2847', 8420.55, 'SGD'),
  ('acc-usr-00000003', 'usr-00000003', 'Everyday Account', U&'\2022\2022\2022\2022 2847', 8420.55, 'SGD')
on conflict (id) do update set
  name = excluded.name,
  masked_number = excluded.masked_number,
  balance = excluded.balance,
  currency = excluded.currency;

insert into public.recipients (id, name, bank, masked_identifier, initials, mobile, sort_order)
values
  ('rcp-alex', 'Alex Tan', 'DBS', U&'\2022\2022\2022\2022 4821', 'AT', '90004821', 0),
  ('rcp-sarah', 'Sarah Lim', 'OCBC', U&'\2022\2022\2022\2022 1293', 'SL', '90001293', 1),
  ('rcp-marcus', 'Marcus Lee', 'UOB', U&'\2022\2022\2022\2022 7356', 'ML', '90007356', 2),
  ('rcp-priya', 'Priya Nair', 'OCBC', U&'\2022\2022\2022\2022 9014', 'PN', '90009014', 3),
  ('rcp-wei', 'Wei Zhang', 'DBS', U&'\2022\2022\2022\2022 2680', 'WZ', '90002680', 4)
on conflict (id) do update set
  name = excluded.name,
  bank = excluded.bank,
  masked_identifier = excluded.masked_identifier,
  initials = excluded.initials,
  mobile = excluded.mobile,
  sort_order = excluded.sort_order;

commit;
