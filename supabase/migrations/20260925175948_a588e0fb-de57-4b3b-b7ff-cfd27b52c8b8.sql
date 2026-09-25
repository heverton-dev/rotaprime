UPDATE public.delivery_routes SET estafeta_id = (SELECT id FROM auth.users WHERE email='entregador@ctt.com'), data = CURRENT_DATE
WHERE nome = 'Lisboa Centro - Manhã';
UPDATE public.vehicles SET estafeta_id = (SELECT id FROM auth.users WHERE email='entregador@ctt.com') WHERE matricula='AA-12-BB';