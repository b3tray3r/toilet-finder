-- ============================================================
-- TOILET FINDER - Supabase Schema
-- ============================================================

-- Профили пользователей
CREATE TABLE public.users_profile (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nickname TEXT,
  points INTEGER DEFAULT 0,
  is_subscribed BOOLEAN DEFAULT FALSE,
  role TEXT DEFAULT 'user' CHECK (role IN ('user', 'moderator', 'admin')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Туалеты
CREATE TABLE public.toilets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  is_paid BOOLEAN DEFAULT FALSE,
  votes INTEGER DEFAULT 0,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'rejected')),
  city TEXT DEFAULT 'moscow',
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Индекс по координатам для быстрого поиска
CREATE INDEX idx_toilets_lat_lng ON public.toilets(lat, lng);
CREATE INDEX idx_toilets_city ON public.toilets(city);
CREATE INDEX idx_toilets_status ON public.toilets(status);

-- Голоса
CREATE TABLE public.votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  toilet_id UUID NOT NULL REFERENCES public.toilets(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(toilet_id, user_id)
);

-- Жалобы
CREATE TABLE public.reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  toilet_id UUID NOT NULL REFERENCES public.toilets(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- RLS Политики
-- ============================================================

ALTER TABLE public.users_profile ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.toilets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

-- users_profile: читать свой профиль, редактировать свой
CREATE POLICY "Users can view own profile" ON public.users_profile
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.users_profile
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON public.users_profile
  FOR INSERT WITH CHECK (auth.uid() = id);

-- toilets: читать все, добавлять только авторизованным
CREATE POLICY "Anyone can read toilets" ON public.toilets
  FOR SELECT USING (true);

CREATE POLICY "Authenticated can add toilets" ON public.toilets
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL AND
    auth.uid() = created_by AND
    public.can_add_toilet(auth.uid())
  );

CREATE POLICY "Admin can update toilets" ON public.toilets
  FOR UPDATE USING (
    auth.uid() IN (
      SELECT id FROM public.users_profile WHERE role IN ('moderator', 'admin')
    )
  );

-- votes: читать все, добавлять только авторизованным
CREATE POLICY "Anyone can read votes" ON public.votes
  FOR SELECT USING (true);

CREATE POLICY "Authenticated can vote" ON public.votes
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = user_id);

-- reports: только свои
CREATE POLICY "Authenticated can report" ON public.reports
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = user_id);

-- ============================================================
-- RPC Функции
-- ============================================================

-- Проверка лимита добавления точек (3 в день)
CREATE OR REPLACE FUNCTION public.can_add_toilet(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  count_today INTEGER;
BEGIN
  SELECT COUNT(*) INTO count_today
  FROM public.toilets
  WHERE created_by = p_user_id
    AND created_at >= CURRENT_DATE
    AND created_at < CURRENT_DATE + INTERVAL '1 day';

  RETURN count_today < 3;
END;
$$;

-- Получить туалеты в bounding box
CREATE OR REPLACE FUNCTION public.get_toilets_in_bounds(
  min_lat DOUBLE PRECISION,
  min_lng DOUBLE PRECISION,
  max_lat DOUBLE PRECISION,
  max_lng DOUBLE PRECISION,
  p_city TEXT DEFAULT NULL
)
RETURNS SETOF public.toilets
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT *
  FROM public.toilets
  WHERE lat BETWEEN min_lat AND max_lat
    AND lng BETWEEN min_lng AND max_lng
    AND (p_city IS NULL OR city = p_city)
    AND status != 'rejected'
  ORDER BY created_at DESC
  LIMIT 500;
END;
$$;

-- Проверка — голосовал ли пользователь за конкретный туалет
CREATE OR REPLACE FUNCTION public.has_voted(p_toilet_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.votes
    WHERE toilet_id = p_toilet_id AND user_id = p_user_id
  );
END;
$$;

-- ============================================================
-- Триггер: пересчёт голосов и статуса
-- ============================================================

CREATE OR REPLACE FUNCTION public.update_toilet_votes()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  vote_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO vote_count
  FROM public.votes
  WHERE toilet_id = NEW.toilet_id;

  UPDATE public.toilets
  SET
    votes = vote_count,
    status = CASE WHEN vote_count >= 10 THEN 'confirmed' ELSE status END
  WHERE id = NEW.toilet_id;

  -- Начислить очки создателю при подтверждении
  IF vote_count = 10 THEN
    UPDATE public.users_profile up
    SET points = points + 10
    FROM public.toilets t
    WHERE t.id = NEW.toilet_id AND t.created_by = up.id;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_vote_insert
  AFTER INSERT ON public.votes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_toilet_votes();

-- ============================================================
-- Триггер: создать профиль при регистрации
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.users_profile (id, nickname)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1))
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- Метрики (View)
-- ============================================================

CREATE OR REPLACE VIEW public.metrics AS
SELECT
  (SELECT COUNT(*) FROM public.toilets) AS total_toilets,
  (SELECT COUNT(*) FROM public.toilets WHERE status = 'confirmed') AS confirmed_toilets,
  (SELECT COUNT(*) FROM public.votes) AS total_votes,
  (SELECT COUNT(*) FROM public.toilets WHERE created_at >= CURRENT_DATE) AS added_today,
  (SELECT COUNT(DISTINCT user_id) FROM public.votes WHERE created_at >= CURRENT_DATE) AS dau;
