import "server-only";
import { createTransport } from "./transport.js";
import { getEnv } from "../env/env.js";
import { logger } from "../logging/logger.js";

/**
 * High-level email adapter for Utsav-Connect.
 *
 * Provides typed send functions for each email category. All functions return
 * { accepted: boolean, error?: string } and never throw for delivery failures
 * — callers decide how to handle a failed send.
 *
 * Tokens and secrets are NEVER logged. Delivery failures are logged with
 * safe context only (recipient, subject, error class — never the token).
 *
 * Email delivery is DISABLED until a real provider and verified sender are
 * configured. The dev provider writes to .local/mail/ for local inspection
 * but never sends real email.
 */
let transport = null;
let transportPromise = null;

async function getTransport() {
  if (!transport && !transportPromise) {
    transportPromise = createTransport().then((t) => {
      transport = t;
      transportPromise = null;
      return t;
    });
  }
  if (transportPromise) {
    return transportPromise;
  }
  return transport;
}

/**
 * Reset the cached transport. Used by tests.
 */
export async function resetTransport() {
  transport = null;
  transportPromise = null;
}

/**
 * Send an email verification link to a new applicant.
 *
 * @param {string} to - Recipient email address
 * @param {string} token - One-time verification token (never logged)
 * @param {string} verifyUrl - Full URL to the verify-email page with token
 * @returns {Promise<{ accepted: boolean, error?: string }>}
 */
export async function sendEmailVerification({ to, token, verifyUrl }) {
  const transport = await getTransport();

  const subject = "Verify your email address — Utsav-Connect";
  const text = `You applied to join Utsav-Connect. Please verify your email address by visiting the link below:

${verifyUrl}

This link can only be used once and expires in 24 hours.

If you did not apply to join Utsav-Connect, you can ignore this email.

— Utsav-Connect`;
  const html = `
<!DOCTYPE html>
<html>
  <body style="font-family: system-ui, -apple-system, sans-serif; line-height: 1.6; color: #172033; margin: 0; padding: 24px;">
    <table role="presentation" width="100%" style="max-width: 600px; margin: 0 auto; background: #fff9ef; border: 1px solid #e7dccb; border-radius: 16px;">
      <tr>
        <td align="center" style="padding: 32px 24px 24px;">
          <div style="display: inline-block; width: 48px; height: 48px; background: #e85b00; border-radius: 12px; display: flex; align-items: center; justify-content: center;">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="m5 12.5 4.2 4.2L19 6.5"/>
            </svg>
          </div>
        </td>
      </tr>
      <tr>
        <td style="padding: 24px;">
          <h1 style="margin: 0 0 12px; font-size: 24px; font-weight: 600; color: #431806;">Verify your email address</h1>
          <p style="margin: 0 0 16px; color: #647084; font-size: 15px;">
            You applied to join Utsav-Connect. Please verify your email address by clicking the button below:
          </p>
          <table role="presentation" width="100%" style="margin: 24px 0;">
            <tr>
              <td align="center">
                <a href="${verifyUrl}" style="display: inline-block; background: #e85b00; color: #fff9ef; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 600; font-size: 15px;">
                  Verify email address
                </a>
              </td>
            </tr>
          </table>
          <p style="margin: 0 0 8px; color: #647084; font-size: 14px;">
            This link can only be used once and expires in 24 hours.
          </p>
          <p style="margin: 0; color: #98380a; font-size: 13px;">
            If you did not apply to join Utsav-Connect, you can ignore this email.
          </p>
        </td>
      </tr>
      <tr>
        <td align="center" style="padding: 24px; color: #647084; font-size: 12px;">
          Utsav-Connect · Mahotsav outreach coordination platform
        </td>
      </tr>
    </table>
  </body>
</html>`;

  try {
    const result = await transport.send({ to, subject, text, html });
    if (!result.accepted) {
      logger.warn("email.verification.failed", { to, error: result.error });
    }
    return result;
  } catch (error) {
    logger.error("email.verification.unexpected", { to, error: error.message });
    return { accepted: false, error: error.message };
  }
}

/**
 * Send an application-related notification to an applicant.
 *
 * @param {string} to - Recipient email address
 * @param {string} subject - Email subject line
 * @param {string} body - Plain text body
 * @param {string} [html] - Optional HTML body
 * @returns {Promise<{ accepted: boolean, error?: string }>}
 */
export async function sendApplicationNotification({ to, subject, body, html }) {
  const transport = await getTransport();

  try {
    const result = await transport.send({ to, subject, text: body, html });
    if (!result.accepted) {
      logger.warn("email.application.failed", { to, subject, error: result.error });
    }
    return result;
  } catch (error) {
    logger.error("email.application.unexpected", { to, subject, error: error.message });
    return { accepted: false, error: error.message };
  }
}

/**
 * Send an application decision notification (approval or rejection).
 *
 * @param {string} to - Recipient email address
 * @param {string} decision - "approved" or "rejected"
 * @param {string} [reviewNote] - Internal review note (NOT sent to applicant)
 * @param {string} [nextStepsUrl] - URL for next steps (e.g., dashboard or apply)
 * @returns {Promise<{ accepted: boolean, error?: string }>}
 */
export async function sendApplicationDecision({ to, decision, reviewNote, nextStepsUrl }) {
  const transport = await getTransport();

  const isApproved = decision === "approved";
  const subject =
    decision === "approved"
      ? "Your application has been approved — Utsav-Connect"
      : "Your application decision — Utsav-Connect";

  const approvedText = `Congratulations! Your application to join Utsav-Connect has been approved.

You can now sign in to your devotee dashboard, where you can:
- Record invitation reports for approved localities
- View your reporting history and contributions
- Propose new localities for the campaign map

${nextStepsUrl ? `Sign in at: ${nextStepsUrl}` : "Sign in at the Utsav-Connect website."}

Welcome to the outreach community.`;

  const rejectedText = `Thank you for your interest in Utsav-Connect.

After careful review, we are unable to approve your application at this time. You are welcome to apply again in the future if your circumstances change.

If you have questions, please contact the campaign team through the official Satsang website.`;

  const text = isApproved ? approvedText : rejectedText;

  const approvedHtml = `
<!DOCTYPE html>
<html>
  <body style="font-family: system-ui, -apple-system, sans-serif; line-height: 1.6; color: #172033; margin: 0; padding: 24px;">
    <table role="presentation" width="100%" style="max-width: 600px; margin: 0 auto; background: #fff9ef; border: 1px solid #e7dccb; border-radius: 16px;">
      <tr>
        <td align="center" style="padding: 32px 24px 24px;">
          <div style="display: inline-block; width: 48px; height: 48px; background: #e85b00; border-radius: 12px; display: flex; align-items: center; justify-content: center;">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M22 11c0 4.971-4.029 9-9 9s-9-4.029-9-9 4.029-9 9-9 9 4.029 9 9Zm0 0c0 4.971-4.029 9-9 9s-9-4.029-9-9 4.029-9 9-9 9 4.029 9 9Z"/>
            </svg>
          </div>
        </td>
      </tr>
      <tr>
        <td style="padding: 24px;">
          <h1 style="margin: 0 0 12px; font-size: 24px; font-weight: 600; color: #431806;">Application approved</h1>
          <p style="margin: 0 0 16px; color: #647084; font-size: 15px;">
            Congratulations! Your application to join Utsav-Connect has been reviewed and approved.
          </p>
          <p style="margin: 0 0 16px; color: #172033; font-size: 15px;">
            You can now sign in to your devotee dashboard, where you can:
          </p>
          <ul style="margin: 0 0 16px; color: #647084; font-size: 15px; padding-left: 20px;">
            <li>Record invitation reports for approved localities</li>
            <li>View your reporting history and contributions</li>
            <li>Propose new localities for the campaign map</li>
          </ul>
          <table role="presentation" width="100%" style="margin: 24px 0;">
            <tr>
              <td align="center">
                ${
                  nextStepsUrl
                    ? `<a href="${nextStepsUrl}" style="display: inline-block; background: #e85b00; color: #fff9ef; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 600; font-size: 15px;">Sign in to your dashboard</a>`
                    : `<span style="display: inline-block; background: #d99a38; color: #431806; padding: 12px 24px; border-radius: 8px; font-weight: 600; font-size: 15px;">Sign in to Utsav-Connect</span>`
                }
              </td>
            </tr>
          </table>
          <p style="margin: 0; color: #647084; font-size: 14px;">
            Welcome to the outreach community.
          </p>
        </td>
      </tr>
      <tr>
        <td align="center" style="padding: 24px; color: #647084; font-size: 12px;">
          Utsav-Connect · Mahotsav outreach coordination platform
        </td>
      </tr>
    </table>
  </body>
</html>`;

  const rejectedHtml = `
<!DOCTYPE html>
<html>
  <body style="font-family: system-ui, -apple-system, sans-serif; line-height: 1.6; color: #172033; margin: 0; padding: 24px;">
    <table role="presentation" width="100%" style="max-width: 600px; margin: 0 auto; background: #fff9ef; border: 1px solid #e7dccb; border-radius: 16px;">
      <tr>
        <td align="center" style="padding: 32px 24px 24px;">
          <div style="display: inline-block; width: 48px; height: 48px; background: #d99a38; border-radius: 12px; display: flex; align-items: center; justify-content: center;">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#431806" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="10"/>
              <path d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"/>
            </svg>
          </div>
        </td>
      </tr>
      <tr>
        <td style="padding: 24px;">
          <h1 style="margin: 0 0 12px; font-size: 24px; font-weight: 600; color: #431806;">Application decision</h1>
          <p style="margin: 0 0 16px; color: #647084; font-size: 15px;">
            Thank you for your interest in Utsav-Connect. After careful review, we are unable to approve your application at this time.
          </p>
          <p style="margin: 0 0 16px; color: #172033; font-size: 15px;">
            You are welcome to apply again in the future if your circumstances change.
          </p>
          <p style="margin: 0; color: #98380a; font-size: 14px;">
            If you have questions, please contact the campaign team through the official Satsang website.
          </p>
        </td>
      </tr>
      <tr>
        <td align="center" style="padding: 24px; color: #647084; font-size: 12px;">
          Utsav-Connect · Mahotsav outreach coordination platform
        </td>
      </tr>
    </table>
  </body>
</html>`;

  const html = isApproved ? approvedHtml : rejectedHtml;

  try {
    const result = await transport.send({ to, subject, text, html });
    if (!result.accepted) {
      logger.warn("email.application.decision.failed", {
        to,
        decision,
        error: result.error,
      });
    }
    return result;
  } catch (error) {
    logger.error("email.application.decision.unexpected", {
      to,
      decision,
      error: error.message,
    });
    return { accepted: false, error: error.message };
  }
}

/**
 * Send a password reset link to a user.
 *
 * @param {string} to - Recipient email address
 * @param {string} token - One-time reset token (never logged)
 * @param {string} resetUrl - Full URL to the password reset page with token
 * @returns {Promise<{ accepted: boolean, error?: string }>}
 */
export async function sendPasswordReset({ to, token, resetUrl }) {
  const transport = await getTransport();

  const subject = "Reset your password — Utsav-Connect";
  const text = `You requested a password reset for your Utsav-Connect account. Please reset your password by visiting the link below:

${resetUrl}

This link can only be used once and expires in 24 hours.

If you did not request a password reset, you can ignore this email.

— Utsav-Connect`;
  const html = `
<!DOCTYPE html>
<html>
  <body style="font-family: system-ui, -apple-system, sans-serif; line-height: 1.6; color: #172033; margin: 0; padding: 24px;">
    <table role="presentation" width="100%" style="max-width: 600px; margin: 0 auto; background: #fff9ef; border: 1px solid #e7dccb; border-radius: 16px;">
      <tr>
        <td align="center" style="padding: 32px 24px 24px;">
          <div style="display: inline-block; width: 48px; height: 48px; background: #e85b00; border-radius: 12px; display: flex; align-items: center; justify-content: center;">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M4 4h16v16H4z"/>
              <path d="M8 8h8v8H8z"/>
            </svg>
          </div>
        </td>
      </tr>
      <tr>
        <td style="padding: 24px;">
          <h1 style="margin: 0 0 12px; font-size: 24px; font-weight: 600; color: #431806;">Reset your password</h1>
          <p style="margin: 0 0 16px; color: #647084; font-size: 15px;">
            You requested a password reset for your Utsav-Connect account. Please click the button below to set a new password:
          </p>
          <table role="presentation" width="100%" style="margin: 24px 0;">
            <tr>
              <td align="center">
                <a href="${resetUrl}" style="display: inline-block; background: #e85b00; color: #fff9ef; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 600; font-size: 15px;">
                  Reset password
                </a>
              </td>
            </tr>
          </table>
          <p style="margin: 0 0 8px; color: #647084; font-size: 14px;">
            This link can only be used once and expires in 24 hours.
          </p>
          <p style="margin: 0; color: #98380a; font-size: 13px;">
            If you did not request a password reset, you can ignore this email and your password will remain unchanged.
          </p>
        </td>
      </tr>
      <tr>
        <td align="center" style="padding: 24px; color: #647084; font-size: 12px;">
          Utsav-Connect · Mahotsav outreach coordination platform
        </td>
      </tr>
    </table>
  </body>
</html>`;

  try {
    const result = await transport.send({ to, subject, text, html });
    if (!result.accepted) {
      logger.warn("email.password_reset.failed", { to, error: result.error });
    }
    return result;
  } catch (error) {
    logger.error("email.password_reset.unexpected", { to, error: error.message });
    return { accepted: false, error: error.message };
  }
}

/**
 * Send an administrator invitation email.
 *
 * @param {string} to - Recipient email address
 * @param {string} token - One-time invitation token (never logged)
 * @param {string} inviteUrl - Full URL to the invitation acceptance page with token
 * @param {string} invitedBy - Name of the Super Admin who sent the invitation
 * @returns {Promise<{ accepted: boolean, error?: string }>}
 */
export async function sendAdminInvitation({ to, token, inviteUrl, invitedBy }) {
  const transport = await getTransport();

  const subject = "You are invited to join Utsav-Connect as an administrator";
  const text = `You have been invited by ${invitedBy} to join Utsav-Connect as an administrator. Please accept the invitation by visiting the link below:

${inviteUrl}

This link can only be used once and expires in 7 days.

If you did not expect this invitation, you can ignore this email.

— Utsav-Connect`;
  const html = `
<!DOCTYPE html>
<html>
  <body style="font-family: system-ui, -apple-system, sans-serif; line-height: 1.6; color: #172033; margin: 0; padding: 24px;">
    <table role="presentation" width="100%" style="max-width: 600px; margin: 0 auto; background: #fff9ef; border: 1px solid #e7dccb; border-radius: 16px;">
      <tr>
        <td align="center" style="padding: 32px 24px 24px;">
          <div style="display: inline-block; width: 48px; height: 48px; background: #e85b00; border-radius: 12px; display: flex; align-items: center; justify-content: center;">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12 2L2 7l10 5 10-5-10-5z"/>
              <path d="M2 17l10 5 10-5"/>
            </svg>
          </div>
        </td>
      </tr>
      <tr>
        <td style="padding: 24px;">
          <h1 style="margin: 0 0 12px; font-size: 24px; font-weight: 600; color: #431806;">Administrator invitation</h1>
          <p style="margin: 0 0 16px; color: #647084; font-size: 15px;">
            You have been invited by <strong>${invitedBy}</strong> to join Utsav-Connect as an administrator. Please click the button below to accept the invitation and set up your account:
          </p>
          <table role="presentation" width="100%" style="margin: 24px 0;">
            <tr>
              <td align="center">
                <a href="${inviteUrl}" style="display: inline-block; background: #e85b00; color: #fff9ef; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 600; font-size: 15px;">
                  Accept invitation
                </a>
              </td>
            </tr>
          </table>
          <p style="margin: 0 0 8px; color: #647084; font-size: 14px;">
            This link can only be used once and expires in 7 days.
          </p>
          <p style="margin: 0; color: #98380a; font-size: 13px;">
            If you did not expect this invitation, you can ignore this email and your account will not be created.
          </p>
        </td>
      </tr>
      <tr>
        <td align="center" style="padding: 24px; color: #647084; font-size: 12px;">
          Utsav-Connect · Mahotsav outreach coordination platform
        </td>
      </tr>
    </table>
  </body>
</html>`;

  try {
    const result = await transport.send({ to, subject, text, html });
    if (!result.accepted) {
      logger.warn("email.admin_invitation.failed", { to, error: result.error });
    }
    return result;
  } catch (error) {
    logger.error("email.admin_invitation.unexpected", { to, error: error.message });
    return { accepted: false, error: error.message };
  }
}

/**
 * Return whether email delivery is available (provider configured).
 * Useful for UI that wants to show/hide email-dependent features.
 */
export function isEmailAvailable() {
  const env = getEnv();
  if (env.EMAIL_PROVIDER === "dev") return true;
  if (env.EMAIL_PROVIDER === "resend") return Boolean(env.EMAIL_API_KEY);
  return false;
}
