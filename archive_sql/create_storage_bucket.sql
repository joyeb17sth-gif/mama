-- Create a public bucket for storing scope of work files
insert into storage.buckets (id, name, public)
values ('scope_files', 'scope_files', true)
on conflict (id) do nothing;

-- Set up RLS policies to allow authenticated users to upload and anyone to read
create policy "Public Access for scope files"
  on storage.objects for select
  using ( bucket_id = 'scope_files' );

create policy "Authenticated Upload for scope files"
  on storage.objects for insert
  with check ( bucket_id = 'scope_files' );

create policy "Authenticated Update for scope files"
  on storage.objects for update
  using ( bucket_id = 'scope_files' );

create policy "Authenticated Delete for scope files"
  on storage.objects for delete
  using ( bucket_id = 'scope_files' );
