function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export interface RenderedEmail {
  subject: string;
  text: string;
  html: string;
}

export function renderInviteEmail(args: {
  organizerName: string;
  inviteUrl: string;
}): RenderedEmail {
  const { organizerName, inviteUrl } = args;
  const safeName = escapeHtml(organizerName);
  const subject = `${organizerName} invited you`;
  const text = [
    `${organizerName} invited you.`,
    ``,
    `This is where you two run the house.`,
    ``,
    `Open your invite:`,
    inviteUrl,
  ].join("\n");
  const html = `<!doctype html>
<html><body style="font-family:system-ui,sans-serif;padding:24px;line-height:1.5;color:#222">
  <p style="font-size:18px;margin:0 0 12px">${safeName} invited you.</p>
  <p style="margin:0 0 20px">This is where you two run the house.</p>
  <p><a href="${inviteUrl}" style="display:inline-block;background:#222;color:#fff;padding:10px 16px;border-radius:8px;text-decoration:none">Open your invite</a></p>
  <p style="font-size:12px;color:#888;margin-top:24px">If the button doesn't work, paste this into your browser:<br>${inviteUrl}</p>
</body></html>`;
  return { subject, text, html };
}
