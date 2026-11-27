# Account emails (sign-up, password reset, …)

Supabase Auth sends Arriv's account emails. The templates live in `supabase/templates/`
and are used automatically by the local stack (`supabase/config.toml`). The hosted
project needs two one-off setups in the dashboard. Previews: `docs/design/email-previews/`.

## 1. Send from arrivsocial.com (custom SMTP)

Supabase's built-in sender only sends a few emails an hour and uses Supabase's address.
Use a provider instead (Resend recommended; Postmark or Amazon SES work the same way).

1. Resend: Domains → Add `arrivsocial.com` (Sydney region if offered).
2. Namecheap → Advanced DNS: add the records Resend shows (DKIM TXT, plus MX and SPF TXT
   on the `send` subdomain; they don't affect `hello@` forwarding). Recommended extra:
   TXT `_dmarc` = `v=DMARC1; p=none; rua=mailto:hello@arrivsocial.com`. Then Verify.
3. Resend: API Keys → Create (sending access only). Keep it secret.
4. Supabase dashboard → Authentication → Emails → SMTP Settings → enable custom SMTP:

   | Field | Value |
   |---|---|
   | Host | `smtp.resend.com` |
   | Port | `465` |
   | Username | `resend` |
   | Password | the Resend API key |
   | Sender email | `no-reply@arrivsocial.com` |
   | Sender name | `Arriv` |

5. Authentication → Rate Limits → raise "emails sent per hour" (e.g. 100).

## 2. Arriv-styled templates

Dashboard → Authentication → Emails → Templates. For each one, set the subject and paste
the whole HTML file as the body:

| Template | Subject | File |
|---|---|---|
| Confirm sign up | Confirm your email for Arriv | `supabase/templates/confirmation.html` |
| Reset password | Reset your Arriv password | `supabase/templates/recovery.html` |
| Magic link | Your Arriv sign-in link | `supabase/templates/magic_link.html` |
| Change email address | Confirm your new email for Arriv | `supabase/templates/email_change.html` |
| Invite user | You're invited to Arriv | `supabase/templates/invite.html` |
| Reauthentication | Your Arriv verification code | `supabase/templates/reauthentication.html` |

Security notification (Emails → Security notifications → Password changed): turn it on,
subject "Your Arriv password was changed", body `supabase/templates/password_changed_notification.html`.

Don't use `supabase config push` for this: it would also push local-only settings
(such as `localhost` redirect URLs) to the hosted project.

When a template changes, update the file here first, then paste it again in the dashboard.
