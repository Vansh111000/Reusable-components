import { SendEmail } from "@/src/lib/email";
import { NextRequest, NextResponse } from "next/server";


/* 
http://localhost:3000/api/practice-mail
Put json output like this 
{
  "to":"abc@gmail.com",
  "subject":"heyy",
  "template":"welcome", There are many templates in lib/email/templates.ts and you can add required 
  "data":"This is vansh"
}
*/

export async function POST(req: NextRequest) {
  const { to, subject, template, data } = await req.json();

  const result = await SendEmail({ to, subject, template, data });

  if (!result.success) {
    return NextResponse.json({ error: "Failed to send email" }, { status: 500 });
  }

  return NextResponse.json({ success: true, messageId: result.messageId });
}

/*
Example call from anywhere in your server code:

  import { SendEmail } from "@/lib/email";

  await SendEmail({
    to: "user@example.com",
    subject: "Reset your password",
    template: "resetPassword",
    data: { link: "https://myapp.com/reset?token=abc123", expiresIn: "15 minutes" },
  });
*/
