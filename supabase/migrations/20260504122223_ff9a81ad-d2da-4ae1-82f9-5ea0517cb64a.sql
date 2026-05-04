
-- 1. Fix device_group_members: enable RLS and tighten policies
ALTER TABLE public.device_group_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can add devices to groups during setup" ON public.device_group_members;

CREATE POLICY "Authenticated users can view device group members"
ON public.device_group_members
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can add device group members"
ON public.device_group_members
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can remove device group members"
ON public.device_group_members
FOR DELETE
TO authenticated
USING (true);

-- 2. Fix permissions: remove the privilege-escalation INSERT policy
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.permissions;
DROP POLICY IF EXISTS "Enable insert for users based on user_id" ON public.permissions;

-- 3. Fix users table: drop the public-read ALL policy; restrict to self / admins
DROP POLICY IF EXISTS "Enable read access for all users" ON public.users;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.users;

CREATE POLICY "Users can view their own row"
ON public.users
FOR SELECT
TO authenticated
USING (auth.uid() = id);

CREATE POLICY "Admins can view all users"
ON public.users
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'admin_global'));

CREATE POLICY "Admins can insert users"
ON public.users
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'admin_global'));

-- 4. Fix profiles: drop the read-all policy (admin/self policy already exists)
DROP POLICY IF EXISTS "Users can read all profiles" ON public.profiles;
