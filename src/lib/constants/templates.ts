// Default template placeholders
export const TEMPLATE_PLACEHOLDERS = [
  { key: "{{creator_name}}", description: "Creator's display name" },
  { key: "{{creator_handle}}", description: "Creator's Instagram/TikTok handle" },
  { key: "{{brand_name}}", description: "Your brand name" },
  { key: "{{product_name}}", description: "Product being promoted" },
  { key: "{{commission_rate}}", description: "Affiliate commission rate" },
  { key: "{{signup_link}}", description: "Affiliate signup link" },
  { key: "{{promo_code}}", description: "Creator's unique promo code" },
];

// Example templates for new brands
export const DEFAULT_TEMPLATES = {
  initial_dm: {
    name: "Initial DM",
    channel: "instagram_dm" as const,
    body: `Hey {{creator_name}}! 👋

I came across your content and love what you're doing! I'm from {{brand_name}} and think you'd be a perfect fit for our creator program.

We offer:
• Free products to feature
• {{commission_rate}} commission on sales
• Exclusive promo codes for your followers

Interested in learning more? 💫`,
  },
  follow_up_1: {
    name: "Follow-up #1 (3 days)",
    channel: "instagram_dm" as const,
    body: `Hey {{creator_name}}! Just following up on my message about the {{brand_name}} collab opportunity.

Would love to send you some free product and chat about a potential partnership! 🎁

Let me know if you're interested!`,
  },
  follow_up_2: {
    name: "Follow-up #2 (5 days)",
    channel: "instagram_dm" as const,
    body: `Hi {{creator_name}}! Last message from me, I promise! 😊

If you're ever open to collabs, we'd love to have you in our creator family. No pressure at all - just wanted to make sure you saw this!

Best,
{{brand_name}} Team`,
  },
  accepted: {
    name: "Accepted - Welcome",
    channel: "instagram_dm" as const,
    body: `Amazing, so excited to have you on board {{creator_name}}! 🎉

Here's what happens next:
1. We'll ship your product to you ASAP
2. You'll get your unique code: {{promo_code}}
3. You'll earn {{commission_rate}} on every sale!

Any questions, just message me here!`,
  },
};
