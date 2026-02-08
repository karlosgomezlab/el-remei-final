-- TABLAS PRINCIPALES
CREATE TABLE products (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  price decimal(10,2) NOT NULL,
  category text, -- primero, segundo, postre, bebida
  is_available boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE orders (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  table_number int NOT NULL,
  status text DEFAULT 'pending', -- pending, cooking, ready, served
  is_paid boolean DEFAULT false,
  total_amount decimal(10,2) NOT NULL,
  payment_intent_id text UNIQUE,
  items jsonb NOT NULL, -- [{id, name, qty, price}]
  created_at timestamptz DEFAULT now()
);

-- HABILITAR REALTIME (Para que el Dashboard parpadee al entrar pedido)
ALTER PUBLICATION supabase_realtime ADD TABLE orders;
ALTER PUBLICATION supabase_realtime ADD TABLE products;

-- SEGURIDAD (RLS)
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can insert orders" ON orders FOR INSERT WITH CHECK (true);
CREATE POLICY "Public can view their own order" ON orders FOR SELECT USING (true);
CREATE POLICY "Admin full access" ON orders FOR ALL TO authenticated USING (true);
