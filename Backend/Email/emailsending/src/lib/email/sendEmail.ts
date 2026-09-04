import { transporter } from "./transporter";
import { templates, TemplateName } from "./templates";

interface SendEmailParams {
  to: string | string[];
  subject: string;
  template: TemplateName;
  data?: Record<string, any>;
}

/**
 * Usage:
 *   await SendEmail({
 *     to: "user@example.com",
 *     subject: "Welcome!",
 *     template: "welcome",
 *     data: { name: "Aditya" },
 *   });
 */
export async function SendEmail({ to, subject, template, data = {} }: SendEmailParams) {
  const buildTemplate = templates[template];

  if (!buildTemplate) {
    throw new Error(
      `Email template "${template}" not found. Available: ${Object.keys(templates).join(", ")}`
    );
  }

  const html = buildTemplate(data);

  try {
    const info = await transporter.sendMail({
      from: process.env.SMTP_FROM || `"No Reply" <${process.env.SMTP_USER}>`,
      to,
      subject,
      html,
    });

    return { success: true as const, messageId: info.messageId };
  } catch (error) {
    console.error("SendEmail failed:", error);
    return { success: false as const, error };
  }
}
