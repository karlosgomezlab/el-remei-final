-- 20260211140000_automatic_cost_calculation.sql

-- 1. Add Cached Cost Columns to Recipes
ALTER TABLE recipes ADD COLUMN IF NOT EXISTS total_cost DECIMAL(10, 4) DEFAULT 0;
ALTER TABLE recipes ADD COLUMN IF NOT EXISTS cost_per_serving DECIMAL(10, 4) DEFAULT 0;

-- 2. Function to recalculate cost for a single recipe
CREATE OR REPLACE FUNCTION calculate_recipe_cost(target_recipe_id UUID) 
RETURNS VOID AS $$
DECLARE
    calculated_total DECIMAL(10, 4);
    recipe_yield DECIMAL(10, 2);
BEGIN
    -- Calculate total cost of ingredients: Sum(Quantity * UnitCost * (1 + Wastage%))
    SELECT COALESCE(SUM(
        ri.quantity * i.cost_per_unit * (1 + COALESCE(ri.wastage_percent, 0) / 100)
    ), 0)
    INTO calculated_total
    FROM recipe_ingredients ri
    JOIN ingredients i ON ri.ingredient_id = i.id
    WHERE ri.recipe_id = target_recipe_id;

    -- Get Yield
    SELECT yield_quantity INTO recipe_yield FROM recipes WHERE id = target_recipe_id;
    
    -- Update Recipe with new costs
    UPDATE recipes 
    SET 
        total_cost = calculated_total,
        cost_per_serving = CASE WHEN recipe_yield > 0 THEN calculated_total / recipe_yield ELSE 0 END,
        updated_at = NOW()
    WHERE id = target_recipe_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Trigger: When Recipe Detail Changes (Ingredients added/removed/changed)
CREATE OR REPLACE FUNCTION trigger_recalc_on_recipe_change()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'DELETE') THEN
        PERFORM calculate_recipe_cost(OLD.recipe_id);
    ELSE
        PERFORM calculate_recipe_cost(NEW.recipe_id);
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_recipe_ingredients_cost ON recipe_ingredients;
CREATE TRIGGER tr_recipe_ingredients_cost
AFTER INSERT OR UPDATE OR DELETE ON recipe_ingredients
FOR EACH ROW EXECUTE FUNCTION trigger_recalc_on_recipe_change();

-- 4. Trigger: When Ingredient Price Changes (Update all affected recipes)
CREATE OR REPLACE FUNCTION trigger_recalc_on_ingredient_price_change()
RETURNS TRIGGER AS $$
DECLARE
    r RECORD;
BEGIN
    -- Only run if cost changed
    IF OLD.cost_per_unit <> NEW.cost_per_unit THEN
        -- Loop through all recipes using this ingredient
        FOR r IN SELECT DISTINCT recipe_id FROM recipe_ingredients WHERE ingredient_id = NEW.id LOOP
            PERFORM calculate_recipe_cost(r.recipe_id);
        END LOOP;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_ingredient_price_change ON ingredients;
CREATE TRIGGER tr_ingredient_price_change
AFTER UPDATE ON ingredients
FOR EACH ROW EXECUTE FUNCTION trigger_recalc_on_ingredient_price_change();
