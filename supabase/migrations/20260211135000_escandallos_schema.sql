-- 20260211135000_escandallos_schema.sql

-- Enable extensions if not already (though likely enabled)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Ingredients table
CREATE TABLE IF NOT EXISTS ingredients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    unit TEXT NOT NULL, -- 'kg', 'g', 'l', 'ml', 'u'
    cost_per_unit DECIMAL(10, 4) NOT NULL, -- Cost precision to 4 decimals
    stock DECIMAL(10, 2) DEFAULT 0,
    min_stock_alert DECIMAL(10, 2),
    supplier TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Recipes table (Linking product to ingredients)
CREATE TABLE IF NOT EXISTS recipes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    name TEXT, -- Optional, defaults to product name
    yield_quantity DECIMAL(10, 2) DEFAULT 1, -- How many servings this recipe makes
    prep_time_minutes INTEGER,
    status TEXT DEFAULT 'draft', -- draft, active, archived
    version INTEGER DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Recipe Ingredients (Join table)
CREATE TABLE IF NOT EXISTS recipe_ingredients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recipe_id UUID REFERENCES recipes(id) ON DELETE CASCADE,
    ingredient_id UUID REFERENCES ingredients(id) ON DELETE RESTRICT, 
    quantity DECIMAL(10, 4) NOT NULL, -- Precise quantity needed for 1 yield unit of recipe
    unit TEXT, -- Unit used in recipe (might differ from stock unit, e.g. g vs kg)
    wastage_percent DECIMAL(5, 2) DEFAULT 0, -- percent of wastage
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_recipes_product_id ON recipes(product_id);
CREATE INDEX IF NOT EXISTS idx_recipe_ingredients_recipe_id ON recipe_ingredients(recipe_id);
CREATE INDEX IF NOT EXISTS idx_recipe_ingredients_ingredient_id ON recipe_ingredients(ingredient_id);

-- RLS Policies (Permissive for development)
ALTER TABLE ingredients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable all access for ingredients" ON ingredients FOR ALL USING (true);

ALTER TABLE recipes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable all access for recipes" ON recipes FOR ALL USING (true);

ALTER TABLE recipe_ingredients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable all access for recipe_ingredients" ON recipe_ingredients FOR ALL USING (true);

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE ingredients;
ALTER PUBLICATION supabase_realtime ADD TABLE recipes;
