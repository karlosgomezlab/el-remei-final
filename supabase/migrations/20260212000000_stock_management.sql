-- 20260212000000_stock_management.sql

-- 1. Stock Movements Table (Audit Log)
CREATE TABLE IF NOT EXISTS stock_movements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ingredient_id UUID REFERENCES ingredients(id) ON DELETE CASCADE,
    quantity_change DECIMAL(10, 4) NOT NULL, -- Negative for usage, Positive for restock
    reason TEXT NOT NULL, -- 'sale', 'restock', 'waste', 'correction', 'audit'
    reference_id UUID, -- Can be order_id or other reference
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Trigger to automatically update current stock in ingredients table
CREATE OR REPLACE FUNCTION update_ingredient_stock()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE ingredients
    SET stock = stock + NEW.quantity_change,
        updated_at = NOW()
    WHERE id = NEW.ingredient_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_update_stock
AFTER INSERT ON stock_movements
FOR EACH ROW EXECUTE FUNCTION update_ingredient_stock();


-- 3. Function to deduct stock for a completed order
-- This function finds all items in an order, looks up their recipes, 
-- and creates stock movements for each ingredient used.
CREATE OR REPLACE FUNCTION deduct_stock_for_order(target_order_id UUID)
RETURNS VOID AS $$
DECLARE
    ord_item RECORD;
    rec RECORD;
    ing RECORD;
    qty_needed DECIMAL;
BEGIN
    -- Loop through all items in the order
    -- jsonb_array_elements expands the 'items' JSONB column
    FOR ord_item IN 
        SELECT 
            value->>'name' as item_name,
            (value->>'qty')::numeric as quantity,
            value->>'product_id' as product_id_raw
        FROM orders, jsonb_array_elements(items)
        WHERE id = target_order_id
    LOOP
        -- Try to find a matching product/recipe
        -- We match by name if product_id is missing, or by product_id if available
        -- For robust systems, strict FKs are better, but here we adapt to the JSON structure
        
        -- Find the active recipe for this product
        FOR rec IN 
            SELECT r.id, r.yield_quantity 
            FROM recipes r
            JOIN products p ON p.id = r.product_id
            WHERE p.name = ord_item.item_name 
            -- OR p.id = ord_item.product_id_raw::uuid -- (Uncomment if product_id is reliable in JSON)
            LIMIT 1
        LOOP
            -- For each ingredient in the recipe
            FOR ing IN 
                SELECT ingredient_id, quantity, wastage_percent 
                FROM recipe_ingredients 
                WHERE recipe_id = rec.id
            LOOP
                -- Calculate quantity to deduct per ingredient
                -- (Recipe Qty / Yield) * Order Qty
                qty_needed := (ing.quantity / rec.yield_quantity) * ord_item.quantity;
                
                -- Add waste factor if needed? 
                -- Usually stock is deducted net, but if we want to track gross usage including prep waste:
                -- qty_needed := qty_needed * (1 + (ing.wastage_percent / 100));
                -- Let's stick to net usage for now, or maybe the recipe quantity already includes waste?
                -- Standard: Recipe quantity is "Gross quantity needed to make the dish".
                
                -- Insert negative stock movement
                INSERT INTO stock_movements (
                    ingredient_id, 
                    quantity_change, 
                    reason, 
                    reference_id,
                    notes
                ) VALUES (
                    ing.ingredient_id,
                    -qty_needed, -- Negative!
                    'sale',
                    target_order_id,
                    'Order Item: ' || ord_item.item_name
                );
            END LOOP;
        END LOOP;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- 4. Enable Realtime for stock movements
ALTER PUBLICATION supabase_realtime ADD TABLE stock_movements;
