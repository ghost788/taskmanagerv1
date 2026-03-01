import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

/* ─────────────────────────────────────────────────────
   SUPABASE SCHEMA — run this SQL in your Supabase
   project under SQL Editor → New Query
   ───────────────────────────────────────────────────── 

-- Projects table
create table projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  meta text,
  rag text default 'g',
  note text default '',
  created_at timestamptz default now()
);

-- Milestones table
create table milestones (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  text text not null,
  phase text not null,
  done boolean default false,
  position integer default 0
);

-- Weight logs table
create table weight_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  value numeric not null,
  unit text default 'lbs',
  logged_at timestamptz default now()
);

-- User goals table (target weight, fitness goal)
create table user_goals (
  user_id uuid primary key references auth.users(id) on delete cascade,
  weight_target numeric default 165,
  weight_unit text default 'lbs',
  fitness_goal integer default 4
);

-- Fitness logs (one row per workout day)
create table fitness_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  logged_date date not null,
  unique(user_id, logged_date)
);

-- Home items table
create table home_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  text text not null,
  cost text,
  done boolean default false,
  position integer default 0
);

-- Row Level Security — users only see their own data
alter table projects enable row level security;
alter table milestones enable row level security;
alter table weight_logs enable row level security;
alter table user_goals enable row level security;
alter table fitness_logs enable row level security;
alter table home_items enable row level security;

create policy "own projects" on projects for all using (auth.uid() = user_id);
create policy "own milestones" on milestones for all using (auth.uid() = user_id);
create policy "own weight_logs" on weight_logs for all using (auth.uid() = user_id);
create policy "own user_goals" on user_goals for all using (auth.uid() = user_id);
create policy "own fitness_logs" on fitness_logs for all using (auth.uid() = user_id);
create policy "own home_items" on home_items for all using (auth.uid() = user_id);

*/
