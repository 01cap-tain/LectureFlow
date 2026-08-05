export async function sendPasswordResetEmail({
  email,
  expiresInMinutes,
  resetUrl,
}) {
  if (!process.env.RESEND_API_KEY) {
    throw new Error("RESEND_API_KEY is not configured");
  }

  // Resend owns delivery; controller only decides when an email should be sent.
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: process.env.RESEND_FROM_EMAIL || "LectureFlow <onboarding@resend.dev>",
      to: email,
      subject: "Reset your LectureFlow password",
      html: `
        <p>You requested a LectureFlow password reset.</p>
        <p><a href="${resetUrl}">Reset your password</a></p>
        <p>This link expires in ${expiresInMinutes} minutes.</p>
      `,
      text: `Reset your LectureFlow password: ${resetUrl}\n\nThis link expires in ${expiresInMinutes} minutes.`,
    }),
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`Resend failed: ${response.status} ${details}`);
  }
}
