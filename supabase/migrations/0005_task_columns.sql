-- CRM-style board: columns become data (user-adjustable pipeline stages),
-- and tasks reference a column instead of a fixed status enum.

create table if not exists task_columns (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  position    numeric not null default 0,
  color       text,
  created_at  timestamptz not null default now()
);
create index if not exists task_columns_pos_idx on task_columns (position);

alter table tasks
  add column if not exists column_id uuid references task_columns (id) on delete set null;

-- Seed the three default columns once, then map existing tasks.status into them.
insert into task_columns (title, position)
select v.t, v.p from (values ('Inbox', 0), ('Doing', 1), ('Done', 2)) v(t, p)
where not exists (select 1 from task_columns);

update tasks
  set column_id = (select id from task_columns where lower(title) = tasks.status limit 1)
  where column_id is null;

grant select, insert, update, delete on task_columns to fasttrack_user;
