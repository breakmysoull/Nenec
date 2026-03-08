-- =================================================================
-- RLS POLICIES - RECREATED FROM SCRATCH
-- Version: 20260307130000
-- =================================================================

-- Helper function to check if a user is part of a network.
CREATE OR REPLACE FUNCTION public.is_network_member(p_user_id uuid, p_network_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = p_user_id AND network_id = p_network_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- =================================================================
-- Table: checklists
-- =================================================================

-- First, drop existing policies on the table to ensure a clean slate.
DROP POLICY IF EXISTS "Allow SELECT on checklists for network members" ON public.checklists;
DROP POLICY IF EXISTS "Allow INSERT on checklists for network members" ON public.checklists;
DROP POLICY IF EXISTS "Allow UPDATE on checklists for network members" ON public.checklists;
DROP POLICY IF EXISTS "Allow DELETE on checklists for network members" ON public.checklists;

-- 1. SELECT Policy
CREATE POLICY "Allow SELECT on checklists for network members"
ON public.checklists FOR SELECT
USING (public.is_network_member(auth.uid(), network_id));

-- 2. INSERT Policy
CREATE POLICY "Allow INSERT on checklists for network members"
ON public.checklists FOR INSERT
WITH CHECK (public.is_network_member(auth.uid(), network_id));

-- 3. UPDATE Policy
CREATE POLICY "Allow UPDATE on checklists for network members"
ON public.checklists FOR UPDATE
USING (public.is_network_member(auth.uid(), network_id));

-- 4. DELETE Policy
CREATE POLICY "Allow DELETE on checklists for network members"
ON public.checklists FOR DELETE
USING (public.is_network_member(auth.uid(), network_id));


-- =================================================================
-- Table: checklist_items
-- =================================================================

-- Drop existing policies for a clean slate.
DROP POLICY IF EXISTS "Allow SELECT on checklist_items for network members" ON public.checklist_items;
DROP POLICY IF EXISTS "Allow INSERT on checklist_items for network members" ON public.checklist_items;
DROP POLICY IF EXISTS "Allow UPDATE on checklist_items for network members" ON public.checklist_items;
DROP POLICY IF EXISTS "Allow DELETE on checklist_items for network members" ON public.checklist_items;

-- Helper function to get the network_id from a checklist_id
CREATE OR REPLACE FUNCTION public.get_network_from_checklist(p_checklist_id uuid)
RETURNS uuid AS $$
DECLARE
  v_network_id uuid;
BEGIN
  SELECT network_id INTO v_network_id FROM public.checklists WHERE id = p_checklist_id;
  RETURN v_network_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 1. SELECT Policy
CREATE POLICY "Allow SELECT on checklist_items for network members"
ON public.checklist_items FOR SELECT
USING (public.is_network_member(auth.uid(), public.get_network_from_checklist(checklist_id)));

-- 2. INSERT Policy (This is the critical one)
CREATE POLICY "Allow INSERT on checklist_items for network members"
ON public.checklist_items FOR INSERT
WITH CHECK (public.is_network_member(auth.uid(), public.get_network_from_checklist(checklist_id)));

-- 3. UPDATE Policy
CREATE POLICY "Allow UPDATE on checklist_items for network members"
ON public.checklist_items FOR UPDATE
USING (public.is_network_member(auth.uid(), public.get_network_from_checklist(checklist_id)));

-- 4. DELETE Policy
CREATE POLICY "Allow DELETE on checklist_items for network members"
ON public.checklist_items FOR DELETE
USING (public.is_network_member(auth.uid(), public.get_network_from_checklist(checklist_id)));
