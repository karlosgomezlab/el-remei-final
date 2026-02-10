-- 1. Crear el bucket 'menu-images' si no existe
INSERT INTO storage.buckets (id, name, public)
VALUES ('menu-images', 'menu-images', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Eliminar políticas antiguas para evitar conflictos
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Public Insert" ON storage.objects;
DROP POLICY IF EXISTS "Allow Public Download" ON storage.objects;
DROP POLICY IF EXISTS "Allow Public Upload" ON storage.objects;

-- 3. Crear política para VER imágenes (Público)
CREATE POLICY "Allow Public Download"
ON storage.objects FOR SELECT
USING ( bucket_id = 'menu-images' );

-- 4. Crear política para SUBIR imágenes (Público/Anon - Para el Admin Panel actual)
-- Nota: En producción idealmente restringiríamos esto a usuarios autenticados.
CREATE POLICY "Allow Public Upload"
ON storage.objects FOR INSERT
WITH CHECK ( bucket_id = 'menu-images' );

-- 5. Crear política para ACTUALIZAR/BORRAR imágenes (Opcional, para el Admin)
CREATE POLICY "Allow Public Update"
ON storage.objects FOR UPDATE
USING ( bucket_id = 'menu-images' );

CREATE POLICY "Allow Public Delete"
ON storage.objects FOR DELETE
USING ( bucket_id = 'menu-images' );
