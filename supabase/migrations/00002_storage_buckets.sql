-- Farmlink Storage Buckets
-- Creates storage buckets for farm and product images

-- ============================================
-- STORAGE BUCKETS
-- ============================================

-- Farm images bucket (public read, authenticated write)
INSERT INTO storage.buckets (id, name, public)
VALUES ('farm-images', 'farm-images', true)
ON CONFLICT (id) DO NOTHING;

-- Product images bucket (public read, authenticated write)
INSERT INTO storage.buckets (id, name, public)
VALUES ('product-images', 'product-images', true)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- STORAGE POLICIES: farm-images
-- ============================================

-- Anyone can view farm images
CREATE POLICY "Anyone can view farm images"
ON storage.objects FOR SELECT
USING (bucket_id = 'farm-images');

-- Farm owners can upload their own farm images
CREATE POLICY "Farm owners can upload farm images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'farm-images'
  AND auth.role() = 'authenticated'
  AND EXISTS (
    SELECT 1 FROM farms
    WHERE farms.owner_user_id = auth.uid()
    AND (storage.foldername(name))[1] = farms.id::text
  )
);

-- Farm owners can update their own farm images
CREATE POLICY "Farm owners can update farm images"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'farm-images'
  AND auth.role() = 'authenticated'
  AND EXISTS (
    SELECT 1 FROM farms
    WHERE farms.owner_user_id = auth.uid()
    AND (storage.foldername(name))[1] = farms.id::text
  )
);

-- Farm owners can delete their own farm images
CREATE POLICY "Farm owners can delete farm images"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'farm-images'
  AND auth.role() = 'authenticated'
  AND EXISTS (
    SELECT 1 FROM farms
    WHERE farms.owner_user_id = auth.uid()
    AND (storage.foldername(name))[1] = farms.id::text
  )
);

-- Admins can manage all farm images
CREATE POLICY "Admins can manage farm images"
ON storage.objects FOR ALL
USING (
  bucket_id = 'farm-images'
  AND EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- ============================================
-- STORAGE POLICIES: product-images
-- ============================================

-- Anyone can view product images
CREATE POLICY "Anyone can view product images"
ON storage.objects FOR SELECT
USING (bucket_id = 'product-images');

-- Farm owners can upload their own product images
CREATE POLICY "Farm owners can upload product images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'product-images'
  AND auth.role() = 'authenticated'
  AND EXISTS (
    SELECT 1 FROM farms
    WHERE farms.owner_user_id = auth.uid()
    AND (storage.foldername(name))[1] = farms.id::text
  )
);

-- Farm owners can update their own product images
CREATE POLICY "Farm owners can update product images"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'product-images'
  AND auth.role() = 'authenticated'
  AND EXISTS (
    SELECT 1 FROM farms
    WHERE farms.owner_user_id = auth.uid()
    AND (storage.foldername(name))[1] = farms.id::text
  )
);

-- Farm owners can delete their own product images
CREATE POLICY "Farm owners can delete product images"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'product-images'
  AND auth.role() = 'authenticated'
  AND EXISTS (
    SELECT 1 FROM farms
    WHERE farms.owner_user_id = auth.uid()
    AND (storage.foldername(name))[1] = farms.id::text
  )
);

-- Admins can manage all product images
CREATE POLICY "Admins can manage product images"
ON storage.objects FOR ALL
USING (
  bucket_id = 'product-images'
  AND EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'admin'
  )
);
