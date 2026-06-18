
ALTER TABLE public.profiles DISABLE TRIGGER USER;
UPDATE public.profiles SET display_name = 'Hugo' WHERE display_name = 'Vitor Damasceno';
ALTER TABLE public.profiles ENABLE TRIGGER USER;
