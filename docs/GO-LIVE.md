# Go live on heirloomfilms.in

The two things that have to happen at Hostinger, in order, and what changes here afterwards.

Everything I could do from this side is done: the domain is attached to the Vercel project and
verified, and the GitHub integration is reconnected. **What is left needs your Hostinger DNS panel
and one provider account.**

> **Read the warning in §1 first.** The domain already carries live email, and one careless record
> takes it down.

---

## What is already true

| | |
|---|---|
| Domain attached to the Vercel project | ✅ `heirloomfilms.in` → project `heirloomfilms` |
| Ownership verified | ✅ same Vercel scope |
| GitHub integration | ✅ reconnected — push-to-deploy works again now the repo is public |
| Tenancy mode | ✅ `path` — needs **one** record, not a wildcard |

**Path mode is the right choice and it is not just about effort.** Subdomain mode
(`aanya.heirloomfilms.in`) needs a wildcard, and Vercel requires the domain's **nameservers** to
point at them for that. Your domain currently runs Hostinger's nameservers and carries **live MX
records** — handing the nameservers to Vercel moves all DNS, including mail, and is how a domain's
email goes dark for a day. Path mode changes two A records and touches nothing else.

---

## 1. The DNS you have now

```
A     @    2.57.91.91                                    ← Hostinger parking
MX    @    5  mx1.hostinger.com
MX    @    10 mx2.hostinger.com
TXT   @    v=spf1 include:_spf.mail.hostinger.com ~all
NS         helios.dns-parking.com / aster.dns-parking.com
```

> **Do not delete the MX records, and do not add a second SPF record.**
>
> Two SPF records on one domain is a `permerror` under the spec, and mail silently starts failing
> — it is the most common way a first email setup breaks. There is exactly **one** SPF TXT record
> on a domain, ever. When you add a sending provider you *edit* the existing one.

---

## 2. Point the domain at Vercel

In **Hostinger → Domains → DNS / Nameservers**:

**Delete** the existing `A @ 2.57.91.91`, then **add two**:

| Type | Name | Value | TTL |
|---|---|---|---|
| A | `@` | `216.198.79.1` | default |
| A | `@` | `64.29.17.1` | default |

Optionally, so `www` works:

| Type | Name | Value |
|---|---|---|
| CNAME | `www` | `cname.vercel-dns.com` |

**Leave MX, TXT and NS exactly as they are.** A records and MX records are independent — changing
where the website points does not touch where mail goes.

Propagation is usually minutes. Check with:

```bash
dig +short heirloomfilms.in A
```

You want `216.198.79.1` and `64.29.17.1` back.

---

## 3. Email — pick a provider and verify the domain

Supabase's built-in sender allows a few messages an hour and is meant for development. Hitting it
returns `over_email_send_rate_limit`, which is what killed the first live registration attempt.

**Recommended: [Resend](https://resend.com)** — simplest setup, generous free tier, good
deliverability. Amazon SES is cheaper at volume and considerably more work.

1. Create the account, add `heirloomfilms.in` as a domain.
2. It will give you **DKIM** records (usually CNAMEs, sometimes a TXT) and ask you to extend SPF.
3. Add the DKIM records at Hostinger exactly as given.
4. **Edit** the existing SPF record — do not add a new one:

   ```
   v=spf1 include:_spf.mail.hostinger.com include:_spf.resend.com ~all
   ```

   Hostinger's include stays first so your existing mail keeps working.

5. Add a DMARC record, which nothing has yet:

   ```
   Type: TXT   Name: _dmarc   Value: v=DMARC1; p=none; rua=mailto:you@heirloomfilms.in
   ```

   `p=none` **monitors without rejecting** — start here. Tighten to `quarantine` only once you can
   see in the reports that everything legitimate is passing.

6. Wait for the provider to show the domain verified.

### Then wire it into Supabase

**Supabase → Project Settings → Authentication → SMTP Settings**, and paste the host, port,
username and password the provider gives you.

Two settings on the same screen that matter:

- **Sender address** — use something a couple will trust, e.g. `hello@heirloomfilms.in`. Not
  `noreply@`: this email asks somebody to set a password for their own wedding, and `noreply`
  reads like a phishing attempt.
- **Site URL** — set it to `https://heirloomfilms.in`. Left at its default, a partner confirms
  their account and lands somewhere that is not this deployment.

---

## 4. Then tell me, and I will do the rest

Once `dig +short heirloomfilms.in A` returns the Vercel addresses, **two things must change
together** or films silently stop appearing:

1. **`ROOT_DOMAIN` on Vercel** → `heirloomfilms.in`, then redeploy. Until this changes, every link
   the app generates — the public catalogue address, the handover link, share links, the OG card —
   still points at `marquee-film-pub.vercel.app`.
2. **The Bunny library's `WebhookUrl`** → `https://heirloomfilms.in/api/webhooks/bunny`.

> **The webhook is the one that fails quietly.** If it keeps pointing at the old URL, uploads still
> succeed, transcoding still finishes, and titles simply never leave `processing` — because the
> notification arrives somewhere that is no longer serving. The nightly reconcile job would
> eventually settle them, hours late. Change it in the same sitting.
>
> It must point at the **stable domain**, never at a `heirloomfilms-<hash>.vercel.app` URL. A
> per-deployment URL keeps answering after the next deploy, from the *old* build, so the failure is
> a webhook that looks healthy while running superseded code.

I will also re-run `pnpm preflight` and check a real playback end to end once it is switched.

---

## 5. Verifying it actually worked

```bash
curl -s https://heirloomfilms.in/api/health
```

Expect `"drivers":{"data":"supabase","video":"bunny"}` and a `version` matching the deployed
commit.

Then, in order, because each catches something different:

1. **Sign in** at `https://heirloomfilms.in/admin`.
2. **Open a catalogue's public link** from the console and check the address now reads
   `heirloomfilms.in/c/<slug>`.
3. **Upload one short film** and watch it reach `ready` on its own — that is the only real proof
   the webhook is pointed correctly.
4. **Register a test partner** at `/admin/register` and confirm the email arrives, from the right
   sender, not in spam.

Step 4 is the one that proves N-17. Everything else can pass with email still broken.

---

## What this unblocks

| | |
|---|---|
| **N-11** | The domain |
| **N-17** | SMTP — and with it registration and password reset |
| **N-21** | The migration email at handover |
| **N-24** | Renewal, which needs expiry warnings, which need email |

`PRODUCT.md` §7 lists SMTP as blocking more than anything else on the list. This is that.
