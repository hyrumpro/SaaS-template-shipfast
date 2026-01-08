import { NextResponse } from "next/server";
import { stripe } from "@/utils/stripe";
import { logger } from "@/lib/logger";
import { handleApiError } from "@/lib/error-handler";

export async function POST(req: Request) {
  try {
    const buf = await req.text();
    const sig = req.headers.get("stripe-signature") as string;

    if (!sig) {
      logger.warn("Stripe webhook received without signature");
      return NextResponse.json(
        { error: "Missing signature" },
        { status: 401 }
      );
    }

    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) {
      logger.error("STRIPE_WEBHOOK_SECRET is not configured");
      return NextResponse.json(
        { error: "Webhook configuration error" },
        { status: 500 }
      );
    }

    let event;

    try {
      event = stripe.webhooks.constructEvent(buf, sig, webhookSecret);
      logger.info("Stripe webhook signature verified", { type: event.type });
    } catch (err: any) {
      logger.error("Stripe webhook signature verification failed", err);
      return NextResponse.json(
        { error: `Webhook Error: ${err.message}` },
        { status: 400 }
      );
    }

    const subscription = event.data.object as any;
    const userId = subscription.metadata?.user_id;

    logger.payment("stripe_webhook_received", {
      event: event.type,
      subscriptionId: subscription.id,
      userId,
    });

    switch (event.type) {
      // === ONE-TIME PAYMENTS ===
      case "checkout.session.completed":
        const session = event.data.object as any;
        const mode = session.mode;

        logger.payment("checkout_completed", {
          sessionId: session.id,
          userId,
          amount: session.amount_total,
          currency: session.currency,
          mode: mode, // 'payment' or 'subscription'
        });

        if (mode === "payment") {
          // One-time payment completed
          // TODO: Create order record in database with status='paid'
          // TODO: Grant immediate access to purchased product
          // TODO: Send purchase confirmation email with receipt
        } else if (mode === "subscription") {
          // Initial subscription checkout completed
          // TODO: Create subscription record with status='active'
          // TODO: Grant access to subscription features
          // TODO: Send welcome email with subscription details
        }
        break;

      // === SUBSCRIPTION LIFECYCLE ===
      case "customer.subscription.created":
        logger.payment("subscription_created", {
          subscriptionId: subscription.id,
          userId,
          status: subscription.status,
          plan: subscription.items?.data[0]?.price?.id,
          interval: subscription.items?.data[0]?.price?.recurring?.interval, // 'month' or 'year'
          amount: subscription.items?.data[0]?.price?.unit_amount,
          currentPeriodStart: subscription.current_period_start,
          currentPeriodEnd: subscription.current_period_end,
        });
        // TODO: Store subscription in database with:
        //   - stripe_subscription_id, user_id, plan_name, status
        //   - price_amount, currency, interval (monthly/yearly)
        //   - current_period_start, current_period_end
        // TODO: Grant user access to premium features
        // TODO: Send subscription confirmation email
        break;

      case "customer.subscription.updated":
        const oldStatus = event.data.previous_attributes?.status;
        const newStatus = subscription.status;
        const cancelAtPeriodEnd = subscription.cancel_at_period_end;
        const planChanged = event.data.previous_attributes?.items;

        logger.payment("subscription_updated", {
          subscriptionId: subscription.id,
          userId,
          oldStatus,
          newStatus,
          cancelAtPeriodEnd,
          planChanged: !!planChanged,
          status: newStatus,
        });

        // Handle different update scenarios
        if (cancelAtPeriodEnd) {
          // User scheduled cancellation at period end
          // TODO: Update subscription.cancel_at_period_end = true
          // TODO: Send cancellation scheduled email
          // TODO: Keep access until current_period_end
        } else if (planChanged) {
          // User upgraded or downgraded plan
          // TODO: Update subscription plan details in database
          // TODO: Update pricing and interval
          // TODO: Send plan change confirmation email
        } else if (oldStatus !== newStatus) {
          // Status changed (active, past_due, canceled, etc.)
          // TODO: Update subscription status in database
          // TODO: Handle access based on new status
          if (newStatus === "past_due") {
            // TODO: Send payment issue notification
            // TODO: Maintain access temporarily
          } else if (newStatus === "unpaid") {
            // TODO: Revoke access after grace period
            // TODO: Send final payment notice
          } else if (newStatus === "active" && oldStatus === "past_due") {
            // Payment recovered
            // TODO: Send payment recovered confirmation
          }
        }
        break;

      case "customer.subscription.deleted":
        logger.payment("subscription_deleted", {
          subscriptionId: subscription.id,
          userId,
          canceledAt: subscription.canceled_at,
          endedAt: subscription.ended_at,
        });
        // TODO: Update subscription status to 'cancelled' in database
        // TODO: Revoke premium access immediately
        // TODO: Send cancellation confirmation email
        // TODO: Optionally offer feedback survey or win-back offer
        break;

      // === PAYMENT SUCCESS & FAILURES ===
      case "invoice.payment_succeeded":
        const invoice = event.data.object as any;
        const isFirstPayment = invoice.billing_reason === "subscription_create";

        logger.payment("payment_succeeded", {
          invoiceId: invoice.id,
          subscriptionId: invoice.subscription,
          userId,
          amount: invoice.amount_paid,
          currency: invoice.currency,
          billingReason: invoice.billing_reason,
          isFirstPayment,
        });

        if (isFirstPayment) {
          // First subscription payment succeeded
          // TODO: Confirm subscription is active
          // TODO: Send welcome email (if not sent in checkout.session.completed)
        } else {
          // Recurring payment succeeded
          // TODO: Record payment in orders/payments table
          // TODO: Extend subscription period in database
          // TODO: Send payment receipt email
          // TODO: If this recovers from past_due, restore full access
        }
        break;

      case "invoice.payment_failed":
        const failedInvoice = event.data.object as any;
        const attemptCount = failedInvoice.attempt_count;
        const nextPaymentAttempt = failedInvoice.next_payment_attempt;

        logger.payment("payment_failed", {
          invoiceId: failedInvoice.id,
          subscriptionId: failedInvoice.subscription,
          userId,
          attemptCount,
          nextPaymentAttempt,
          amountDue: failedInvoice.amount_due,
        });

        // TODO: Update subscription status to 'past_due' in database
        // TODO: Send payment failed notification email with:
        //   - Clear explanation
        //   - Link to update payment method
        //   - Number of retry attempts remaining
        //   - Grace period information
        // TODO: If final attempt failed:
        //   - Mark subscription for cancellation
        //   - Send final notice
        //   - Schedule access revocation
        break;

      // === PAYMENT METHOD ISSUES ===
      case "customer.subscription.payment_failed":
        logger.payment("subscription_payment_failed", {
          subscriptionId: subscription.id,
          userId,
        });
        // TODO: Same as invoice.payment_failed
        // TODO: Send urgent payment update request
        break;

      case "invoice.payment_action_required":
        const actionInvoice = event.data.object as any;

        logger.payment("payment_action_required", {
          invoiceId: actionInvoice.id,
          subscriptionId: actionInvoice.subscription,
          userId,
          paymentIntent: actionInvoice.payment_intent,
        });
        // TODO: Send email requesting 3D Secure authentication
        // TODO: Include link to complete authentication
        // TODO: Maintain access during authentication window
        break;

      // === REFUNDS & DISPUTES ===
      case "charge.refunded":
        const charge = event.data.object as any;

        logger.payment("charge_refunded", {
          chargeId: charge.id,
          userId,
          amount: charge.amount_refunded,
          currency: charge.currency,
          reason: charge.refund_reason,
        });
        // TODO: Update order/payment status to 'refunded'
        // TODO: Revoke access if applicable
        // TODO: Send refund confirmation email
        break;

      case "charge.dispute.created":
        const dispute = event.data.object as any;

        logger.payment("dispute_created", {
          disputeId: dispute.id,
          chargeId: dispute.charge,
          userId,
          amount: dispute.amount,
          reason: dispute.reason,
        });
        // TODO: Log dispute in database for review
        // TODO: Send internal notification to handle dispute
        // TODO: Optionally notify user about dispute process
        break;

      // === TRIAL PERIODS ===
      case "customer.subscription.trial_will_end":
        logger.payment("trial_ending", {
          subscriptionId: subscription.id,
          userId,
          trialEnd: subscription.trial_end,
        });
        // TODO: Send trial ending reminder email (3 days before)
        // TODO: Remind user to update payment method if needed
        break;

      // === PAYMENT METHOD UPDATES ===
      case "payment_method.attached":
        const paymentMethod = event.data.object as any;

        logger.payment("payment_method_attached", {
          paymentMethodId: paymentMethod.id,
          customerId: paymentMethod.customer,
          type: paymentMethod.type,
          last4: paymentMethod.card?.last4,
        });
        // TODO: Update user's payment method info in database
        // TODO: Send confirmation email about new payment method
        break;

      case "payment_method.detached":
        const detachedMethod = event.data.object as any;

        logger.payment("payment_method_detached", {
          paymentMethodId: detachedMethod.id,
          customerId: detachedMethod.customer,
        });
        // TODO: Log payment method removal
        // TODO: If last payment method removed, send warning
        break;

      default:
        logger.info("Unhandled Stripe webhook event", {
          type: event.type,
          id: subscription.id,
        });
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    logger.error("Stripe webhook processing error", error);
    const errorResponse = handleApiError(error);
    return NextResponse.json(
      { error: errorResponse.error },
      { status: errorResponse.statusCode }
    );
  }
}
