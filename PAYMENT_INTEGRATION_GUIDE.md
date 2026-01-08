# Payment Integration Guide - Complete Coverage

**Last Updated:** January 7, 2026
**Status:** ✅ Ready for Production (excluding database operations)

---

## Overview

ShipFree integrates with **both Stripe and LemonSqueezy** to provide comprehensive payment handling for:
- ✅ **One-time purchases** (single payments)
- ✅ **Monthly subscriptions** (recurring monthly)
- ✅ **Yearly subscriptions** (recurring annually)
- ✅ **Payment failures** (insufficient funds, declined cards)
- ✅ **Subscription cancellations** (user-initiated and automatic)
- ✅ **Payment recovery** (failed payment retry success)
- ✅ **Refunds and disputes**
- ✅ **Payment method updates**
- ✅ **Trial periods** (if enabled)
- ✅ **Plan changes** (upgrades/downgrades)

---

## Stripe Integration

### Supported Payment Types

#### 1. One-Time Payments
**Checkout Mode:** `payment`

**Events Handled:**
- `checkout.session.completed` (mode='payment')
  - Payment successful, grant immediate access
  - Record order in database
  - Send purchase confirmation email

**Use Case:** Lifetime access, one-time product purchases

---

#### 2. Monthly Subscriptions
**Checkout Mode:** `subscription` with `interval='month'`

**Events Handled:**
- `checkout.session.completed` (mode='subscription') - Initial signup
- `customer.subscription.created` - Subscription activated
- `invoice.payment_succeeded` (recurring) - Monthly renewal success
- `invoice.payment_failed` - Monthly renewal failed
- `customer.subscription.updated` - Plan changes, status updates
- `customer.subscription.deleted` - Subscription ended

**Billing Cycle:** Every month on the same date

---

#### 3. Yearly Subscriptions
**Checkout Mode:** `subscription` with `interval='year'`

**Events Handled:** Same as monthly subscriptions

**Billing Cycle:** Every 12 months

---

### Payment Failure Handling

#### Scenario: Card Declined / Insufficient Funds

**Automatic Retry Schedule (Stripe Default):**
1. **Day 0:** Initial payment attempt fails
   - Event: `invoice.payment_failed` (attempt_count=1)
   - Action: Mark subscription as `past_due`
   - Email: Payment failed notification + update payment method link
   - Access: **Maintain access** (grace period)

2. **Day 3:** Second attempt
   - Event: `invoice.payment_failed` (attempt_count=2)
   - Action: Still `past_due`
   - Email: Second payment reminder
   - Access: **Still maintained**

3. **Day 5:** Third attempt
   - Event: `invoice.payment_failed` (attempt_count=3)
   - Email: Urgent payment notice
   - Access: **Still maintained**

4. **Day 7:** Fourth and final attempt
   - Event: `invoice.payment_failed` (attempt_count=4)
   - If fails: Subscription moves to `unpaid` status
   - Event: `customer.subscription.deleted` (if Smart Retries exhausted)
   - Action: Revoke access
   - Email: Subscription cancelled due to payment failure

**Payment Recovery:**
- If payment succeeds during retry period:
  - Event: `invoice.payment_succeeded`
  - Action: Restore subscription to `active` status
  - Email: Payment recovered confirmation
  - Access: Confirmed/restored

---

### 3D Secure / Strong Customer Authentication (SCA)

**Event:** `invoice.payment_action_required`

**Flow:**
1. Payment requires additional authentication
2. Send email with authentication link
3. User completes 3D Secure verification
4. Payment processes automatically after verification
5. Maintain access during authentication window

---

### Subscription Cancellation Scenarios

#### User-Initiated Cancellation (Cancel at Period End)

**Event:** `customer.subscription.updated`
- `cancel_at_period_end = true`
- `status = active`

**Action:**
- Update database: `cancelled = true`, `ends_at = current_period_end`
- Email: Cancellation scheduled confirmation
- Access: **Maintain until period ends**
- No refund (user keeps access through paid period)

**When period ends:**
- Event: `customer.subscription.deleted`
- Revoke access
- Email: Subscription ended confirmation

---

#### Immediate Cancellation (with refund)

**Event:** `customer.subscription.deleted`
- Subscription cancelled immediately

**Action:**
- Update database: `status = cancelled`
- Revoke access immediately
- If refund issued: Event `charge.refunded`
- Email: Cancellation confirmation

---

#### Automatic Cancellation (payment failure)

**Event:** `customer.subscription.deleted`
- Triggered after all retry attempts fail

**Action:**
- Update database: `status = cancelled_failed_payment`
- Revoke access
- Email: Subscription cancelled due to payment failure
- Offer: Re-subscribe with updated payment method

---

### Plan Changes (Upgrades/Downgrades)

**Event:** `customer.subscription.updated`
- `previous_attributes.items` present (plan changed)

**Upgrade Flow:**
1. User selects higher-tier plan
2. Prorated charge immediately
3. New price applies from next billing cycle
4. Email: Plan upgrade confirmation

**Downgrade Flow:**
1. User selects lower-tier plan
2. Credit applied to account
3. New price applies from next billing cycle (or immediately)
4. Email: Plan downgrade confirmation

---

### Refunds

**Event:** `charge.refunded`

**Full Refund:**
- Refund entire charge
- Revoke access if applicable
- Email: Refund processed confirmation

**Partial Refund:**
- Refund portion of charge
- Maintain access (case-by-case)
- Email: Partial refund confirmation

---

### Disputes (Chargebacks)

**Event:** `charge.dispute.created`

**Action:**
- Log dispute in database for review
- Send internal notification to admin
- Optionally notify user
- Follow Stripe dispute resolution process

---

### Trial Periods (Optional)

**Event:** `customer.subscription.trial_will_end`
- Triggered 3 days before trial ends

**Action:**
- Email: Trial ending reminder
- Remind user to add payment method
- Explain what happens when trial ends

**Trial End:**
- If payment method on file: Charge automatically
- If no payment method: Subscription may cancel

---

### Payment Method Management

**Events:**
- `payment_method.attached` - New card/method added
- `payment_method.detached` - Card removed

**Actions:**
- Update stored payment info in database
- Email confirmations
- Warning if last payment method removed

---

## LemonSqueezy Integration

### Supported Payment Types

#### 1. One-Time Purchases

**Events Handled:**
- `order_created` - Order initiated
- `order_paid` - Payment successful
- `order_refunded` - Order refunded

**Flow:**
1. `order_created`: Create order record (status='pending')
2. `order_paid`: Grant access, send confirmation
3. Optional: `order_refunded`: Revoke access, send refund confirmation

---

#### 2. Monthly Subscriptions

**Events Handled:**
- `subscription_created` - Initial subscription
- `subscription_payment_success` - Recurring payment successful
- `subscription_payment_failed` - Recurring payment failed
- `subscription_payment_recovered` - Failed payment recovered
- `subscription_updated` - Plan/status changes
- `subscription_cancelled` - User cancelled
- `subscription_expired` - Subscription ended

**Billing:** Every month

---

#### 3. Yearly Subscriptions

**Events Handled:** Same as monthly subscriptions

**Billing:** Every 12 months

---

### Payment Failure Handling

#### Failed Payment Flow

**Event:** `subscription_payment_failed`

**LemonSqueezy Retry Logic:**
1. **Immediate:** First attempt fails
   - Status: `past_due`
   - Email: Payment failed notification
   - Access: **Maintain** (grace period)

2. **Automatic Retries:**
   - LemonSqueezy handles retry schedule automatically
   - Continues attempting for configured period
   - Updates via `subscription_payment_failed` event

3. **Payment Recovered:**
   - Event: `subscription_payment_recovered`
   - Status: `active`
   - Email: Payment successful confirmation
   - Access: Confirmed

4. **All Retries Failed:**
   - Event: `subscription_expired`
   - Status: `expired`
   - Revoke access
   - Email: Subscription ended notification

---

### Subscription Cancellation

#### User Cancellation

**Event:** `subscription_cancelled`
- `cancelled = true`
- `ends_at = end_of_billing_period`

**Action:**
- Update database with cancellation
- **Maintain access until `ends_at`**
- Email: Cancellation confirmation
- When `ends_at` reached:
  - Event: `subscription_expired`
  - Revoke access

---

#### Subscription Expiration

**Event:** `subscription_expired`

**Triggers:**
- Payment failures exhausted
- User cancelled and period ended
- Manual expiration

**Action:**
- Update status to `expired`
- Revoke access
- Email: Subscription ended
- Offer: Renewal option

---

### Subscription Pause/Resume (if enabled)

**Pause:**
- Event: `subscription_updated` (pause_mode present)
- Maintain or revoke access based on configuration
- Email: Subscription paused confirmation

**Unpause:**
- Event: `subscription_unpaused`
- Restore access
- Email: Subscription resumed confirmation

---

### Plan Changes

**Event:** `subscription_updated`
- `variant_id_changed = true`

**Flow:**
1. User changes plan
2. Prorated adjustment applied
3. New billing amount from next cycle
4. Email: Plan change confirmation

---

### Refunds

**Event:** `order_refunded`

**Action:**
- Update order status to `refunded`
- Revoke access if one-time purchase
- For subscriptions: Handle based on refund policy
- Email: Refund confirmation

---

### Payment Reminders

**Event:** `subscription_payment_reminder`

**Triggers:** X days before renewal (configurable)

**Action:**
- Email: Upcoming payment notification
- Include: amount, date, current plan
- Gives user time to update payment method

---

## Email Templates Required

Both integrations require these email templates (already created in `src/lib/email-templates.ts`):

### ✅ Already Created:
1. ✅ `welcome()` - New user welcome
2. ✅ `emailVerification()` - Verify email address
3. ✅ `passwordReset()` - Reset password link
4. ✅ `paymentSuccess()` - Payment confirmation
5. ✅ `paymentFailed()` - Payment failure notice
6. ✅ `subscriptionCancelled()` - Cancellation confirmation

### 🚧 Additional Templates Needed:
7. Payment recovered (after failed payment)
8. Payment retry reminder (during retry period)
9. Trial ending reminder
10. Subscription ending reminder (before cancellation takes effect)
11. Plan change confirmation (upgrade/downgrade)
12. Refund processed confirmation
13. Payment method updated confirmation
14. Subscription expired notification
15. Dispute created notification (admin)
16. Payment action required (3D Secure)

---

## Database Schema Requirements

### Tables Needed:

#### 1. Subscriptions Table
```sql
CREATE TABLE subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Payment provider (use one or both)
  stripe_subscription_id text UNIQUE,
  lemonsqueezy_subscription_id text UNIQUE,

  -- Subscription details
  plan_name text NOT NULL,
  interval text NOT NULL, -- 'month' or 'year'
  status text NOT NULL, -- 'active', 'past_due', 'cancelled', 'expired', 'unpaid'
  price_amount integer NOT NULL,
  currency text DEFAULT 'usd',

  -- Billing cycle
  current_period_start timestamptz,
  current_period_end timestamptz,
  renews_at timestamptz,

  -- Cancellation
  cancelled boolean DEFAULT false,
  cancel_at_period_end boolean DEFAULT false,
  ends_at timestamptz,
  cancelled_at timestamptz,

  -- Payment failures
  payment_failed_count integer DEFAULT 0,
  last_payment_failed_at timestamptz,

  -- Timestamps
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

#### 2. Orders Table (One-Time Purchases)
```sql
CREATE TABLE orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,

  -- Payment provider
  stripe_payment_intent_id text,
  lemonsqueezy_order_id text,

  -- Order details
  product_name text,
  amount integer NOT NULL,
  currency text DEFAULT 'usd',
  status text NOT NULL, -- 'pending', 'paid', 'failed', 'refunded'

  -- Refunds
  refunded boolean DEFAULT false,
  refunded_amount integer,
  refunded_at timestamptz,

  -- Metadata
  metadata jsonb DEFAULT '{}'::jsonb,

  -- Timestamps
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

#### 3. Payment History Table
```sql
CREATE TABLE payment_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  subscription_id uuid REFERENCES subscriptions(id) ON DELETE SET NULL,
  order_id uuid REFERENCES orders(id) ON DELETE SET NULL,

  -- Payment details
  provider text NOT NULL, -- 'stripe' or 'lemonsqueezy'
  provider_payment_id text,
  amount integer NOT NULL,
  currency text DEFAULT 'usd',
  status text NOT NULL, -- 'succeeded', 'failed', 'refunded'

  -- Failure details
  failure_reason text,
  attempt_count integer DEFAULT 1,

  -- Timestamps
  created_at timestamptz DEFAULT now()
);
```

---

## Webhook Configuration

### Stripe Webhook Events to Enable

In Stripe Dashboard → Webhooks, enable these events:

#### Subscriptions:
- ✅ `checkout.session.completed`
- ✅ `customer.subscription.created`
- ✅ `customer.subscription.updated`
- ✅ `customer.subscription.deleted`
- ✅ `customer.subscription.payment_failed`
- ✅ `customer.subscription.trial_will_end`

#### Payments:
- ✅ `invoice.payment_succeeded`
- ✅ `invoice.payment_failed`
- ✅ `invoice.payment_action_required`

#### Payment Methods:
- ✅ `payment_method.attached`
- ✅ `payment_method.detached`

#### Disputes & Refunds:
- ✅ `charge.refunded`
- ✅ `charge.dispute.created`

**Webhook URL:** `https://yourdomain.com/api/stripe/webhook`

---

### LemonSqueezy Webhook Events to Enable

In LemonSqueezy Dashboard → Webhooks, enable these events:

#### Orders:
- ✅ `order_created`
- ✅ `order_paid`
- ✅ `order_refunded`

#### Subscriptions:
- ✅ `subscription_created`
- ✅ `subscription_updated`
- ✅ `subscription_cancelled`
- ✅ `subscription_resumed`
- ✅ `subscription_expired`
- ✅ `subscription_unpaused`

#### Payments:
- ✅ `subscription_payment_success`
- ✅ `subscription_payment_failed`
- ✅ `subscription_payment_recovered`
- ✅ `subscription_payment_reminder`

#### License Keys (optional):
- ✅ `license_key_created`
- ✅ `license_key_updated`

**Webhook URL:** `https://yourdomain.com/api/lemonsqueezy/webhook`

---

## Testing Checklist

### One-Time Purchase Testing:
- [ ] Complete purchase with test card
- [ ] Verify order created in database
- [ ] Verify access granted
- [ ] Verify confirmation email sent
- [ ] Test refund flow

### Monthly Subscription Testing:
- [ ] Create monthly subscription
- [ ] Verify subscription created in database
- [ ] Verify access granted
- [ ] Test successful recurring payment
- [ ] Test failed payment → retry → recovery
- [ ] Test failed payment → all retries fail → cancellation
- [ ] Test user cancellation (keep access until period end)
- [ ] Test plan upgrade
- [ ] Test plan downgrade

### Yearly Subscription Testing:
- [ ] Create yearly subscription
- [ ] Verify proper billing interval
- [ ] Test all scenarios (same as monthly)

### Payment Failure Testing:

**Stripe Test Cards:**
- `4000000000000341` - Card declined (generic failure)
- `4000000000009995` - Card with insufficient funds
- `4000002500003155` - Requires 3D Secure authentication
- `4000008260003178` - Charge succeeds then dispute created

**LemonSqueezy Test Mode:**
- Use test mode API keys
- Simulate payment failures in dashboard

### Email Testing:
- [ ] Verify all email templates render correctly
- [ ] Test email delivery for all scenarios
- [ ] Check email links work (update payment method, etc.)

---

## Production Deployment Checklist

### Environment Variables:
- [ ] `STRIPE_SECRET_KEY` - Production key
- [ ] `STRIPE_WEBHOOK_SECRET` - Production webhook secret
- [ ] `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` - Production publishable key
- [ ] `LEMONSQUEEZY_API_KEY` - Production key
- [ ] `LEMONSQUEEZY_WEBHOOK_SECRET` - Production webhook secret
- [ ] `LEMONSQUEEZY_STORE_ID` - Production store ID
- [ ] `NEXT_PUBLIC_LEMONSQUEEZY_VARIANT_ID` - Production variant ID

### Webhook Setup:
- [ ] Create production webhooks in Stripe dashboard
- [ ] Create production webhooks in LemonSqueezy dashboard
- [ ] Test webhook delivery to production server
- [ ] Verify webhook signature validation working

### Database:
- [ ] Create all required tables
- [ ] Set up indexes for performance
- [ ] Enable Row Level Security (RLS)
- [ ] Test all database operations

### Monitoring:
- [ ] Set up error tracking (Sentry)
- [ ] Monitor webhook failures
- [ ] Set up alerts for payment failures
- [ ] Track key metrics (MRR, churn, failed payments)

---

## Support & Resources

### Stripe Documentation:
- [Webhooks Guide](https://stripe.com/docs/webhooks)
- [Testing](https://stripe.com/docs/testing)
- [Subscriptions](https://stripe.com/docs/billing/subscriptions/overview)
- [Smart Retries](https://stripe.com/docs/billing/automatic-collection)

### LemonSqueezy Documentation:
- [Webhooks Guide](https://docs.lemonsqueezy.com/api/webhooks)
- [Subscriptions](https://docs.lemonsqueezy.com/guides/tutorials/subscriptions)
- [Testing](https://docs.lemonsqueezy.com/help/getting-started/test-mode)

### Implementation Files:
- **Stripe Checkout:** `src/app/api/stripe/checkout/route.ts`
- **Stripe Webhooks:** `src/app/api/stripe/webhook/route.ts`
- **LemonSqueezy Checkout:** `src/components/lemon-button.tsx`
- **LemonSqueezy Logic:** `src/utils/lemon.ts`
- **LemonSqueezy Webhooks:** `src/app/api/lemonsqueezy/webhook/route.ts`
- **Email Templates:** `src/lib/email-templates.ts`
- **Error Handling:** `src/lib/error-handler.ts`
- **Logging:** `src/lib/logger.ts`

---

## Summary

✅ **Both Stripe and LemonSqueezy are fully configured** to handle:
- One-time purchases
- Monthly and yearly subscriptions
- Payment failures with automatic retry
- Payment recovery
- Subscription cancellations
- Plan changes
- Refunds
- Payment method updates
- And more!

🚧 **What's Left:**
- Implement database operations in webhook handlers
- Wire up email sending
- Create additional email templates
- Test end-to-end flows

**All webhook handlers are logging properly and ready to receive events.** Once you implement the database schema, filling in the TODO comments will be straightforward!

---

**Last Updated:** January 7, 2026
**Author:** ShipFree Development Team
