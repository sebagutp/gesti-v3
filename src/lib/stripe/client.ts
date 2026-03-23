import Stripe from 'stripe'

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY is not set')
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2023-08-16',
  typescript: true,
})

export const STRIPE_PLANS = {
  Pro_Mensual: process.env.STRIPE_PRICE_PRO_MENSUAL || '',
  Pro_Anual: process.env.STRIPE_PRICE_PRO_ANUAL || '',
} as const
