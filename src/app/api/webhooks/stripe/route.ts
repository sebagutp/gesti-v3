import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe/client'
import { createAdminClient } from '@/lib/supabase/admin'
import Stripe from 'stripe'

export async function POST(request: NextRequest) {
  const body = await request.text()
  const signature = request.headers.get('stripe-signature')

  if (!signature) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 })
  }

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    )
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('Webhook signature verification failed:', message)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  const supabase = createAdminClient()

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        const userId = session.metadata?.supabase_user_id
        const planType = session.metadata?.plan_type

        if (!userId || !planType) {
          console.error('Missing metadata in checkout session')
          break
        }

        const subscriptionId = typeof session.subscription === 'string'
          ? session.subscription
          : session.subscription?.id

        // Retrieve subscription to get period dates
        let startDate = new Date().toISOString()
        let endDate: string | null = null

        if (subscriptionId) {
          const subscription = await stripe.subscriptions.retrieve(subscriptionId)
          startDate = new Date(subscription.current_period_start * 1000).toISOString()
          endDate = new Date(subscription.current_period_end * 1000).toISOString()
        }

        await supabase.from('user_billing').upsert({
          user_id: userId,
          plan_type: planType,
          plan_status: 'active',
          stripe_customer_id: typeof session.customer === 'string' ? session.customer : session.customer?.id,
          stripe_subscription_id: subscriptionId,
          start_date: startDate,
          end_date: endDate,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id' })

        break
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription
        const customerId = typeof subscription.customer === 'string'
          ? subscription.customer
          : subscription.customer.id

        const { data: billing } = await supabase
          .from('user_billing')
          .select('id')
          .eq('stripe_customer_id', customerId)
          .single()

        if (!billing) break

        const status = subscription.status === 'active' ? 'active'
          : subscription.status === 'past_due' ? 'active'
          : 'cancelled'

        await supabase.from('user_billing').update({
          plan_status: status,
          end_date: new Date(subscription.current_period_end * 1000).toISOString(),
          updated_at: new Date().toISOString(),
        }).eq('stripe_customer_id', customerId)

        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        const customerId = typeof subscription.customer === 'string'
          ? subscription.customer
          : subscription.customer.id

        await supabase.from('user_billing').update({
          plan_status: 'cancelled',
          stripe_subscription_id: null,
          updated_at: new Date().toISOString(),
        }).eq('stripe_customer_id', customerId)

        break
      }

      default:
        // Unhandled event type
        break
    }
  } catch (error) {
    console.error('Webhook handler error:', error)
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}
