-- Migration: Stripe → Transbank Webpay Plus
-- Rename Stripe columns to Transbank equivalents

ALTER TABLE user_billing RENAME COLUMN stripe_customer_id TO tbk_order_id;
ALTER TABLE user_billing RENAME COLUMN stripe_subscription_id TO tbk_token;

COMMENT ON COLUMN user_billing.tbk_order_id IS 'Último buy_order de Transbank';
COMMENT ON COLUMN user_billing.tbk_token IS 'Token de última transacción Webpay exitosa';

-- Billing transactions table for payment history
CREATE TABLE IF NOT EXISTS public.billing_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  buy_order TEXT NOT NULL UNIQUE,
  plan_type TEXT NOT NULL,
  amount INTEGER NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
  tbk_response JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.billing_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own billing_transactions"
  ON public.billing_transactions
  FOR SELECT
  USING (auth.uid() = user_id);
