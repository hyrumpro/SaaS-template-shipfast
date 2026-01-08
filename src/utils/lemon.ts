// lib/lemon-squeezy.ts
import { logger } from "@/lib/logger";

// Use dynamic imports to prevent module-level initialization during build
let isConfigured = false;

async function configureLemonSqueezy() {
  if (isConfigured) return;

  const apiKey = process.env.LEMONSQUEEZY_API_KEY;

  if (!apiKey) {
    logger.warn("LEMONSQUEEZY_API_KEY is not configured");
    return;
  }

  const lemonSqueezyModule = await import("@lemonsqueezy/lemonsqueezy.js");

  lemonSqueezyModule.lemonSqueezySetup({
    apiKey,
    onError: (error) => {
      logger.error("Lemon Squeezy SDK Error", error);
      throw error;
    },
  });

  isConfigured = true;
}

export const createCheckout = async (
  variantId: string,
  redirectUrl: string,
  userId?: string
) => {
  await configureLemonSqueezy();

  const lemonSqueezyModule = await import("@lemonsqueezy/lemonsqueezy.js");
  const lsCreateCheckout = lemonSqueezyModule.createCheckout;

  const storeId = process.env.LEMONSQUEEZY_STORE_ID;

  if (!storeId) {
    throw new Error("LEMONSQUEEZY_STORE_ID is not configured");
  }

  if (!userId) {
    throw new Error("User ID is required for checkout. Please sign in first.");
  }

  const newCheckout = {
    productOptions: {
      redirectUrl,
    },
    checkoutData: {
      custom: {
        user_id: userId,
      },
    },
  };

  logger.payment("creating_checkout", {
    variantId,
    userId,
  });

  const { data, error } = await lsCreateCheckout(
    storeId,
    variantId,
    newCheckout
  );

  if (error) {
    logger.error("Failed to create LemonSqueezy checkout", error, {
      variantId,
      userId,
    });
    throw new Error(`Failed to create checkout: ${error.message}`);
  }

  logger.payment("checkout_created", {
    checkoutId: data?.id,
    userId,
  });

  return data;
};

export const handleWebhook = async (payload: any) => {
  // Handle webhook payload here
  // The payload is already verified at this point
  const eventName = payload.meta?.event_name;
  const data = payload.data;
  const attributes = data?.attributes;
  const orderId = data?.id;
  const userId = attributes?.custom_data?.user_id || attributes?.user_id;

  logger.payment("webhook_received", {
    event: eventName,
    orderId,
    userId,
  });

  switch (eventName) {
    // === ONE-TIME PURCHASES ===
    case "order_created":
      logger.payment("order_created", {
        orderId,
        userId,
        amount: attributes?.total,
        currency: attributes?.currency,
        status: attributes?.status,
        productName: attributes?.first_order_item?.product_name,
      });
      // TODO: Create order record in database with status='pending'
      // TODO: Wait for order_paid event to confirm payment
      break;

    case "order_paid":
      logger.payment("order_paid", {
        orderId,
        userId,
        amount: attributes?.total,
        currency: attributes?.currency,
        refunded: attributes?.refunded,
      });
      // TODO: Update order status to 'paid' in database
      // TODO: Grant immediate access to purchased product
      // TODO: Send purchase confirmation email with receipt
      // TODO: Record payment in payment history
      break;

    case "order_refunded":
      logger.payment("order_refunded", {
        orderId,
        userId,
        refundedAmount: attributes?.refunded_amount,
        currency: attributes?.currency,
      });
      // TODO: Update order status to 'refunded' in database
      // TODO: Revoke access to purchased product if applicable
      // TODO: Send refund confirmation email
      break;

    // === SUBSCRIPTION LIFECYCLE ===
    case "subscription_created":
      logger.payment("subscription_created", {
        subscriptionId: orderId,
        userId,
        plan: attributes?.variant_name,
        status: attributes?.status,
        interval: attributes?.product_name, // Contains plan interval info
        amount: attributes?.total,
        currency: attributes?.currency,
        renewsAt: attributes?.renews_at,
        endsAt: attributes?.ends_at,
      });
      // TODO: Store subscription in database with:
      //   - lemonsqueezy_subscription_id, user_id, plan_name, status
      //   - price_amount, currency, interval (monthly/yearly)
      //   - renews_at, ends_at, created_at
      // TODO: Grant user access to premium features
      // TODO: Send subscription confirmation email
      break;

    case "subscription_updated":
      const oldStatus = attributes?.status_before_change;
      const newStatus = attributes?.status;
      const cancelled = attributes?.cancelled;
      const pauseMode = attributes?.pause?.mode;

      logger.payment("subscription_updated", {
        subscriptionId: orderId,
        userId,
        oldStatus,
        newStatus,
        cancelled,
        pauseMode,
        variantChanged: attributes?.variant_id_changed,
        renewsAt: attributes?.renews_at,
        endsAt: attributes?.ends_at,
      });

      // Handle different update scenarios
      if (cancelled && attributes?.ends_at) {
        // User scheduled cancellation
        // TODO: Update subscription.cancelled = true, ends_at in database
        // TODO: Send cancellation scheduled email
        // TODO: Keep access until ends_at
      } else if (attributes?.variant_id_changed) {
        // User changed plan (upgrade/downgrade)
        // TODO: Update subscription plan details in database
        // TODO: Update pricing and billing cycle
        // TODO: Send plan change confirmation email
      } else if (pauseMode) {
        // Subscription paused (if enabled)
        // TODO: Update subscription.status = 'paused'
        // TODO: Maintain or revoke access based on pause mode
        // TODO: Send pause confirmation email
      } else if (oldStatus !== newStatus) {
        // Status changed
        // TODO: Update subscription status in database
        if (newStatus === "past_due") {
          // TODO: Send payment issue notification
          // TODO: Maintain access temporarily (grace period)
        } else if (newStatus === "unpaid") {
          // TODO: Revoke access
          // TODO: Send final payment notice
        } else if (newStatus === "active" && oldStatus === "past_due") {
          // Payment recovered
          // TODO: Restore full access
          // TODO: Send payment recovered confirmation
        }
      }
      break;

    case "subscription_cancelled":
      logger.payment("subscription_cancelled", {
        subscriptionId: orderId,
        userId,
        endsAt: attributes?.ends_at,
        status: attributes?.status,
      });
      // TODO: Update subscription status to 'cancelled' in database
      // TODO: Keep access until ends_at (end of billing period)
      // TODO: Send cancellation confirmation email
      // TODO: Optionally offer feedback survey or win-back offer
      break;

    case "subscription_resumed":
      logger.payment("subscription_resumed", {
        subscriptionId: orderId,
        userId,
        status: attributes?.status,
        renewsAt: attributes?.renews_at,
      });
      // TODO: Update subscription status to 'active' in database
      // TODO: Update renews_at to new renewal date
      // TODO: Restore full access
      // TODO: Send subscription resumed confirmation email
      break;

    case "subscription_expired":
      logger.payment("subscription_expired", {
        subscriptionId: orderId,
        userId,
        expiredAt: attributes?.ends_at,
      });
      // TODO: Update subscription status to 'expired' in database
      // TODO: Revoke premium access immediately
      // TODO: Send subscription expired notification
      // TODO: Optionally send renewal offer
      break;

    case "subscription_unpaused":
      logger.payment("subscription_unpaused", {
        subscriptionId: orderId,
        userId,
        status: attributes?.status,
        resumesAt: attributes?.renews_at,
      });
      // TODO: Update subscription status to 'active' in database
      // TODO: Restore access if it was revoked during pause
      // TODO: Send unpause confirmation email
      break;

    // === PAYMENT SUCCESS & FAILURES ===
    case "subscription_payment_success":
      logger.payment("subscription_payment_success", {
        subscriptionId: orderId,
        userId,
        amount: attributes?.total,
        currency: attributes?.currency,
        billingDate: attributes?.billing_anchor,
        renewsAt: attributes?.renews_at,
      });
      // TODO: Record payment in payments table
      // TODO: Extend subscription period in database (update renews_at)
      // TODO: Send payment receipt email
      // TODO: If recovering from past_due, restore full access
      break;

    case "subscription_payment_failed":
      logger.payment("subscription_payment_failed", {
        subscriptionId: orderId,
        userId,
        status: attributes?.status,
        endsAt: attributes?.ends_at,
        failureReason: attributes?.status_reason,
      });
      // TODO: Update subscription status to 'past_due' in database
      // TODO: Send payment failed notification email with:
      //   - Clear explanation
      //   - Link to update payment method
      //   - Grace period information
      //   - What happens if payment continues to fail
      // TODO: Maintain access during grace period
      // TODO: If multiple failures, schedule access revocation
      break;

    case "subscription_payment_recovered":
      logger.payment("subscription_payment_recovered", {
        subscriptionId: orderId,
        userId,
        status: attributes?.status,
        renewsAt: attributes?.renews_at,
      });
      // TODO: Update subscription status to 'active' in database
      // TODO: Clear any payment failure flags
      // TODO: Restore full access if it was limited
      // TODO: Send payment recovered confirmation email
      break;

    // === SUBSCRIPTION REMINDERS ===
    case "subscription_payment_reminder":
      logger.payment("subscription_payment_reminder", {
        subscriptionId: orderId,
        userId,
        renewsAt: attributes?.renews_at,
        amount: attributes?.total,
      });
      // TODO: Send upcoming payment reminder email (X days before)
      // TODO: Include amount, renewal date, and current plan details
      break;

    // === LICENSE KEYS (if applicable) ===
    case "license_key_created":
      logger.payment("license_key_created", {
        licenseKeyId: orderId,
        userId,
        key: attributes?.key,
        status: attributes?.status,
      });
      // TODO: Store license key in database
      // TODO: Associate with order/subscription
      // TODO: Send license key to user via email
      break;

    case "license_key_updated":
      logger.payment("license_key_updated", {
        licenseKeyId: orderId,
        status: attributes?.status,
        disabled: attributes?.disabled,
      });
      // TODO: Update license key status in database
      // TODO: Handle activation/deactivation
      break;

    default:
      logger.warn("Unhandled LemonSqueezy webhook event", {
        event: eventName,
        orderId,
        userId,
      });
  }
};
