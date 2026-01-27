CREATE OR REPLACE FUNCTION receive_purchase_order(p_purchase_order_id uuid) 
 RETURNS void 
 LANGUAGE plpgsql 
 SECURITY DEFINER 
 AS $$ 
 DECLARE 
   v_unit_id uuid; 
   v_status text; 
   v_item record; 
 BEGIN 
   -- Validação do pedido 
   SELECT unit_id, status::text 
   INTO v_unit_id, v_status 
   FROM purchase_orders 
   WHERE id = p_purchase_order_id; 
 
   IF v_unit_id IS NULL THEN 
     RAISE EXCEPTION 'Purchase order not found'; 
   END IF; 
 
   IF v_status = 'entregue' THEN 
     RAISE EXCEPTION 'Purchase order already delivered'; 
   END IF; 
 
   -- Atualiza status do pedido 
   UPDATE purchase_orders 
   SET status = 'entregue', 
       delivered_at = now() 
   WHERE id = p_purchase_order_id; 
 
   -- Registra movimentações de estoque 
   FOR v_item IN 
     SELECT ingredient_id, quantity_requested 
     FROM purchase_order_items 
     WHERE purchase_order_id = p_purchase_order_id 
   LOOP 
     INSERT INTO stock_movements ( 
       created_by, 
       ingredient_id, 
       movement_type, 
       quantity, 
       unit_id, 
       reason, 
       reference_id, 
       reference_type 
     ) VALUES ( 
       auth.uid(), 
       v_item.ingredient_id, 
       'compra', 
       v_item.quantity_requested, 
       v_unit_id, 
       'Recebimento de pedido de compra', 
       p_purchase_order_id::text, 
       'purchase_order' 
     ); 
   END LOOP; 
 END; 
 $$;
