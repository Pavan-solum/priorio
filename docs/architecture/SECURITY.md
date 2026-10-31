# Security Model

## Current preview

The preview stores example workspace state in the browser's local storage and does not request credentials or connect to providers. Local storage is not suitable for secrets. Do not enter real private messages or credentials into the preview.

## Backend requirements before real accounts

- Use short-lived access credentials and revocable refresh sessions; apply rate limits and secure cookie settings.
- Encrypt provider refresh tokens server-side using a managed key and rotate keys without exposing plaintext to clients.
- Authorize every record access against authenticated user and workspace membership.
- Validate all inputs and provider webhook signatures; use CSRF protection for cookie-authenticated mutations.
- Treat messages, documents, and retrieved text as untrusted data. Keep them outside system instructions and defend tool selection against prompt injection.
- Require explicit approval for every externally visible or destructive action.
- Audit connection, disconnection, approval, deletion, and data export actions without copying sensitive content into logs.
- Provide account export/deletion and retention controls, including embeddings and queued jobs.

## WhatsApp boundary

Personal WhatsApp support is limited to eligible Android notification previews after the user explicitly enables Android notification access and Priorio capture. Preview visibility depends on the device's notification settings. No iOS notification listener, WhatsApp Web scraping, session-cookie access, unofficial private API, or full chat-history access is supported.

OAuth provider review, production key management, penetration testing, and privacy/legal review remain required before production deployment.