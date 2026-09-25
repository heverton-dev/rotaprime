DO $$
DECLARE
  v_id uuid;
  r record;
BEGIN
  FOR r IN
    SELECT * FROM (VALUES
      ('hevertoneduardoperes@gmail.com', '@#Khen741963@#', 'god',         'Hevert Eduardo Peres'),
      ('superadmin@ctt.com',             'ctt@2026!',      'super_admin', 'Super Administrador'),
      ('empresa@ctt.com',                'ctt@2026!',      'admin',       'Administrador Empresa'),
      ('entregador@ctt.com',             'ctt@2026!',      'estafeta',    'Estafeta Demonstração')
    ) AS t(email, pass, papel, nome)
  LOOP
    SELECT id INTO v_id FROM auth.users WHERE email = r.email;

    IF v_id IS NULL THEN
      v_id := gen_random_uuid();
      INSERT INTO auth.users (
        instance_id, id, aud, role, email, encrypted_password,
        email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
        created_at, updated_at
      ) VALUES (
        '00000000-0000-0000-0000-000000000000', v_id, 'authenticated', 'authenticated',
        r.email, extensions.crypt(r.pass, extensions.gen_salt('bf')),
        now(),
        jsonb_build_object('provider', 'email', 'providers', jsonb_build_array('email')),
        jsonb_build_object('nome', r.nome, 'email_verified', true),
        now(), now()
      );
    ELSE
      UPDATE auth.users
      SET encrypted_password = extensions.crypt(r.pass, extensions.gen_salt('bf')),
          email_confirmed_at = COALESCE(email_confirmed_at, now()),
          raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb)
            || jsonb_build_object('nome', r.nome, 'email_verified', true),
          updated_at = now()
      WHERE id = v_id;
    END IF;

    INSERT INTO auth.identities (id, user_id, provider_id, provider, identity_data, last_sign_in_at, created_at, updated_at)
    SELECT gen_random_uuid(), v_id, v_id::text, 'email',
           jsonb_build_object('sub', v_id::text, 'email', r.email, 'email_verified', true),
           NULL, now(), now()
    WHERE NOT EXISTS (
      SELECT 1 FROM auth.identities WHERE user_id = v_id AND provider = 'email'
    );

    INSERT INTO public.profiles (id, nome) VALUES (v_id, r.nome)
    ON CONFLICT (id) DO UPDATE SET nome = EXCLUDED.nome, ativo = true;

    DELETE FROM public.user_roles WHERE user_id = v_id;
    INSERT INTO public.user_roles (user_id, role) VALUES (v_id, r.papel::public.app_role);
  END LOOP;
END $$;