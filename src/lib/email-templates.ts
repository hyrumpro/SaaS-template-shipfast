// lib/email-templates.ts
// Email HTML templates for transactional emails

interface EmailTemplate {
  subject: string;
  html: string;
  text: string;
}

// Base email wrapper for consistent styling
function emailWrapper(content: string): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Email</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      background-color: #f5f5f5;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      background-color: #ffffff;
    }
    .header {
      background-color: #0F0F0F;
      color: #FFFFFF;
      padding: 32px 24px;
      text-align: center;
    }
    .content {
      padding: 32px 24px;
      color: #333333;
      line-height: 1.6;
    }
    .button {
      display: inline-block;
      background-color: #22C55E;
      color: #FFFFFF !important;
      text-decoration: none;
      padding: 12px 32px;
      border-radius: 6px;
      font-weight: 600;
      margin: 16px 0;
    }
    .footer {
      background-color: #f9f9f9;
      padding: 24px;
      text-align: center;
      color: #666666;
      font-size: 14px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 style="margin: 0;">ShipFree</h1>
    </div>
    <div class="content">
      ${content}
    </div>
    <div class="footer">
      <p>© ${new Date().getFullYear()} ShipFree. All rights reserved.</p>
      <p>If you have any questions, reply to this email.</p>
    </div>
  </div>
</body>
</html>`;
}

export const EmailTemplates = {
  // Welcome email after signup
  welcome(name: string): EmailTemplate {
    const html = emailWrapper(`
      <h2>Welcome to ShipFree! 🎉</h2>
      <p>Hi ${name},</p>
      <p>Thanks for joining ShipFree! We're excited to have you on board.</p>
      <p>Get started by exploring our features:</p>
      <ul>
        <li>Set up your project with our Next.js boilerplate</li>
        <li>Integrate authentication and payments</li>
        <li>Ship your product fast!</li>
      </ul>
      <a href="${process.env.NEXT_PUBLIC_SITE_URL}/dashboard" class="button">Go to Dashboard</a>
      <p>If you have any questions, don't hesitate to reach out!</p>
      <p>Happy building!<br/>The ShipFree Team</p>
    `);

    return {
      subject: "Welcome to ShipFree! 🚀",
      html,
      text: `Welcome to ShipFree!\n\nHi ${name},\n\nThanks for joining ShipFree! We're excited to have you on board.\n\nGet started by visiting ${process.env.NEXT_PUBLIC_SITE_URL}/dashboard\n\nHappy building!\nThe ShipFree Team`,
    };
  },

  // Email verification
  emailVerification(name: string, verificationLink: string): EmailTemplate {
    const html = emailWrapper(`
      <h2>Verify Your Email Address</h2>
      <p>Hi ${name},</p>
      <p>Please verify your email address to complete your registration.</p>
      <a href="${verificationLink}" class="button">Verify Email</a>
      <p>Or copy and paste this link into your browser:</p>
      <p style="color: #666; word-break: break-all;">${verificationLink}</p>
      <p>This link will expire in 24 hours.</p>
      <p>If you didn't create an account, you can safely ignore this email.</p>
    `);

    return {
      subject: "Verify your email address",
      html,
      text: `Verify Your Email Address\n\nHi ${name},\n\nPlease verify your email address by clicking this link:\n${verificationLink}\n\nThis link will expire in 24 hours.\n\nIf you didn't create an account, you can safely ignore this email.`,
    };
  },

  // Password reset
  passwordReset(name: string, resetLink: string): EmailTemplate {
    const html = emailWrapper(`
      <h2>Reset Your Password</h2>
      <p>Hi ${name},</p>
      <p>We received a request to reset your password. Click the button below to create a new password:</p>
      <a href="${resetLink}" class="button">Reset Password</a>
      <p>Or copy and paste this link into your browser:</p>
      <p style="color: #666; word-break: break-all;">${resetLink}</p>
      <p>This link will expire in 1 hour.</p>
      <p><strong>If you didn't request a password reset, please ignore this email and your password will remain unchanged.</strong></p>
    `);

    return {
      subject: "Reset your password",
      html,
      text: `Reset Your Password\n\nHi ${name},\n\nWe received a request to reset your password. Click this link to create a new password:\n${resetLink}\n\nThis link will expire in 1 hour.\n\nIf you didn't request a password reset, please ignore this email.`,
    };
  },

  // Payment success
  paymentSuccess(
    name: string,
    amount: string,
    plan: string,
    invoiceUrl?: string
  ): EmailTemplate {
    const html = emailWrapper(`
      <h2>Payment Successful! ✅</h2>
      <p>Hi ${name},</p>
      <p>Thank you for your payment! Your subscription to the <strong>${plan}</strong> plan is now active.</p>
      <div style="background-color: #f9f9f9; padding: 16px; border-radius: 8px; margin: 16px 0;">
        <p style="margin: 0;"><strong>Amount:</strong> ${amount}</p>
        <p style="margin: 8px 0 0 0;"><strong>Plan:</strong> ${plan}</p>
      </div>
      ${invoiceUrl ? `<a href="${invoiceUrl}" class="button">View Invoice</a>` : ""}
      <p>You now have access to all premium features. Start building amazing things!</p>
      <p>Thank you for your support!<br/>The ShipFree Team</p>
    `);

    return {
      subject: "Payment Successful - Thank You!",
      html,
      text: `Payment Successful!\n\nHi ${name},\n\nThank you for your payment! Your subscription to the ${plan} plan is now active.\n\nAmount: ${amount}\nPlan: ${plan}\n\n${invoiceUrl ? `View Invoice: ${invoiceUrl}\n\n` : ""}Thank you for your support!\nThe ShipFree Team`,
    };
  },

  // Subscription cancelled
  subscriptionCancelled(name: string, endDate: string): EmailTemplate {
    const html = emailWrapper(`
      <h2>Subscription Cancelled</h2>
      <p>Hi ${name},</p>
      <p>We're sorry to see you go. Your subscription has been cancelled and will remain active until <strong>${endDate}</strong>.</p>
      <p>After this date, you'll still have access to the free tier features.</p>
      <p>We'd love to hear your feedback on how we can improve. Simply reply to this email to let us know.</p>
      <p>If you change your mind, you can reactivate your subscription anytime from your dashboard.</p>
      <a href="${process.env.NEXT_PUBLIC_SITE_URL}/dashboard" class="button">Go to Dashboard</a>
      <p>Thank you for being part of ShipFree!<br/>The ShipFree Team</p>
    `);

    return {
      subject: "Your subscription has been cancelled",
      html,
      text: `Subscription Cancelled\n\nHi ${name},\n\nYour subscription has been cancelled and will remain active until ${endDate}.\n\nWe'd love to hear your feedback. Simply reply to this email.\n\nThank you for being part of ShipFree!\nThe ShipFree Team`,
    };
  },

  // Generic notification
  notification(name: string, title: string, message: string, actionUrl?: string, actionText?: string): EmailTemplate {
    const html = emailWrapper(`
      <h2>${title}</h2>
      <p>Hi ${name},</p>
      <p>${message}</p>
      ${actionUrl && actionText ? `<a href="${actionUrl}" class="button">${actionText}</a>` : ""}
      <p>Best regards,<br/>The ShipFree Team</p>
    `);

    return {
      subject: title,
      html,
      text: `${title}\n\nHi ${name},\n\n${message}\n\n${actionUrl ? `${actionText}: ${actionUrl}\n\n` : ""}Best regards,\nThe ShipFree Team`,
    };
  },
};

export default EmailTemplates;
