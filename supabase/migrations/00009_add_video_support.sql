-- Add video support for farms and products
-- This migration adds story_video_url to farms table and creates video storage buckets

-- ============================================
-- ADD VIDEO COLUMN TO FARMS
-- ============================================

-- Add story_video_url column to farms table
ALTER TABLE public.farms
ADD COLUMN IF NOT EXISTS story_video_url TEXT;

COMMENT ON COLUMN public.farms.story_video_url IS 'Optional video URL for farm story. Stored in farm-videos bucket.';

-- ============================================
-- STORAGE BUCKETS FOR VIDEOS
-- ============================================

-- Farm videos bucket (public read, authenticated write)
INSERT INTO storage.buckets (id, name, public)
VALUES ('farm-videos', 'farm-videos', true)
ON CONFLICT (id) DO NOTHING;

-- Product videos bucket (public read, authenticated write)
INSERT INTO storage.buckets (id, name, public)
VALUES ('product-videos', 'product-videos', true)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- STORAGE POLICIES: farm-videos
-- ============================================

-- Anyone can view farm videos
CREATE POLICY IF NOT EXISTS "Anyone can view farm videos"
ON storage.objects FOR SELECT
USING (bucket_id = 'farm-videos');

-- Farm owners can upload their own farm videos
CREATE POLICY IF NOT EXISTS "Farm owners can upload farm videos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'farm-videos'
  AND auth.role() = 'authenticated'
  AND EXISTS (
    SELECT 1 FROM farms
    WHERE farms.owner_user_id = auth.uid()
    AND (storage.foldername(name))[1] = farms.id::text
  )
);

-- Farm owners can update their own farm videos
CREATE POLICY IF NOT EXISTS "Farm owners can update farm videos"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'farm-videos'
  AND auth.role() = 'authenticated'
  AND EXISTS (
    SELECT 1 FROM farms
    WHERE farms.owner_user_id = auth.uid()
    AND (storage.foldername(name))[1] = farms.id::text
  )
);

-- Farm owners can delete their own farm videos
CREATE POLICY IF NOT EXISTS "Farm owners can delete farm videos"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'farm-videos'
  AND auth.role() = 'authenticated'
  AND EXISTS (
    SELECT 1 FROM farms
    WHERE farms.owner_user_id = auth.uid()
    AND (storage.foldername(name))[1] = farms.id::text
  )
);

-- Admins can manage all farm videos
CREATE POLICY IF NOT EXISTS "Admins can manage farm videos"
ON storage.objects FOR ALL
USING (
  bucket_id = 'farm-videos'
  AND EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- ============================================
-- STORAGE POLICIES: product-videos
-- ============================================

-- Anyone can view product videos
CREATE POLICY IF NOT EXISTS "Anyone can view product videos"
ON storage.objects FOR SELECT
USING (bucket_id = 'product-videos');

-- Farm owners can upload their own product videos
CREATE POLICY IF NOT EXISTS "Farm owners can upload product videos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'product-videos'
  AND auth.role() = 'authenticated'
  AND EXISTS (
    SELECT 1 FROM farms
    JOIN products ON products.farm_id = farms.id
    WHERE farms.owner_user_id = auth.uid()
    AND (storage.foldername(name))[1] = farms.id::text
    AND (storage.foldername(name))[2] = products.id::text
  )
);

-- Farm owners can update their own product videos
CREATE POLICY IF NOT EXISTS "Farm owners can update product videos"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'product-videos'
  AND auth.role() = 'authenticated'
  AND EXISTS (
    SELECT 1 FROM farms
    JOIN products ON products.farm_id = farms.id
    WHERE farms.owner_user_id = auth.uid()
    AND (storage.foldername(name))[1] = farms.id::text
    AND (storage.foldername(name))[2] = products.id::text
  )
);

-- Farm owners can delete their own product videos
CREATE POLICY IF NOT EXISTS "Farm owners can delete product videos"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'product-videos'
  AND auth.role() = 'authenticated'
  AND EXISTS (
    SELECT 1 FROM farms
    JOIN products ON products.farm_id = farms.id
    WHERE farms.owner_user_id = auth.uid()
    AND (storage.foldername(name))[1] = farms.id::text
    AND (storage.foldername(name))[2] = products.id::text
  )
);

-- Admins can manage all product videos
CREATE POLICY IF NOT EXISTS "Admins can manage product videos"
ON storage.objects FOR ALL
USING (
  bucket_id = 'product-videos'
  AND EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'admin'
  )
);
