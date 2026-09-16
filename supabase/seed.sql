-- Starter data: the five founding clubs with PLACEHOLDER text.
-- Edit names/descriptions here, or later from each organizer's "Клуб" page.
-- Safe to re-run: existing slugs are skipped.

insert into clubs (slug, name, category, emoji, description, organizer_name, organizer_bio, meeting_point, schedule_text, color, is_founding) values
('run', 'Шымкент Бег и Прогулки', 'Бег / ходьба', '🏃',
 'Бегаем и гуляем вместе каждую неделю. Любой уровень: можно идти пешком, можно бежать 5 км. Новичков встречаем и знакомим с группой.',
 'Имя организатора', 'Пара слов об организаторе', 'Дендропарк, центральный вход', 'Каждую субботу в 08:00', '#F97316', true),
('english', 'English Speaking Club', 'Английский', '🗣️',
 'Живая практика английского без учебников: темы, игры, дебаты. Уровень от Pre-Intermediate.',
 'Нурканат', 'Преподаватель английского, IELTS 7.5', 'Уточняется в чате', 'Каждый четверг в 19:00', '#2563EB', true),
('chess', 'Шахматы в кофейне', 'Шахматы', '♟️',
 'Быстрые партии, разбор позиций и дружеский турнир раз в месяц. Доски есть.',
 'Имя организатора', '', 'Уточняется в чате', 'Каждое воскресенье в 16:00', '#0F766E', true),
('table-tennis', 'Настольный теннис: любители', 'Настольный теннис', '🏓',
 'Игры на вылет и мини-турниры для любителей. Ракетки можно взять на месте.',
 'Имя организатора', '', 'Адрес в чате', 'Вторник и пятница в 20:00', '#DB2777', true),
('hiking', 'Горы рядом: походы', 'Походы', '⛰️',
 'Однодневные выезды в горы и каньоны вокруг Шымкента. Маршруты для новичков.',
 'Имя организатора', '', 'Уточняется', 'Раз в две недели по воскресеньям', '#65A30D', true)
on conflict (slug) do nothing;

-- Organizer accounts: FIRST create each user in Dashboard → Authentication → Users → "Add user"
-- (email + password, tick "Auto confirm"). THEN link the email to a club here:
-- insert into organizers (email, club_id) select 'brother@example.com', id from clubs where slug = 'run';
-- insert into organizers (email, club_id) values ('you@example.com', null);  -- admin
