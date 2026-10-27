drop policy if exists "Visible posts are readable" on public.posts;
drop policy if exists "Public posts and own posts are readable" on public.posts;
drop policy if exists "Followers can read followers-only posts" on public.posts;

create policy "Public posts and own posts are readable"
on public.posts for select to anon, authenticated
using (visibility = 'public' or author_id = (select auth.uid()));

create policy "Followers can read followers-only posts"
on public.posts for select to authenticated
using (
  visibility = 'followers'
  and exists (
    select 1 from public.follows
    where follower_id = (select auth.uid())
      and following_id = posts.author_id
  )
);
