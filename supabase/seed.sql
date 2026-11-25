-- Local demo data. Applied by `npx supabase db reset` (never on the hosted project).
-- Sign in with any of these, password: arriv-demo-1
--   ana@arriv.test   (onboarded, Brazil → Sydney, visa 500, connected to Mateo)
--   mateo@arriv.test (onboarded, Colombia → Melbourne, visa 485 public)
--   lina@arriv.test  (not onboarded yet: lands in onboarding)

do $$
declare
  u record;
begin
  for u in
    select * from (values
      ('11111111-1111-4111-8111-111111111111'::uuid, 'ana@arriv.test', 'Ana Costa'),
      ('22222222-2222-4222-8222-222222222222'::uuid, 'mateo@arriv.test', 'Mateo Rojas'),
      ('33333333-3333-4333-8333-333333333333'::uuid, 'lina@arriv.test', 'Lina Park')
    ) as t(id, email, display_name)
  loop
    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
      confirmation_token, recovery_token, email_change, email_change_token_new
    ) values (
      '00000000-0000-0000-0000-000000000000', u.id, 'authenticated', 'authenticated', u.email,
      extensions.crypt('arriv-demo-1', extensions.gen_salt('bf')), now(),
      '{"provider":"email","providers":["email"]}', jsonb_build_object('display_name', u.display_name),
      now(), now(), '', '', '', ''
    );
    insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    values (
      gen_random_uuid(), u.id, u.id::text,
      jsonb_build_object('sub', u.id::text, 'email', u.email, 'email_verified', true),
      'email', now(), now(), now()
    );
  end loop;
end $$;

update public.profiles set
  bio = 'Nurse from São Paulo. Ask me about studying in Sydney!',
  origin_country = 'BR', city = 'Sydney', arrived_on = current_date - 412, onboarded_at = now()
where id = '11111111-1111-4111-8111-111111111111';

update public.profiles set
  bio = 'Engineer, coffee nerd, still learning to love Vegemite.',
  origin_country = 'CO', city = 'Melbourne', arrived_on = current_date - 900, onboarded_at = now()
where id = '22222222-2222-4222-8222-222222222222';

update public.profile_visas set visa_subclass = '500', visibility = 'connections'
where user_id = '11111111-1111-4111-8111-111111111111';
update public.profile_visas set visa_subclass = '485', visibility = 'public'
where user_id = '22222222-2222-4222-8222-222222222222';

insert into public.connections (requester_id, addressee_id, status, accepted_at) values
  ('11111111-1111-4111-8111-111111111111', '22222222-2222-4222-8222-222222222222', 'accepted', now());
