import { Resend } from "resend";

function getResendClient() {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    throw new Error("RESEND_API_KEY_MISSING");
  }

  return new Resend(apiKey);
}

export async function sendVotingReminder(input: {
  to: string;
  voterName: string;
  votingTitle: string;
  deadline: string;
  link: string;
}) {
  const mailFrom = process.env.MAIL_FROM;

  if (!mailFrom) {
    throw new Error("MAIL_FROM_MISSING");
  }

  const resend = getResendClient();

  return resend.emails.send({
    from: mailFrom,
    to: input.to,
    subject: `Przypomnienie: ${input.votingTitle}`,
    html: `
      <p>Dzień dobry ${input.voterName},</p>
      <p>To przypomnienie o głosowaniu: <strong>${input.votingTitle}</strong>.</p>
      <p>Termin: ${input.deadline}</p>
      <p><a href="${input.link}">Przejdź do głosowania</a></p>
    `,
  });
}