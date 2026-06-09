-- 1. Таблица профилей пользователей
DO $$ BEGIN
  CREATE TYPE user_type AS ENUM ('student', 'it_specialist', 'citizen');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL UNIQUE,
  full_name VARCHAR(255),
  work_place VARCHAR(255),
  specialty VARCHAR(255),
  skills TEXT[] DEFAULT ARRAY[]::TEXT[],
  avatar_url VARCHAR(500),
  user_type user_type DEFAULT 'citizen',
  bio TEXT,
  university VARCHAR(255),
  course_year VARCHAR(50),
  company VARCHAR(255),
  experience_years INTEGER,
  city_interests TEXT,
  links JSONB NOT NULL DEFAULT '[]'::JSONB,
  certificates JSONB NOT NULL DEFAULT '[]'::JSONB,
  quiz_completed_at TIMESTAMPTZ,
  quiz_attempts INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 2. Таблица заявок на участие в проектах/командах
CREATE TABLE IF NOT EXISTS user_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id TEXT,
  project_title VARCHAR(255) NOT NULL,
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  submitted_at TIMESTAMP DEFAULT NOW(),
  reviewed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 3. Таблица проектов пользователя
CREATE TABLE IF NOT EXISTS user_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  role VARCHAR(100),
  status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'completed', 'archived')),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 4. Таблица команд
CREATE TABLE IF NOT EXISTS teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_name VARCHAR(255) NOT NULL,
  description TEXT,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 5. Таблица членов команды
CREATE TABLE IF NOT EXISTS user_teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  team_name VARCHAR(255),
  member_count INT DEFAULT 1,
  joined_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, team_id)
);

-- Индексы для оптимизации
CREATE INDEX IF NOT EXISTS idx_user_applications_user_id ON user_applications(user_id);
CREATE INDEX IF NOT EXISTS idx_user_applications_status ON user_applications(status);
CREATE INDEX IF NOT EXISTS idx_user_projects_user_id ON user_projects(user_id);
CREATE INDEX IF NOT EXISTS idx_user_teams_user_id ON user_teams(user_id);
CREATE INDEX IF NOT EXISTS idx_teams_created_by ON teams(created_by);

-- Включаем RLS (Row Level Security)
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_teams ENABLE ROW LEVEL SECURITY;

-- Политики RLS для user_profiles
DROP POLICY IF EXISTS "Users can read their own profile" ON user_profiles;
CREATE POLICY "Users can read their own profile" ON user_profiles
  FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = id);

DROP POLICY IF EXISTS "Users can insert their own profile" ON user_profiles;
CREATE POLICY "Users can insert their own profile" ON user_profiles
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT auth.uid()) = id);

DROP POLICY IF EXISTS "Users can update their own profile" ON user_profiles;
CREATE POLICY "Users can update their own profile" ON user_profiles
  FOR UPDATE TO authenticated
  USING ((SELECT auth.uid()) = id)
  WITH CHECK ((SELECT auth.uid()) = id);

-- Права на таблицу (без GRANT RLS-политики не сработают)
GRANT SELECT, INSERT, UPDATE ON user_profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON user_profiles TO service_role;
GRANT USAGE ON TYPE user_type TO authenticated, anon;

-- Политики RLS для user_applications
DROP POLICY IF EXISTS "Users can read their own applications" ON user_applications;
CREATE POLICY "Users can read their own applications" ON user_applications
  FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can insert their own applications" ON user_applications;
CREATE POLICY "Users can insert their own applications" ON user_applications
  FOR INSERT WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can delete their pending applications" ON user_applications;
CREATE POLICY "Users can delete their pending applications" ON user_applications
  FOR DELETE TO authenticated
  USING (user_id = auth.uid() AND status = 'pending');

GRANT SELECT, INSERT, DELETE ON user_applications TO authenticated;
GRANT ALL ON user_applications TO service_role;

-- Политики RLS для user_projects
DROP POLICY IF EXISTS "Users can read their own projects" ON user_projects;
CREATE POLICY "Users can read their own projects" ON user_projects
  FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can insert their own projects" ON user_projects;
CREATE POLICY "Users can insert their own projects" ON user_projects
  FOR INSERT WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update their own projects" ON user_projects;
CREATE POLICY "Users can update their own projects" ON user_projects
  FOR UPDATE USING (user_id = auth.uid());

-- Политики RLS для teams
DROP POLICY IF EXISTS "Anyone can read teams" ON teams;
CREATE POLICY "Anyone can read teams" ON teams
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can create teams" ON teams;
CREATE POLICY "Users can create teams" ON teams
  FOR INSERT WITH CHECK (created_by = auth.uid());

-- Политики RLS для user_teams
DROP POLICY IF EXISTS "Users can read their team memberships" ON user_teams;
CREATE POLICY "Users can read their team memberships" ON user_teams
  FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can join teams" ON user_teams;
CREATE POLICY "Users can join teams" ON user_teams
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- Триггер для автоматического обновления updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON user_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_projects_updated_at BEFORE UPDATE ON user_projects
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_teams_updated_at BEFORE UPDATE ON teams
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 6. Таблица цифровых сервисов
CREATE TABLE IF NOT EXISTS services (
  id BIGSERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  category VARCHAR(100) NOT NULL,
  image_url VARCHAR(500) NOT NULL,
  url VARCHAR(500),
  button_text VARCHAR(50) DEFAULT 'Подробнее',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 7. Таблица примеров проектов для вдохновения
CREATE TABLE IF NOT EXISTS public_projects (
  id BIGSERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  category VARCHAR(100) NOT NULL,
  image_url VARCHAR(500),
  status VARCHAR(50) DEFAULT 'active',
  team_size INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Индексы для оптимизации
CREATE INDEX IF NOT EXISTS idx_services_category ON services(category);
CREATE INDEX IF NOT EXISTS idx_public_projects_category ON public_projects(category);

-- Включаем RLS для новых таблиц
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public_projects ENABLE ROW LEVEL SECURITY;

-- Политики RLS для services (доступ для всех)
DROP POLICY IF EXISTS "Anyone can read services" ON services;
CREATE POLICY "Anyone can read services" ON services
  FOR SELECT USING (true);

-- Политики RLS для public_projects (доступ для всех)
DROP POLICY IF EXISTS "Anyone can read public projects" ON public_projects;
CREATE POLICY "Anyone can read public projects" ON public_projects
  FOR SELECT USING (true);

-- Триггеры для updated_at
CREATE TRIGGER update_services_updated_at BEFORE UPDATE ON services
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_public_projects_updated_at BEFORE UPDATE ON public_projects
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Очистка старых данных перед вставкой
DELETE FROM services;
DELETE FROM public_projects;

-- Вставляем примеры сервисов (с Unsplash API)
INSERT INTO services (title, description, category, image_url, url, button_text) VALUES
  (
    'Оплата ЖКХ',
    'Электронная система для оплаты коммунальных услуг, квитанций и счётов прямо из браузера',
    'Системы платежей',
    'https://images.unsplash.com/photo-1579621970563-a9ce59b04bbb?w=500&h=300&fit=crop',
    'https://www.itpc.ru',
    'Оплатить'
  ),
  (
    'Транспортная карта',
    'Единая электронная карта для проезда в общественном транспорте Тюмени с автоматическим пополнением',
    'Транспорт',
    'https://images.unsplash.com/photo-1452604612349-d7a2a8a2c4c0?w=500&h=300&fit=crop',
    'https://oao-tts.ru',
    'Заказать карту'
  ),
  (
    'Моя школа',
    'Цифровая платформа для образования с дневником, расписанием, домашним заданием и оценками',
    'Образование',
    'https://images.unsplash.com/photo-1427504494785-cdce204402c4?w=500&h=300&fit=crop',
    'https://myschool.edu.ru',
    'Перейти'
  ),
  (
    'Запись к врачу',
    'Система электронной записи к врачам поликлиник и медицинских центров Тюмени',
    'Здравоохранение',
    'https://images.unsplash.com/photo-1631217314831-c8b9b6514b6d?w=500&h=300&fit=crop',
    'https://portal-zapisi.ru/zapis-k-vrachu-tyumen',
    'Записаться'
  ),
  (
    'Городской Wi-Fi',
    'Бесплатный доступ в интернет на улицах и в общественных местах Тюмени через сеть Бесплатное Wi-Fi',
    'Интернет',
    'https://images.unsplash.com/photo-1606925915257-3a1b5aab0f38?w=500&h=300&fit=crop',
    'https://gis.72to.ru',
    'Подключиться'
  ),
  (
    'Тюмень - наш дом',
    'Интерактивная карта города с информацией об объектах инфраструктуры и сервисах',
    'Город',
    'https://images.unsplash.com/photo-1524661135-423995f22d0b?w=500&h=300&fit=crop',
    'https://dom.tyumen-city.ru',
    'Изучить карту'
  ),
  (
    'Запись в секции',
    'Единая система записи в спортивные секции, кружки и дополнительные занятия для детей',
    'Спорт',
    'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=500&h=300&fit=crop',
    'https://edo.72to.ru',
    'Записаться'
  ),
  (
    'Умный паркинг',
    'Система поиска свободных мест для парковки в центре города с платежом через мобильное приложение',
    'Транспорт',
    'https://images.unsplash.com/photo-1489824904134-891ab64532f1?w=500&h=300&fit=crop',
    'https://tmn-parking.ru',
    'Скачать приложение'
  ),
  (
    'Госуслуги',
    'Портал государственных услуг РФ для получения справок, лицензий и других документов онлайн',
    'Государственные услуги',
    'https://images.unsplash.com/photo-1633356122544-f134324ef6db?w=500&h=300&fit=crop',
    'https://www.gosuslugi.ru',
    'Перейти'
  ),
  (
    'ИИС - Инвестиции',
    'Индивидуальный инвестиционный счет для инвестирования в ценные бумаги с налоговыми льготами',
    'Финансы',
    'https://images.unsplash.com/photo-1554224311-beee415c15c7?w=500&h=300&fit=crop',
    'https://investmetin.com',
    'Открыть счет'
  );

-- Вставляем примеры проектов
INSERT INTO public_projects (title, description, category, image_url, status, team_size) VALUES
  (
    'Умный город 2030',
    'Проект по внедрению IoT-технологий для оптимизации уличного освещения, контроля загрязнения воздуха и управления трафиком',
    'Города и урбанизм',
    'https://images.unsplash.com/photo-1480714378408-67cf0d13bc1b?w=500&h=300&fit=crop',
    'active',
    12
  ),
  (
    'Зелёный Тюмень',
    'Инициатива по озеленению города: посадка деревьев, создание новых парков и скверов, улучшение городской среды',
    'Экология',
    'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=500&h=300&fit=crop',
    'active',
    8
  ),
  (
    'Школа цифровой грамотности',
    'Обучающий проект для пенсионеров и людей старшего возраста навыкам работы с компьютером и интернетом',
    'Образование',
    'https://images.unsplash.com/photo-1516534775068-bb57e39c1a29?w=500&h=300&fit=crop',
    'active',
    6
  ),
  (
    'Молодёжный центр инноваций',
    'Хаб для стартапов и инновационных проектов молодёжи с менторством и финансированием',
    'Предпринимательство',
    'https://images.unsplash.com/photo-1552664730-d307ca884978?w=500&h=300&fit=crop',
    'active',
    15
  ),
  (
    'Безопасный транспорт',
    'Проект по внедрению систем безопасности в общественном транспорте и на дорогах города',
    'Безопасность',
    'https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=500&h=300&fit=crop',
    'active',
    10
  ),
  (
    'Культурный мост',
    'Программа обмена культурными инициативами с городами-побратимами в России и за рубежом',
    'Культура',
    'https://images.unsplash.com/photo-1577720643272-265f434e3f41?w=500&h=300&fit=crop',
    'completed',
    7
  ),
  (
    'Здоровый образ жизни',
    'Кампания по пропаганде спорта, правильного питания и здоровья среди молодёжи',
    'Здоровье',
    'https://images.unsplash.com/photo-1517836357463-d25ddfcbf042?w=500&h=300&fit=crop',
    'active',
    9
  ),
  (
    'Чистая вода',
    'Научный проект по мониторингу качества воды в реках и водоёмах Тюменской области',
    'Экология',
    'https://images.unsplash.com/photo-1559027615-cd4628902d4a?w=500&h=300&fit=crop',
    'active',
    5
  ),
  (
    'Волонтёрская сеть',
    'Платформа для организации волонтёрской деятельности и помощи нуждающимся жителям города',
    'Социальная ответственность',
    'https://images.unsplash.com/photo-1559028615-cd4628902d4a?w=500&h=300&fit=crop',
    'active',
    20
  ),
  (
    'Цифровое наследие',
    'Проект по сохранению цифровой истории города: архивы фото, видео и документы о развитии Тюмени',
    'История',
    'https://images.unsplash.com/photo-1507842072343-583f20270319?w=500&h=300&fit=crop',
    'active',
    4
  );

-- =============================================================================
-- 8. Storage: аватары и сертификаты (быстрая загрузка файлов профиля)
-- =============================================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  (
    'avatars',
    'avatars',
    true,
    2097152,
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
  ),
  (
    'certificates',
    'certificates',
    true,
    5242880,
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
  )
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Политики storage.objects
DROP POLICY IF EXISTS "Avatar images are publicly accessible" ON storage.objects;
CREATE POLICY "Avatar images are publicly accessible"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "Certificate files are publicly accessible" ON storage.objects;
CREATE POLICY "Certificate files are publicly accessible"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'certificates');

DROP POLICY IF EXISTS "Users can upload their own avatar" ON storage.objects;
CREATE POLICY "Users can upload their own avatar"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
  );

DROP POLICY IF EXISTS "Users can update their own avatar" ON storage.objects;
CREATE POLICY "Users can update their own avatar"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
  )
  WITH CHECK (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
  );

DROP POLICY IF EXISTS "Users can delete their own avatar" ON storage.objects;
CREATE POLICY "Users can delete their own avatar"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
  );

DROP POLICY IF EXISTS "Users can upload their own certificates" ON storage.objects;
CREATE POLICY "Users can upload their own certificates"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'certificates'
    AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
  );

DROP POLICY IF EXISTS "Users can delete their own certificates" ON storage.objects;
CREATE POLICY "Users can delete their own certificates"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'certificates'
    AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
  );

-- Права на схему (обязательно для работы API)
GRANT USAGE ON SCHEMA public TO authenticated, anon;
GRANT USAGE ON SCHEMA storage TO authenticated, anon;

-- =============================================================================
-- 9. Триггер: автосоздание профиля при регистрации
-- =============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_profiles (id, email, full_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.email, ''),
    COALESCE(NEW.raw_user_meta_data->>'full_name', '')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =============================================================================
-- 10. Таблица проектов (создание идей на странице «Проекты»)
-- =============================================================================

DROP VIEW IF EXISTS public.projects CASCADE;
DROP MATERIALIZED VIEW IF EXISTS public.projects CASCADE;

CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  problem TEXT,
  description TEXT NOT NULL,
  expected_result TEXT,
  direction VARCHAR(100),
  task VARCHAR(100),
  economic_effect NUMERIC,
  note TEXT,
  category VARCHAR(255),
  author_name VARCHAR(255),
  co_authors JSONB NOT NULL DEFAULT '[]'::JSONB,
  participation_share INTEGER NOT NULL DEFAULT 100 CHECK (participation_share >= 0 AND participation_share <= 100),
  ready_to_implement BOOLEAN NOT NULL DEFAULT false,
  already_implemented BOOLEAN NOT NULL DEFAULT false,
  team_id UUID REFERENCES teams(id) ON DELETE SET NULL,
  team_name VARCHAR(255),
  rating_enabled BOOLEAN NOT NULL DEFAULT true,
  image_url VARCHAR(500),
  status VARCHAR(50) DEFAULT 'В работе',
  votes INTEGER NOT NULL DEFAULT 0,
  rating NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Если таблица projects уже существовала в старом виде — добавляем недостающие колонки
ALTER TABLE projects ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS problem TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS expected_result TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS direction VARCHAR(100);
ALTER TABLE projects ADD COLUMN IF NOT EXISTS task VARCHAR(100);
ALTER TABLE projects ADD COLUMN IF NOT EXISTS economic_effect NUMERIC;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS note TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS author_name VARCHAR(255);
ALTER TABLE projects ADD COLUMN IF NOT EXISTS co_authors JSONB NOT NULL DEFAULT '[]'::JSONB;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS participation_share INTEGER NOT NULL DEFAULT 100;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS ready_to_implement BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS already_implemented BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS team_id UUID REFERENCES teams(id) ON DELETE SET NULL;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS rating_enabled BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE projects ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_projects_created_by ON projects(created_by);
CREATE INDEX IF NOT EXISTS idx_projects_team_id ON projects(team_id);
CREATE INDEX IF NOT EXISTS idx_projects_created_at ON projects(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_projects_rating_enabled ON projects(rating_enabled);

ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read projects" ON projects;
CREATE POLICY "Anyone can read projects" ON projects
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Authenticated users can create projects" ON projects;
CREATE POLICY "Authenticated users can create projects" ON projects
  FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid());

DROP POLICY IF EXISTS "Authors can update their projects" ON projects;
CREATE POLICY "Authors can update their projects" ON projects
  FOR UPDATE TO authenticated
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

DROP POLICY IF EXISTS "Authors can delete their projects" ON projects;
CREATE POLICY "Authors can delete their projects" ON projects
  FOR DELETE TO authenticated
  USING (created_by = auth.uid());

GRANT SELECT ON projects TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON projects TO authenticated;
GRANT ALL ON projects TO service_role;

DROP TRIGGER IF EXISTS update_projects_updated_at ON projects;
CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- 11. Storage: обложки проектов
-- =============================================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  (
    'project-images',
    'project-images',
    true,
    3145728,
    ARRAY['image/jpeg', 'image/png', 'image/webp']
  )
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "Project images are publicly accessible" ON storage.objects;
CREATE POLICY "Project images are publicly accessible"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'project-images');

DROP POLICY IF EXISTS "Users can upload their own project images" ON storage.objects;
CREATE POLICY "Users can upload their own project images"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'project-images'
    AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
  );

DROP POLICY IF EXISTS "Users can update their own project images" ON storage.objects;
CREATE POLICY "Users can update their own project images"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'project-images'
    AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
  )
  WITH CHECK (
    bucket_id = 'project-images'
    AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
  );

DROP POLICY IF EXISTS "Users can delete their own project images" ON storage.objects;
CREATE POLICY "Users can delete their own project images"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'project-images'
    AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
  );

