# Security patch bundle

This patch set prepares the repository for a safer GitHub push.

## Included changes
- disabled `/api/setup-admin`
- unified admin password verification on `bcrypt`
- removed hardcoded admin credentials from UI and seed
- added stricter env validation
- added session signature verification in middleware
- added login input validation and simple rate limiting
- added safer submit/draft validation and status checks
- added `.gitignore`
- added CLI bootstrap script for admin creation
- pinned package versions

## Before pushing to GitHub
1. Delete the real `.env` file from git history if it was committed.
2. Rotate all exposed secrets, especially:
   - `DATABASE_URL`
   - `ADMIN_SESSION_SECRET`
   - `VOTING_TOKEN_SECRET`
   - `RESEND_API_KEY`
3. Install dependencies again because `package.json` changed.
4. Rebuild the lockfile with `npm install`.

## Important limitation still present
The reminder endpoint still builds a link from `publicId` because the project archive does not include the session/token issuance flow required to safely re-send the original token. That part should be fixed in the code path that creates voting sessions by storing a re-sendable encrypted token or by implementing one-time reminder tokens.
