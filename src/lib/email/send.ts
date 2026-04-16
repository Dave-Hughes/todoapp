import { Resend } from "resend";

/**
 * Thin wrapper around Resend. In dev (no RESEND_API_KEY), logs the email
 * instead of sending — lets us exercise the Organizer flow without a
 * live API key.
 */
export async function sendEmail(args: {
  to: string;
  subject: string;
  text: string;
  html: string;
}): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!apiKey || !from) {
    console.log("[email:dev-fallback] would send:", {
      to: args.to,
      subject: args.subject,
    });
    return;
  }
  const resend = new Resend(apiKey);
  const { error } = await resend.emails.send({
    from,
    to: args.to,
    subject: args.subject,
    text: args.text,
    html: args.html,
  });
  if (error) throw new Error(`Resend send failed: ${error.message}`);
}
