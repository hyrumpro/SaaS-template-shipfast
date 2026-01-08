// app/checkout/page.tsx
"use client";

import { createCheckout } from "@/utils/lemon";
import { useEffect, useState } from "react";
import { logger } from "@/lib/logger";
import { createClient } from "@/lib/supabase/client";

interface CheckoutPageProps {
  variantId?: string;
}

export default function CheckoutPage({ variantId }: CheckoutPageProps) {
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  // Get variant ID from environment or props
  const productVariantId = variantId || process.env.NEXT_PUBLIC_LEMONSQUEEZY_VARIANT_ID;

  useEffect(() => {
    const checkAuth = async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        setUserId(user.id);
      } else {
        logger.warn("User not authenticated for checkout");
        setError("Please sign in to continue with checkout.");
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  useEffect(() => {
    const initiateCheckout = async () => {
      if (!productVariantId) {
        setError("Product variant ID is not configured. Please contact support.");
        setIsLoading(false);
        logger.error("LemonSqueezy variant ID not configured");
        return;
      }

      if (!userId) {
        // Wait for userId to be set
        return;
      }

      try {
        setIsLoading(true);
        const redirectUrl = `${window.location.origin}/success`;
        const checkout = await createCheckout(productVariantId, redirectUrl, userId);
        setCheckoutUrl(checkout.data.attributes.url);
      } catch (err) {
        logger.error("Failed to initiate checkout", err);
        setError("Failed to load checkout. Please try again later.");
      } finally {
        setIsLoading(false);
      }
    };

    initiateCheckout();
  }, [productVariantId, userId]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading checkout...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center max-w-md p-6 bg-red-50 border border-red-200 rounded-lg">
          <h2 className="text-xl font-semibold text-red-800 mb-2">Error</h2>
          <p className="text-red-600">{error}</p>
          <div className="mt-4 space-x-2">
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
            >
              Try Again
            </button>
            {error.includes("sign in") && (
              <a
                href="/login"
                className="inline-block px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Sign In
              </a>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (!checkoutUrl) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-600">Unable to load checkout</p>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-4">Ready to checkout</h2>
        <a
          href={checkoutUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block bg-green-500 hover:bg-green-600 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
        >
          Proceed to Checkout
        </a>
      </div>
    </div>
  );
}
