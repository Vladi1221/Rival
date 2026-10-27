create schema if not exists app_private;
revoke all on schema app_private from public, anon, authenticated;

create table public.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  username text not null unique check (username ~ '^[a-z0-9_]{3,30}$'),
  display_name text not null check (char_length(display_name) between 1 and 60),
  bio text not null default '' check (char_length(bio) <= 280),
  avatar_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.challenges (
  id uuid primary key default pg_catalog.gen_random_uuid(),
  creator_id uuid references public.profiles (user_id) on delete set null,
  title text not null check (char_length(title) between 3 and 100),
  category text not null check (category in ('Fitness', 'Estudio', 'Programación', 'Productividad', 'Creatividad', 'Desarrollo personal')),
  description text not null check (char_length(description) between 10 and 500),
  rules text not null check (char_length(rules) between 10 and 2000),
  difficulty text not null check (difficulty in ('Constante', 'Intermedio', 'Desafiante')),
  duration_days smallint not null check (duration_days between 1 and 90),
  xp_reward integer not null check (xp_reward between 1 and 10000),
  requires_evidence boolean not null default true,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.follows (
  follower_id uuid not null references public.profiles (user_id) on delete cascade,
  following_id uuid not null references public.profiles (user_id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, following_id),
  check (follower_id <> following_id)
);

create table public.challenge_participants (
  id uuid primary key default pg_catalog.gen_random_uuid(),
  challenge_id uuid not null references public.challenges (id) on delete cascade,
  user_id uuid not null references public.profiles (user_id) on delete cascade,
  status text not null default 'active' check (status in ('active', 'pending_review', 'completed', 'abandoned')),
  progress_days smallint not null default 0 check (progress_days >= 0),
  joined_at timestamptz not null default now(),
  completed_at timestamptz,
  unique (challenge_id, user_id)
);

create table public.challenge_submissions (
  id uuid primary key default pg_catalog.gen_random_uuid(),
  participant_id uuid not null references public.challenge_participants (id) on delete cascade,
  user_id uuid not null references public.profiles (user_id) on delete cascade,
  progress_day smallint not null check (progress_day between 1 and 90),
  file_path text not null,
  caption text not null default '' check (char_length(caption) <= 500),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  reviewed_by uuid references public.profiles (user_id) on delete set null,
  reviewed_at timestamptz,
  review_note text check (review_note is null or char_length(review_note) <= 500),
  created_at timestamptz not null default now(),
  unique (participant_id, progress_day)
);

create table public.posts (
  id uuid primary key default pg_catalog.gen_random_uuid(),
  author_id uuid not null references public.profiles (user_id) on delete cascade,
  challenge_id uuid references public.challenges (id) on delete set null,
  caption text not null default '' check (char_length(caption) <= 2200),
  image_path text,
  visibility text not null default 'public' check (visibility in ('public', 'followers', 'private')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (char_length(caption) > 0 or image_path is not null)
);

create table public.post_likes (
  post_id uuid not null references public.posts (id) on delete cascade,
  user_id uuid not null references public.profiles (user_id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

create table public.saved_posts (
  post_id uuid not null references public.posts (id) on delete cascade,
  user_id uuid not null references public.profiles (user_id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

create table public.comments (
  id uuid primary key default pg_catalog.gen_random_uuid(),
  post_id uuid not null references public.posts (id) on delete cascade,
  author_id uuid not null references public.profiles (user_id) on delete cascade,
  body text not null check (char_length(body) between 1 and 1000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.notifications (
  id uuid primary key default pg_catalog.gen_random_uuid(),
  recipient_id uuid not null references public.profiles (user_id) on delete cascade,
  actor_id uuid references public.profiles (user_id) on delete set null,
  kind text not null check (kind in ('follow', 'like', 'comment', 'submission_approved', 'submission_rejected')),
  related_id uuid,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.user_xp_events (
  id uuid primary key default pg_catalog.gen_random_uuid(),
  user_id uuid not null references public.profiles (user_id) on delete cascade,
  amount integer not null check (amount > 0),
  event_type text not null check (event_type in ('challenge_reward', 'badge_reward', 'admin_adjustment')),
  source_type text not null check (source_type in ('challenge', 'submission', 'badge', 'admin')),
  source_id uuid not null,
  created_at timestamptz not null default now(),
  unique (user_id, event_type, source_type, source_id)
);

create table public.badges (
  id uuid primary key default pg_catalog.gen_random_uuid(),
  code text not null unique check (code ~ '^[a-z0-9_]{2,40}$'),
  name text not null check (char_length(name) between 2 and 60),
  description text not null check (char_length(description) between 5 and 300),
  xp_reward integer not null default 0 check (xp_reward between 0 and 10000),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.user_badges (
  user_id uuid not null references public.profiles (user_id) on delete cascade,
  badge_id uuid not null references public.badges (id) on delete restrict,
  awarded_by uuid references public.profiles (user_id) on delete set null,
  awarded_at timestamptz not null default now(),
  primary key (user_id, badge_id)
);

create table app_private.staff_roles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  role text not null check (role in ('reviewer', 'admin')),
  created_at timestamptz not null default now()
);

create index follows_following_idx on public.follows (following_id, created_at desc);
create index challenges_catalog_idx on public.challenges (is_active, category, created_at desc);
create index participants_user_status_idx on public.challenge_participants (user_id, status, joined_at desc);
create index participants_challenge_status_idx on public.challenge_participants (challenge_id, status);
create index submissions_review_idx on public.challenge_submissions (status, created_at);
create index posts_feed_idx on public.posts (created_at desc) where visibility = 'public';
create index posts_author_feed_idx on public.posts (author_id, created_at desc);
create index comments_post_created_idx on public.comments (post_id, created_at);
create index notifications_recipient_idx on public.notifications (recipient_id, is_read, created_at desc);
create index xp_events_user_created_idx on public.user_xp_events (user_id, created_at desc);

insert into public.challenges (
  id, title, category, description, rules, difficulty, duration_days, xp_reward, requires_evidence
)
values
  ('11111111-1111-4111-8111-111111111101', '30 minutos de lectura', 'Estudio', 'Desconectá un rato y dedicá media hora a un libro cada día.', 'Leé durante al menos 30 minutos por día durante siete días. Adjuntá una foto o nota como evidencia diaria.', 'Constante', 7, 120, true),
  ('11111111-1111-4111-8111-111111111102', 'Movete todos los días', 'Fitness', 'Sumá 20 minutos de movimiento consciente durante una semana.', 'Elegí una actividad que te haga bien y registrá una sesión diaria durante siete días.', 'Intermedio', 7, 150, true),
  ('11111111-1111-4111-8111-111111111103', 'Una hora sin distracciones', 'Productividad', 'Reservá un bloque de foco real para lo que más importa.', 'Completá una hora sin notificaciones ni multitarea durante cinco días.', 'Intermedio', 5, 100, true),
  ('11111111-1111-4111-8111-111111111104', 'Construí algo pequeño', 'Programación', 'Dedicá un rato cada día a avanzar en un proyecto propio.', 'Hacé un avance concreto y documentado en tu proyecto cada día durante una semana.', 'Desafiante', 7, 180, true),
  ('11111111-1111-4111-8111-111111111105', 'Una idea al día', 'Creatividad', 'Capturá una idea creativa por día, sin juzgarla.', 'Anotá y compartí una idea nueva durante cinco días.', 'Constante', 5, 100, true),
  ('11111111-1111-4111-8111-111111111106', 'Cerrá el día con intención', 'Desarrollo personal', 'Tomate cinco minutos para reconocer lo que sí avanzó.', 'Al final del día, registrá una cosa que salió bien o que aprendiste durante una semana.', 'Constante', 7, 120, true)
on conflict (id) do nothing;

insert into public.badges (code, name, description, xp_reward)
values
  ('primer_paso', 'Primer paso', 'Completaste tu primer desafío validado.', 25),
  ('constancia', 'Constancia', 'Completaste siete días seguidos de actividad validada.', 50),
  ('en_ascenso', 'En ascenso', 'Alcanzaste el nivel ocho.', 75)
on conflict (code) do nothing;

create function app_private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := pg_catalog.now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function app_private.set_updated_at();

create trigger challenges_set_updated_at
before update on public.challenges
for each row execute function app_private.set_updated_at();

create trigger posts_set_updated_at
before update on public.posts
for each row execute function app_private.set_updated_at();

create trigger comments_set_updated_at
before update on public.comments
for each row execute function app_private.set_updated_at();

create function app_private.create_profile_for_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  requested_username text;
  requested_display_name text;
begin
  requested_username := pg_catalog.lower(pg_catalog.regexp_replace(
    coalesce(new.raw_user_meta_data ->> 'username', ''),
    '[^a-zA-Z0-9_]', '', 'g'
  ));
  if pg_catalog.char_length(requested_username) < 3 then
    requested_username := 'user_' || pg_catalog.replace(new.id::text, '-', '');
  end if;
  requested_username := pg_catalog.left(requested_username, 30);
  requested_display_name := pg_catalog.left(coalesce(
    nullif(pg_catalog.btrim(new.raw_user_meta_data ->> 'display_name'), ''),
    requested_username
  ), 60);

  begin
    insert into public.profiles (user_id, username, display_name)
    values (new.id, requested_username, requested_display_name);
  exception when unique_violation then
    insert into public.profiles (user_id, username, display_name)
    values (
      new.id,
      'user_' || pg_catalog.left(pg_catalog.replace(new.id::text, '-', ''), 26),
      requested_display_name
    );
  end;
  return new;
end;
$$;

create trigger on_auth_user_created_profile
after insert on auth.users
for each row execute function app_private.create_profile_for_new_user();

create function app_private.is_reviewer()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from app_private.staff_roles
    where user_id = (select auth.uid()) and role in ('reviewer', 'admin')
  );
$$;

create function app_private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from app_private.staff_roles
    where user_id = (select auth.uid()) and role = 'admin'
  );
$$;

revoke all on function app_private.set_updated_at() from public, anon, authenticated;
revoke all on function app_private.create_profile_for_new_user() from public, anon, authenticated;
revoke all on function app_private.is_reviewer() from public, anon, authenticated;
revoke all on function app_private.is_admin() from public, anon, authenticated;
grant usage on schema app_private to authenticated;
grant execute on function app_private.is_reviewer() to authenticated;
grant execute on function app_private.is_admin() to authenticated;

alter table public.profiles enable row level security;
alter table public.challenges enable row level security;
alter table public.follows enable row level security;
alter table public.challenge_participants enable row level security;
alter table public.challenge_submissions enable row level security;
alter table public.posts enable row level security;
alter table public.post_likes enable row level security;
alter table public.saved_posts enable row level security;
alter table public.comments enable row level security;
alter table public.notifications enable row level security;
alter table public.user_xp_events enable row level security;
alter table public.badges enable row level security;
alter table public.user_badges enable row level security;
alter table app_private.staff_roles enable row level security;

create policy "Profiles are publicly readable"
on public.profiles for select to anon, authenticated
using (true);

create policy "Users update only their own profile"
on public.profiles for update to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

create policy "Active challenges are publicly readable"
on public.challenges for select to anon, authenticated
using (is_active or creator_id = (select auth.uid()));

create policy "Users read their own follow relationships"
on public.follows for select to authenticated
using (follower_id = (select auth.uid()) or following_id = (select auth.uid()));

create policy "Users follow as themselves"
on public.follows for insert to authenticated
with check (follower_id = (select auth.uid()));

create policy "Users unfollow as themselves"
on public.follows for delete to authenticated
using (follower_id = (select auth.uid()));

create policy "Users read their own challenge participation"
on public.challenge_participants for select to authenticated
using (user_id = (select auth.uid()));

create policy "Users join challenges as themselves"
on public.challenge_participants for insert to authenticated
with check (
  user_id = (select auth.uid())
  and progress_days = 0
  and status = 'active'
  and exists (select 1 from public.challenges where id = challenge_id and is_active)
);

create policy "Users read their own submissions"
on public.challenge_submissions for select to authenticated
using (user_id = (select auth.uid()) or (select app_private.is_reviewer()));

create policy "Visible posts are readable"
on public.posts for select to anon, authenticated
using (
  visibility = 'public'
  or author_id = (select auth.uid())
  or (
    visibility = 'followers'
    and exists (
      select 1 from public.follows
      where follower_id = (select auth.uid())
        and following_id = posts.author_id
    )
  )
);

create policy "Users create posts as themselves"
on public.posts for insert to authenticated
with check (author_id = (select auth.uid()));

create policy "Users update their own posts"
on public.posts for update to authenticated
using (author_id = (select auth.uid()))
with check (author_id = (select auth.uid()));

create policy "Users delete their own posts"
on public.posts for delete to authenticated
using (author_id = (select auth.uid()));

create policy "Users read their own likes"
on public.post_likes for select to authenticated
using (user_id = (select auth.uid()));

create policy "Users like posts as themselves"
on public.post_likes for insert to authenticated
with check (user_id = (select auth.uid()));

create policy "Users remove their own likes"
on public.post_likes for delete to authenticated
using (user_id = (select auth.uid()));

create policy "Users read their own saved posts"
on public.saved_posts for select to authenticated
using (user_id = (select auth.uid()));

create policy "Users save posts as themselves"
on public.saved_posts for insert to authenticated
with check (user_id = (select auth.uid()));

create policy "Users unsave their own posts"
on public.saved_posts for delete to authenticated
using (user_id = (select auth.uid()));

create policy "Comments follow post visibility"
on public.comments for select to anon, authenticated
using (
  exists (
    select 1 from public.posts
    where posts.id = comments.post_id
  )
);

create policy "Users comment as themselves on visible posts"
on public.comments for insert to authenticated
with check (
  author_id = (select auth.uid())
  and exists (
    select 1 from public.posts
    where posts.id = comments.post_id
  )
);

create policy "Users update their own comments"
on public.comments for update to authenticated
using (author_id = (select auth.uid()))
with check (author_id = (select auth.uid()));

create policy "Users delete their own comments"
on public.comments for delete to authenticated
using (author_id = (select auth.uid()));

create policy "Recipients read their notifications"
on public.notifications for select to authenticated
using (recipient_id = (select auth.uid()));

create policy "Recipients update their notifications"
on public.notifications for update to authenticated
using (recipient_id = (select auth.uid()))
with check (recipient_id = (select auth.uid()));

create policy "Users read their own XP history"
on public.user_xp_events for select to authenticated
using (user_id = (select auth.uid()));

create policy "Active badges are publicly readable"
on public.badges for select to anon, authenticated
using (is_active);

create policy "Users read their own badges"
on public.user_badges for select to authenticated
using (user_id = (select auth.uid()));

grant select on public.profiles, public.challenges, public.posts, public.comments, public.badges to anon, authenticated;
grant update (username, display_name, bio, avatar_path) on public.profiles to authenticated;
grant select, insert, delete on public.follows to authenticated;
grant select, insert on public.challenge_participants to authenticated;
grant select on public.challenge_submissions to authenticated;
grant insert, update, delete on public.posts to authenticated;
grant select, insert, delete on public.post_likes, public.saved_posts to authenticated;
grant insert, update, delete on public.comments to authenticated;
grant select on public.notifications, public.user_xp_events, public.user_badges to authenticated;
grant update (is_read) on public.notifications to authenticated;
grant select on public.badges to anon, authenticated;

create function public.join_challenge(p_challenge_id uuid)
returns public.challenge_participants
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  result public.challenge_participants;
begin
  if current_user_id is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;
  if not exists (select 1 from public.challenges where id = p_challenge_id and is_active) then
    raise exception 'Challenge is unavailable' using errcode = '22023';
  end if;

  insert into public.challenge_participants (challenge_id, user_id)
  values (p_challenge_id, current_user_id)
  on conflict (challenge_id, user_id) do update
  set status = 'active', progress_days = 0, joined_at = pg_catalog.now(), completed_at = null
  where public.challenge_participants.status = 'abandoned'
  returning * into result;

  if result.id is null then
    select * into result from public.challenge_participants
    where challenge_id = p_challenge_id and user_id = current_user_id;
  end if;
  if result.status = 'completed' then
    raise exception 'Challenge already completed' using errcode = '22023';
  end if;
  return result;
end;
$$;

create function public.leave_challenge(p_challenge_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;
  update public.challenge_participants
  set status = 'abandoned'
  where challenge_id = p_challenge_id
    and user_id = (select auth.uid())
    and status = 'active';
end;
$$;

create function public.record_challenge_day(p_challenge_id uuid)
returns public.challenge_participants
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  participant public.challenge_participants;
  challenge public.challenges;
begin
  if current_user_id is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;
  select * into participant from public.challenge_participants
  where challenge_id = p_challenge_id
    and user_id = current_user_id
    and status = 'active'
  for update;
  select * into challenge from public.challenges
  where id = p_challenge_id and is_active;
  if participant.id is null or challenge.id is null then
    raise exception 'Active participation required' using errcode = '22023';
  end if;
  if challenge.requires_evidence then
    raise exception 'This challenge requires approved evidence' using errcode = '42501';
  end if;

  update public.challenge_participants
  set progress_days = progress_days + 1,
      status = case when progress_days + 1 >= challenge.duration_days then 'completed' else 'active' end,
      completed_at = case when progress_days + 1 >= challenge.duration_days then pg_catalog.now() else null end
  where id = participant.id
  returning * into participant;

  if participant.status = 'completed' then
    insert into public.user_xp_events (user_id, amount, event_type, source_type, source_id)
    values (current_user_id, challenge.xp_reward, 'challenge_reward', 'challenge', challenge.id)
    on conflict (user_id, event_type, source_type, source_id) do nothing;
  end if;
  return participant;
end;
$$;

create function public.submit_challenge_evidence(
  p_challenge_id uuid,
  p_file_path text,
  p_caption text default ''
)
returns public.challenge_submissions
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  participant public.challenge_participants;
  challenge public.challenges;
  next_day integer;
  result public.challenge_submissions;
begin
  if current_user_id is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;
  if p_file_path !~ ('^' || current_user_id::text || '/[A-Za-z0-9._/-]+$')
    or p_file_path like '%../%' then
    raise exception 'Invalid evidence path' using errcode = '22023';
  end if;

  select * into challenge from public.challenges
  where id = p_challenge_id and is_active and requires_evidence;
  if challenge.id is null then
    raise exception 'Evidence is not required for this challenge' using errcode = '22023';
  end if;
  select * into participant from public.challenge_participants
  where challenge_id = p_challenge_id and user_id = current_user_id
  for update;
  if participant.id is null or participant.status not in ('active', 'pending_review') then
    raise exception 'Active participation required' using errcode = '22023';
  end if;
  if exists (
    select 1 from public.challenge_submissions
    where participant_id = participant.id and status = 'pending'
  ) then
    raise exception 'A submission is already awaiting review' using errcode = '23505';
  end if;

  select coalesce(max(progress_day) filter (where status = 'approved'), 0) + 1
  into next_day from public.challenge_submissions
  where participant_id = participant.id;
  if next_day > challenge.duration_days then
    raise exception 'Challenge evidence is already complete' using errcode = '22023';
  end if;
  if not exists (
    select 1 from storage.objects
    where bucket_id = 'challenge-evidence'
      and name = p_file_path
      and owner_id = current_user_id::text
  ) then
    raise exception 'Evidence file must be uploaded before submission' using errcode = '22023';
  end if;

  insert into public.challenge_submissions (participant_id, user_id, progress_day, file_path, caption)
  values (participant.id, current_user_id, next_day, p_file_path, pg_catalog.left(p_caption, 500))
  on conflict (participant_id, progress_day) do update
  set file_path = excluded.file_path,
      caption = excluded.caption,
      status = 'pending',
      reviewed_by = null,
      reviewed_at = null,
      review_note = null,
      created_at = pg_catalog.now()
  where public.challenge_submissions.status = 'rejected'
  returning * into result;
  update public.challenge_participants set status = 'pending_review'
  where id = participant.id;
  return result;
end;
$$;

create function public.review_challenge_submission(
  p_submission_id uuid,
  p_approved boolean,
  p_review_note text default null
)
returns public.challenge_submissions
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  submission public.challenge_submissions;
  challenge public.challenges;
  approved_days integer;
begin
  if current_user_id is null or not (select app_private.is_reviewer()) then
    raise exception 'Reviewer role required' using errcode = '42501';
  end if;
  select * into submission from public.challenge_submissions
  where id = p_submission_id for update;
  if submission.id is null or submission.status <> 'pending' then
    raise exception 'Pending submission not found' using errcode = '22023';
  end if;

  update public.challenge_submissions
  set status = case when p_approved then 'approved' else 'rejected' end,
      reviewed_by = current_user_id,
      reviewed_at = pg_catalog.now(),
      review_note = pg_catalog.left(p_review_note, 500)
  where id = submission.id
  returning * into submission;

  select challenges.id, challenges.duration_days, challenges.xp_reward
  into challenge
  from public.challenges as challenges
  join public.challenge_participants as participants
    on participants.challenge_id = challenges.id
  where participants.id = submission.participant_id;

  select count(*) into approved_days from public.challenge_submissions
  where participant_id = submission.participant_id and status = 'approved';

  update public.challenge_participants
  set progress_days = approved_days,
      status = case
        when approved_days >= challenge.duration_days then 'completed'
        else 'active'
      end,
      completed_at = case
        when approved_days >= challenge.duration_days then pg_catalog.now()
        else null
      end
  where id = submission.participant_id;

  if approved_days >= challenge.duration_days then
    insert into public.user_xp_events (user_id, amount, event_type, source_type, source_id)
    values (submission.user_id, challenge.xp_reward, 'challenge_reward', 'challenge', challenge.id)
    on conflict (user_id, event_type, source_type, source_id) do nothing;
  end if;

  insert into public.notifications (recipient_id, actor_id, kind, related_id)
  values (
    submission.user_id,
    current_user_id,
    case when p_approved then 'submission_approved' else 'submission_rejected' end,
    submission.id
  );

  return submission;
end;
$$;

create function public.get_post_like_counts(p_post_ids uuid[])
returns table (post_id uuid, like_count bigint)
language sql
stable
security definer
set search_path = ''
as $$
  select likes.post_id, count(*)::bigint
  from public.post_likes as likes
  where likes.post_id = any(coalesce(p_post_ids, array[]::uuid[]))
  group by likes.post_id;
$$;

create function public.get_my_post_interactions(p_post_ids uuid[])
returns table (post_id uuid, liked boolean, saved boolean)
language sql
stable
security definer
set search_path = ''
as $$
  select requested.post_id,
    exists (
      select 1 from public.post_likes as likes
      where likes.post_id = requested.post_id and likes.user_id = (select auth.uid())
    ),
    exists (
      select 1 from public.saved_posts as saved_posts
      where saved_posts.post_id = requested.post_id and saved_posts.user_id = (select auth.uid())
    )
  from unnest(coalesce(p_post_ids, array[]::uuid[])) as requested(post_id)
  where (select auth.uid()) is not null;
$$;

create function public.get_challenge_participant_counts(p_challenge_ids uuid[])
returns table (challenge_id uuid, participant_count bigint)
language sql
stable
security definer
set search_path = ''
as $$
  select participants.challenge_id, count(*)::bigint
  from public.challenge_participants as participants
  where participants.challenge_id = any(coalesce(p_challenge_ids, array[]::uuid[]))
    and participants.status in ('active', 'pending_review', 'completed')
  group by participants.challenge_id;
$$;

create function public.get_public_profile_counts(p_user_id uuid)
returns table (followers bigint, following bigint, posts bigint)
language sql
stable
security definer
set search_path = ''
as $$
  select
    (select count(*) from public.follows where following_id = p_user_id),
    (select count(*) from public.follows where follower_id = p_user_id),
    (select count(*) from public.posts where author_id = p_user_id and visibility = 'public');
$$;

create function public.get_global_ranking(p_limit integer default 20, p_offset integer default 0)
returns table ("position" bigint, user_id uuid, username text, display_name text, avatar_path text, total_xp bigint)
language sql
stable
security definer
set search_path = ''
as $$
  with totals as (
    select events.user_id, coalesce(sum(events.amount), 0)::bigint as xp
    from public.user_xp_events as events
    group by events.user_id
  ), ranked as (
    select
      pg_catalog.rank() over (order by totals.xp desc, profiles.created_at asc) as place,
      profiles.user_id,
      profiles.username,
      profiles.display_name,
      profiles.avatar_path,
      totals.xp
    from totals
    join public.profiles on profiles.user_id = totals.user_id
  )
  select ranked.place, ranked.user_id, ranked.username, ranked.display_name, ranked.avatar_path, ranked.xp
  from ranked
  order by ranked.place
  limit least(greatest(coalesce(p_limit, 20), 1), 100)
  offset greatest(coalesce(p_offset, 0), 0);
$$;

create function app_private.notify_new_follow()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.notifications (recipient_id, actor_id, kind, related_id)
  values (new.following_id, new.follower_id, 'follow', null);
  return new;
end;
$$;

create function app_private.notify_post_interaction()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  post_author uuid;
  actor_id uuid;
  new_row jsonb := pg_catalog.to_jsonb(new);
  notification_kind text;
begin
  select author_id into post_author
  from public.posts
  where id = (new_row ->> 'post_id')::uuid;
  actor_id := coalesce(
    (new_row ->> 'user_id')::uuid,
    (new_row ->> 'author_id')::uuid
  );
  notification_kind := case when tg_table_name = 'post_likes' then 'like' else 'comment' end;
  if post_author is not null and post_author <> actor_id then
    insert into public.notifications (recipient_id, actor_id, kind, related_id)
    values (post_author, actor_id, notification_kind, (new_row ->> 'post_id')::uuid);
  end if;
  return new;
end;
$$;

create trigger notify_on_follow
after insert on public.follows
for each row execute function app_private.notify_new_follow();

create trigger notify_on_like
after insert on public.post_likes
for each row execute function app_private.notify_post_interaction();

create trigger notify_on_comment
after insert on public.comments
for each row execute function app_private.notify_post_interaction();

revoke all on function app_private.notify_new_follow() from public, anon, authenticated;
revoke all on function app_private.notify_post_interaction() from public, anon, authenticated;

revoke all on function public.join_challenge(uuid) from public, anon;
revoke all on function public.leave_challenge(uuid) from public, anon;
revoke all on function public.record_challenge_day(uuid) from public, anon;
revoke all on function public.submit_challenge_evidence(uuid, text, text) from public, anon;
revoke all on function public.review_challenge_submission(uuid, boolean, text) from public, anon, authenticated;
revoke all on function public.get_post_like_counts(uuid[]) from public;
revoke all on function public.get_my_post_interactions(uuid[]) from public, anon;
revoke all on function public.get_challenge_participant_counts(uuid[]) from public;
revoke all on function public.get_public_profile_counts(uuid) from public;
revoke all on function public.get_global_ranking(integer, integer) from public;
grant execute on function public.join_challenge(uuid) to authenticated;
grant execute on function public.leave_challenge(uuid) to authenticated;
grant execute on function public.record_challenge_day(uuid) to authenticated;
grant execute on function public.submit_challenge_evidence(uuid, text, text) to authenticated;
grant execute on function public.review_challenge_submission(uuid, boolean, text) to authenticated;
grant execute on function public.get_post_like_counts(uuid[]) to anon, authenticated;
grant execute on function public.get_my_post_interactions(uuid[]) to authenticated;
grant execute on function public.get_challenge_participant_counts(uuid[]) to anon, authenticated;
grant execute on function public.get_public_profile_counts(uuid) to anon, authenticated;
grant execute on function public.get_global_ranking(integer, integer) to anon, authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('avatars', 'avatars', true, 5242880, array['image/jpeg', 'image/png', 'image/webp']),
  ('post-images', 'post-images', false, 10485760, array['image/jpeg', 'image/png', 'image/webp']),
  ('challenge-evidence', 'challenge-evidence', false, 20971520, array['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'application/pdf'])
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

create policy "Public profile and post images are readable"
on storage.objects for select to anon, authenticated
using (
  bucket_id = 'avatars'
  or (
    bucket_id = 'post-images'
    and exists (
      select 1 from public.posts
      where posts.image_path = storage.objects.name
    )
  )
);

create policy "Users upload their own avatars"
on storage.objects for insert to authenticated
with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "Users update their own avatars"
on storage.objects for update to authenticated
using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text)
with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "Users delete their own avatars"
on storage.objects for delete to authenticated
using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "Users upload their own post images"
on storage.objects for insert to authenticated
with check (bucket_id = 'post-images' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "Users delete their own post images"
on storage.objects for delete to authenticated
using (bucket_id = 'post-images' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "Users access their own evidence files"
on storage.objects for select to authenticated
using (
  bucket_id = 'challenge-evidence'
  and (
    (storage.foldername(name))[1] = (select auth.uid())::text
    or (select app_private.is_reviewer())
  )
);

create policy "Users upload their own evidence files"
on storage.objects for insert to authenticated
with check (bucket_id = 'challenge-evidence' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "Users delete their own unsubmitted evidence"
on storage.objects for delete to authenticated
using (bucket_id = 'challenge-evidence' and (storage.foldername(name))[1] = (select auth.uid())::text);
