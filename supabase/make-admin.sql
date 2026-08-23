-- Run in the Supabase SQL editor AFTER creating the user in Authentication → Users.
-- Replace the email.
insert into staff (id, full_name, role)
select id, 'Keanita Admin', 'admin' from auth.users where email = 'info@webmotionacademy.com'
on conflict (id) do update set role = 'admin';
