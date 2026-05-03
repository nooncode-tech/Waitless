-- Migration: fix missing UPDATE/DELETE RLS policies on orders and related tables
-- Run in Supabase SQL Editor
--
-- Root cause: orders table had SELECT + INSERT policies but no UPDATE policy.
-- When staff update order status via browser client (anon key + user JWT),
-- the upsert's UPDATE portion was silently rejected by RLS, causing changes
-- to revert on page reload.

-- Allow authenticated staff to update orders in their own tenant
CREATE POLICY "auth_update_tenant_orders" ON orders FOR UPDATE
  USING (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()))
  WITH CHECK (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

-- Allow authenticated staff to update table_sessions in their own tenant
CREATE POLICY "auth_update_tenant_sessions" ON table_sessions FOR UPDATE
  USING (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()))
  WITH CHECK (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

-- Also allow INSERT on table_sessions for staff (needed when creating sessions)
CREATE POLICY "auth_insert_tenant_sessions" ON table_sessions FOR INSERT
  WITH CHECK (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));
