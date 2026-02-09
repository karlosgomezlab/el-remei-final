-- Add new columns to products table for enhanced menu features

ALTER TABLE products 
ADD COLUMN IF NOT EXISTS image_url_2 text,
ADD COLUMN IF NOT EXISTS description text,
ADD COLUMN IF NOT EXISTS is_vegan boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS is_gluten_free boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS is_favorite boolean DEFAULT false;

-- Enhance RLS policies if needed (usually authenticated users can view products)
-- No changes needed for public viewing if policies are standard
