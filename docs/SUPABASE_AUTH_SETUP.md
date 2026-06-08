# Руководство по настройке Supabase для Smart City Tyumen

## 1. Создание таблиц в Supabase

1. Перейдите на [https://supabase.com](https://supabase.com) и откройте ваш проект
2. Перейдите в **SQL Editor**
3. Скопируйте содержимое файла `SUPABASE_SETUP.sql` и выполните запрос
4. Это создаст все необходимые таблицы, индексы и политики RLS

## 2. Настройка Email/Password аутентификации в Supabase

### Шаг 1: Перейдите в Authentication Settings
1. В меню Supabase, нажмите **Authentication**
2. Перейдите в **Providers**
3. Нажмите на **Email**

### Шаг 2: Включите Email аутентификацию
1. Переключатель **Enable Email Provider** должен быть включен (ON)
2. В разделе **Email Settings**:
   - Убедитесь, что **Enable Email Provider** включен
   - Отключите OTP и все дополнительные подтверждения

### Шаг 3: Настройка политики регистрации
1. Перейдите в **Authentication** → **Policies**
2. Убедитесь, что опция **Allow signup** включена
3. Убедитесь, что требование email подтверждения отключено:
   - **Email confirmations**: OFF

### Шаг 4: Тестирование
1. Запустите приложение: `npm run dev`
2. Перейдите на страницу регистрации
3. Зарегистрируйте пользователя email и паролем
4. После регистрации пользователь должен сразу войти в систему без дополнительного подтверждения

## 5. Очистка текущих аккаунтов
Если в Supabase уже есть старые аккаунты, их можно удалить вместе с профилями перед новой попыткой регистрации.

1. Установите сервисный ключ Supabase в переменную окружения:
   ```bash
   export SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
   # Windows PowerShell
   $env:SUPABASE_SERVICE_ROLE_KEY = "your-service-role-key"
   # Windows CMD
   set SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   ```
2. Запустите команду:
   ```bash
   npm run db:reset-users
   ```

Этот скрипт удалит всех пользователей из `auth.users` и очистит таблицу `user_profiles`.

> Внимание: эта команда удаляет существующие аккаунты без возможности восстановления.
## 3. Переменные окружения

В файле `.env.local` (или в переменных окружения) убедитесь, что установлены:

```
VITE_SUPABASE_URL=https://goklwsqotbwsyzctzknh.supabase.co
VITE_SUPABASE_ANON_KEY=<ваш anon key из Supabase → Project Settings → API>
```

Ключ `anon` / `publishable` берётся в **Project Settings → API** вашего проекта Supabase.

## 4. Включение CORS

1. В меню Supabase перейдите в **Project Settings**
2. Перейдите в **API** → **CORS**
3. Добавьте ваш домен в список разрешенных:
   - http://localhost:5173 (для разработки)
   - https://yourdomain.com (для production)

## 5. Проверка работы

1. Запустите приложение: `npm run dev`
2. Нажмите кнопку **Вход** в хедере
3. Введите email адрес
4. Проверьте входящую почту на 6-значный код
5. Введите код в приложении
6. Профиль должен автоматически создаться и вы будете перенаправлены на страницу профиля

## 6. Отправка писем (для Production)

Для отправки писем в Production используйте один из доступных сервисов:

### Вариант 1: SendGrid (Рекомендуется)
1. Создайте аккаунт на [https://sendgrid.com](https://sendgrid.com)
2. Получите API Key
3. В Supabase перейдите в **Email** settings
4. Выберите **SendGrid** и вставьте API Key
5. Установите отправителя: noreply@smartcity-tyumen.ru

### Вариант 2: Resend
1. Создайте аккаунт на [https://resend.com](https://resend.com)
2. Получите API Key для своего домена
3. В Supabase интегрируйте Resend

### Вариант 3: Встроенный SMTP
1. Используйте SMTP сервер вашего почтового провайдера
2. В Supabase установите SMTP учетные данные в **Email Settings**

## 7. Структура БД

### user_profiles
- Хранит данные профиля пользователя
- Поля: full_name, work_place, specialty, skills, avatar_url

### user_applications
- Заявки на участие в проектах
- Статусы: pending (на рассмотрении), accepted (одобрена), rejected (отклонена)

### user_projects
- Проекты, в которых участвует пользователь
- Статусы: active (активный), completed (завершен), archived (архивирован)

### teams
- Команды/группы для совместной работы

### user_teams
- Связь между пользователем и командой

## 8. Примечания

- Все данные защищены RLS (Row Level Security) политиками
- Каждый пользователь может видеть только свои данные
- Сессия хранится в localStorage

## 9. Деплой на Vercel (официальный домен)

Без переменных окружения на Vercel профиль **не сохранится** (ошибка «Не удалось связаться с сервером»).

1. Откройте [vercel.com](https://vercel.com) → ваш проект → **Settings** → **Environment Variables**
2. Добавьте для **Production**, **Preview** и **Development**:

```
VITE_SUPABASE_URL=https://goklwsqotbwsyzctzknh.supabase.co
VITE_SUPABASE_ANON_KEY=<anon или publishable key из Supabase → Settings → API>
NEXT_PUBLIC_SUPABASE_URL=https://goklwsqotbwsyzctzknh.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<тот же ключ>
```

3. **Redeploy** проект (Deployments → ⋮ → Redeploy)
4. В Supabase → **Authentication** → **URL Configuration** добавьте Site URL вашего домена
5. В **API → CORS** добавьте `https://ваш-домен.ru` и `http://localhost:5173`

### Быстрая проверка профиля после деплоя
- Войти → ЛК → изменить имя → «Сохранить» (должно быть < 2 сек)
- Сменить аватар (до 2 МБ) → превью сразу, сохранение ~1–3 сек

## 10. SQL только для профиля (если уже запускали старый скрипт)

Если таблицы уже есть, выполните в SQL Editor только блок из конца `SUPABASE_SETUP.sql` (разделы 8–9: storage + триггер + GRANT).

## Отладка

Если что-то не работает:
1. Проверьте консоль браузера (F12)
2. Посмотрите логи в Supabase → **Logs**
3. Убедитесь, что Email Provider включен
4. Проверьте, что таблицы созданы правильно (SQL Editor)
