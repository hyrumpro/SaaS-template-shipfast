import { NextResponse } from "next/server";
import { stripe } from "@/utils/stripe";
import { logger } from "@/lib/logger";
import { handleApiError, Errors } from "@/lib/error-handler";
import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";

export async function POST(req: Request) {
  try {
    // Get authenticated user
    const cookieStore = await cookies();
    const supabase = await createClient(cookieStore);
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      throw Errors.authentication("You must be logged in to checkout");
    }

    const { priceId } = await req.json();

    if (!priceId) {
      throw Errors.validation("Price ID is required");
    }

    const origin = req.headers.get("origin") || process.env.NEXT_PUBLIC_SITE_URL;

    logger.payment("creating_stripe_checkout", {
      userId: user.id,
      priceId,
    });

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      customer_email: user.email,
      metadata: {
        user_id: user.id,
      },
      success_url: `${origin}/dashboard?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/pricing`,
    });

    logger.payment("stripe_checkout_created", {
      sessionId: session.id,
      userId: user.id,
    });

    return NextResponse.json({ sessionId: session.id, url: session.url });
  } catch (error) {
    logger.error("Stripe checkout error", error);
    const errorResponse = handleApiError(error);
    return NextResponse.json(
      { error: errorResponse.error },
      { status: errorResponse.statusCode }
    );
  }
}
