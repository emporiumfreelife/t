-- Create featured_releases table
CREATE TABLE featured_releases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  media_content_id UUID NOT NULL REFERENCES media_page_content(id) ON DELETE CASCADE,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  -- Admin can override these fields if needed
  admin_edited_title TEXT,
  admin_edited_creator TEXT,
  admin_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  featured_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(media_content_id) -- Only one featured entry per media item
);

-- Create index for faster queries
CREATE INDEX idx_featured_releases_active_order 
ON featured_releases(is_active, display_order);

-- Enable RLS (Row Level Security)
ALTER TABLE featured_releases ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can read featured releases
CREATE POLICY "Featured releases are readable by all"
  ON featured_releases FOR SELECT
  USING (is_active = true);

-- Policy: Only admins can insert featured releases
CREATE POLICY "Only admins can insert featured releases"
  ON featured_releases FOR INSERT
  WITH CHECK (auth.jwt() ->> 'email' = 'admin@flourishtalents.com');

-- Policy: Only admins can update featured releases
CREATE POLICY "Only admins can update featured releases"
  ON featured_releases FOR UPDATE
  USING (auth.jwt() ->> 'email' = 'admin@flourishtalents.com');

-- Policy: Only admins can delete featured releases
CREATE POLICY "Only admins can delete featured releases"
  ON featured_releases FOR DELETE
  USING (auth.jwt() ->> 'email' = 'admin@flourishtalents.com');
