-- ─────────────────────────────────────────────────────────────────────────────
-- TABLE : chat_sessions
-- Stocke les sessions de conversation du chatbot AMANA.
-- Option B : persistance des échanges pour analytics et amélioration continue.
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists chat_sessions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references profiles(id) on delete set null,
  channel     text not null default 'web'
              check (channel in ('web', 'mobile', 'public')),
  created_at  timestamptz not null default now(),
  closed_at   timestamptz
);

create table if not exists chat_messages (
  id          uuid primary key default gen_random_uuid(),
  session_id  uuid not null references chat_sessions(id) on delete cascade,
  role        text not null check (role in ('user', 'assistant', 'system')),
  content     text not null,
  demande_ref text,
  created_at  timestamptz not null default now()
);

-- Index pour retrouver rapidement les messages d'une session
create index if not exists idx_chat_messages_session on chat_messages(session_id, created_at asc);
create index if not exists idx_chat_sessions_user on chat_sessions(user_id, created_at desc);

-- RLS
alter table chat_sessions enable row level security;
alter table chat_messages enable row level security;

-- Un client ne voit que ses propres sessions
create policy "client voit ses sessions"
  on chat_sessions for select
  using (user_id = auth.uid());

create policy "client voit ses messages"
  on chat_messages for select
  using (
    session_id in (
      select id from chat_sessions where user_id = auth.uid()
    )
  );

-- Service role (API) peut tout lire/écrire
-- (géré côté route.ts avec SUPABASE_SERVICE_ROLE_KEY)
