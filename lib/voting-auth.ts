import crypto from "crypto";

export function hashVotingToken(token: string) {
  const secret = process.env.VOTING_TOKEN_SECRET;
  if (!secret) throw new Error("MISSING_VOTING_TOKEN_SECRET");
  return crypto.createHmac("sha256", secret).update(token).digest("hex");
}
