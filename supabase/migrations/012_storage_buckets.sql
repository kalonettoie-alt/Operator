-- Buckets Storage (privés, URLs signées)

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('intervention-photos', 'intervention-photos', FALSE, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp']),
  ('provider-documents', 'provider-documents', FALSE, 10485760, ARRAY['image/jpeg', 'image/png', 'application/pdf']),
  ('formation-content', 'formation-content', FALSE, 52428800, ARRAY['video/mp4', 'application/pdf', 'image/jpeg', 'image/png'])
ON CONFLICT DO NOTHING;

-- Policies Storage : intervention-photos
CREATE POLICY "Providers can upload intervention photos"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'intervention-photos'
    AND auth.role() = 'authenticated'
  );

CREATE POLICY "Authenticated users can read intervention photos"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'intervention-photos'
    AND auth.role() = 'authenticated'
  );

-- Policies Storage : provider-documents
CREATE POLICY "Providers can upload their documents"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'provider-documents'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::TEXT
  );

CREATE POLICY "Providers can read their own documents"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'provider-documents'
    AND (
      (storage.foldername(name))[1] = auth.uid()::TEXT
      OR is_admin()
    )
  );
