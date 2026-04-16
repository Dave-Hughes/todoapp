import { describe, it, expect } from "vitest";
import { renderInviteEmail } from "./invite-email";

describe("renderInviteEmail", () => {
  it("includes the organizer's name and the invite URL", () => {
    const { subject, text, html } = renderInviteEmail({
      organizerName: "Dave",
      inviteUrl: "https://example.com/invite/abc",
    });
    expect(subject).toContain("Dave");
    expect(text).toContain("Dave");
    expect(text).toContain("https://example.com/invite/abc");
    expect(html).toContain("Dave");
    expect(html).toContain("https://example.com/invite/abc");
  });
  it("produces HTML that escapes the organizer name", () => {
    const { html } = renderInviteEmail({
      organizerName: "<Dave>",
      inviteUrl: "https://example.com/invite/abc",
    });
    expect(html).not.toContain("<Dave>");
    expect(html).toContain("&lt;Dave&gt;");
  });
});
