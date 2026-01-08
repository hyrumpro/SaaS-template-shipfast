// app/api/lemonsqueezy/webhook/route.ts
import { NextResponse } from "next/server";
import { handleWebhook } from "@/utils/lemon";
import { logger } from "@/lib/logger";
import { handleApiError } from "@/lib/error-handler";
import crypto from "crypto";

export async function POST(request: Request) {
  try {
    const rawBody = await request.text();
    const payload = JSON.parse(rawBody);
    const signature = request.headers.get("x-signature");

    const secret = process.env.LEMONSQUEEZY_WEBHOOK_SECRET;
    if (!secret) {
      logger.error("LemonSqueezy webhook secret is not configured");
      return NextResponse.json(
        { error: "Webhook configuration error" },
        { status: 500 }
      );
    }

    // Verify webhook signature
    if (!signature) {
      logger.warn("LemonSqueezy webhook received without signature");
      return NextResponse.json(
        { error: "Missing signature" },
        { status: 401 }
      );
    }

    const hmac = crypto.createHmac("sha256", secret);
    const digest = hmac.update(rawBody).digest("hex");

    if (signature !== digest) {
      logger.warn("LemonSqueezy webhook signature verification failed", {
        expectedSignature: digest.substring(0, 10) + "...",
        receivedSignature: signature.substring(0, 10) + "...",
      });
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    logger.info("LemonSqueezy webhook signature verified");

    // Handle the verified webhook
    await handleWebhook(payload);

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error("LemonSqueezy webhook processing error", error);
    const errorResponse = handleApiError(error);
    return NextResponse.json(
      { error: errorResponse.error },
      { status: errorResponse.statusCode }
    );
  }
}

