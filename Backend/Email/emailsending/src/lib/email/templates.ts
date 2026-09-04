type TemplateFn = (data: Record<string, any>) => string;

// Shared layout wrapper so every email has consistent spacing/typography.
const wrapper = (content: string) => `
  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #1a1a1a; line-height: 1.5;">
    ${content}
  </div>
`;

export const templates = {
  welcome: (data: Record<string, any>) =>
    wrapper(`
      <h2>Welcome, ${data.name}!</h2>
      <p>We're glad to have you on board. Your account has been created successfully.</p>
    `),

  resetPassword: (data: Record<string, any>) =>
    wrapper(`
      <h2>Reset your password</h2>
      <p>Click the button below to reset your password. This link expires in ${
        data.expiresIn || "30 minutes"
      }.</p>
      <p>
        <a href="${data.link}" style="background:#111;color:#fff;padding:10px 18px;border-radius:6px;text-decoration:none;display:inline-block;">
          Reset Password
        </a>
      </p>
    `),

  otp: (data: Record<string, any>) =>
    wrapper(`
      <h2>Your verification code</h2>
      <p style="font-size: 28px; font-weight: bold; letter-spacing: 4px;">${data.code}</p>
      <p>This code expires in ${data.expiresIn || "10 minutes"}.</p>
    `),
} satisfies Record<string, TemplateFn>;

export type TemplateName = keyof typeof templates;
