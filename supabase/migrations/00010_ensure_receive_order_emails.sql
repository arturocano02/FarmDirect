-- Ensure receive_order_emails column exists on farms table
-- This migration is idempotent and safe to run multiple times.
-- Fixes PGRST204 error: "Could not find the 'receive_order_emails' column"

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'farms' 
    AND column_name = 'receive_order_emails'
  ) THEN
    ALTER TABLE public.farms 
    ADD COLUMN receive_order_emails BOOLEAN DEFAULT true;
    
    COMMENT ON COLUMN public.farms.receive_order_emails IS 
      'Whether the farm owner wants to receive email notifications for new orders';
  END IF;
END $$;
