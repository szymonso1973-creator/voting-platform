import { Resend } from "resend";
const resend = new Resend(process.env.RESEND_API_KEY);
export async function sendVotingReminder(input: { to: string; voterName: string; votingTitle: string; deadline: string; link: string; }) {
  return resend.emails.send({
    from: process.env.MAIL_FROM!,
    to: input.to,
    subject: `Przypomnienie: ${input.votingTitle}`,
    html: `<p>Dzień dobry ${input.voterName},</p><p>To przypomnienie o głosowaniu: <strong>${input.votingTitle}</strong>.</p><p>Termin: ${input.deadline}</p><p><a href="${input.link}">Przejdź do głosowania</a></p>`
  });
}
