-- RLS Policies para isolamento por rede

-- 1. PURCHASE ORDERS
ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can access orders from their network" ON purchase_orders;

CREATE POLICY "Users can access orders from their network"
ON purchase_orders
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM units u
    JOIN user_roles ur ON ur.network_id = u.network_id
    WHERE u.id = purchase_orders.unit_id
    AND ur.user_id = auth.uid()
    AND ur.is_active = true
  )
);

-- 2. INGREDIENTS
ALTER TABLE ingredients ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can access ingredients from their network" ON ingredients;

CREATE POLICY "Users can access ingredients from their network"
ON ingredients
FOR ALL
USING (
  network_id IN (
    SELECT network_id FROM user_roles 
    WHERE user_id = auth.uid() 
    AND is_active = true
  )
);

-- 3. STOCK MOVEMENTS
ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can access stock movements from their network" ON stock_movements;

CREATE POLICY "Users can access stock movements from their network"
ON stock_movements
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM units u
    JOIN user_roles ur ON ur.network_id = u.network_id
    WHERE u.id = stock_movements.unit_id
    AND ur.user_id = auth.uid()
    AND ur.is_active = true
  )
);

-- 4. PURCHASE ORDER ITEMS
ALTER TABLE purchase_order_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can access order items from their network" ON purchase_order_items;

CREATE POLICY "Users can access order items from their network"
ON purchase_order_items
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM purchase_orders po
    JOIN units u ON u.id = po.unit_id
    JOIN user_roles ur ON ur.network_id = u.network_id
    WHERE po.id = purchase_order_items.purchase_order_id
    AND ur.user_id = auth.uid()
    AND ur.is_active = true
  )
);

-- 5. UNITS
ALTER TABLE units ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can access units from their network" ON units;

CREATE POLICY "Users can access units from their network"
ON units
FOR SELECT
USING (
  network_id IN (
    SELECT network_id FROM user_roles 
    WHERE user_id = auth.uid() 
    AND is_active = true
  )
);
