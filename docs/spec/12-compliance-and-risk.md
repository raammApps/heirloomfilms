# 12 — Compliance & Risk

Not legal advice — this is a briefing document for the conversation with an actual lawyer,
and a set of engineering constraints derived from it.

## 1. Intellectual property — where the line actually sits

The streaming-service aesthetic **is** the product. This section exists to protect it, not to
water it down. The important thing is that "Netflix-style design" and "Netflix's trademarks"
are two different exposures with very different risk profiles, and earlier drafts of this
document wrongly treated them as one.

### The risk gradient

| What | Legal theory | Real-world risk | Decision |
|---|---|---|---|
| Dark UI, red accent, poster rows, profile gate, hero + scrim, episode framing | Trade dress | **Low.** Trade dress requires the look to identify a *source* and cause confusion. Nobody encountering a site headed "Aanya & Vikram" with the couple's photographs believes they are on a video-streaming service. These are also industry-wide conventions — Disney+, Prime Video, JioHotstar, Apple TV+ and a hundred dashboards use the same grammar. | **Build it, at full fidelity.** |
| Netflix-themed content as a personal-event genre | — | **Low.** "Netflix inspired wedding video" is an established, openly commercial Etsy category that has coexisted with Netflix for years. The genre is not being policed. | Fine. |
| A `-flix` product name (`FlixInvite`, `SharmaFlix`) | Trademark | **Moderate-to-high.** This is where enforcement actually concentrates. Netflix polices marks in the `-flix` family, and a name is the one thing a lawyer can act on cleanly without arguing about confusion. | **Avoid.** |
| Netflix logotype, the N mark, or a stylised imitation | Trademark | **High.** Direct mark reproduction. | **Never.** |
| Exactly `#E50914` | Weak alone, but quotable | **Low on its own**, but it is the single most cited "pixel-for-pixel" exhibit and costs nothing to change. | Use `#d11a2a`. |
| Theme packs branded as Prime Video / Spotify Wrapped / Disney+ | Trademark, multiplied | **High**, and it multiplies counterparties. | **Cancelled.** |

**The practical read:** the visual experience Sandeep wants is the low-risk part. The name is
the high-risk part, and the name contributes nothing to a guest's reaction. Trading the
suffix for a different word costs zero experience and removes most of the exposure. That is
the whole trade, and it is a good one.

Two commercial notes that are not legal risk but are real:

- A wedding-management company reselling this under **their own** brand cannot have a third
  party's brand on it anyway — white-label and `-flix` are structurally incompatible.
- The risk that does exist is **inversely correlated with failure**: it only becomes visible
  if the product works. Plan for the version that succeeds.

### Engineering rules (enforced in review)

1. **Build the streaming design at full fidelity.** Red on black, poster rows, profile gate,
   episode framing, title-detail modal. Do not hedge these. See `04 §1b`.
2. No `-flix` in any name: product, package, repo, domain, class, comment, or user-facing copy.
3. Per-couple app naming uses a non-suffix construction — `SharmaStream`, `Sharma Originals`,
   `The Sharma Files` — not `SharmaFlix`. Same joke, same delight, different word.
4. `--accent: #d11a2a`, never `#E50914`.
5. Our own wordmark. No reproduction or stylised imitation of any company's logotype, N-mark,
   or icon set. No "loading" animation copied frame-for-frame from an identifiable product.
6. No theme packs named for or imitating identifiable commercial products.
7. Generated motifs are parametric originals — never traced, embedded, or lifted.
8. Don't put the word "Netflix" in marketing copy, the repo, or a planner deck. Describe it —
   "cinematic", "streaming-style", "your wedding as a prestige series". Using a competitor's
   mark to describe your own commercial product is the avoidable version of this problem.

### Our own marks

Before public launch: trademark search on the Indian registry (classes 42 and 45) plus a
domain check for "Heirloom Films"; it is a common Hindi/Urdu word, so expect crowding and be ready
to change. Do not print the name on planner collateral until this clears.

Fonts: verify licences for commercial embedding. Fraunces and Inter are SIL OFL — fine.
Check every additional face before shipping.

Images: for the demo tenant, use licensed stock or images you own with a written model
release, or generated imagery. Do not scrape a real couple's wedding photos for the demo,
however tempting — it is both an IP and a personality-rights problem.

## 2. Data protection — DPDP Act 2023 and DPDP Rules 2025

**We deliberately hold almost no guest personal data.** Viewer profiles are fixed labels
("Bride's side"), not names; there is no guest login, email or phone anywhere in the product
(doc 06 §5). That design choice removes the highest-traffic path from most of DPDP's scope
and is worth defending against any future feature request that would undo it.

What we *do* hold: operator accounts (name, work email), couple billing details from month 4,
and — most significantly — **the couple's wedding films and photographs**, which are personal
data of everyone appearing in them.

The DPDP Rules were notified in November 2025, starting a phased rollout with full
compliance required by **13 May 2027**. Consent-manager registration comes around November
2026. Complaints can already be filed. There is no revenue threshold that exempts a small
business from the core obligations.

### Obligations that map to build work

| Obligation | Implementation | Ticket |
|---|---|---|
| Itemised, purpose-specific consent notice | Almost none is needed guest-side: profiles are labels, not people (doc 06 §5). Notice is required for operator accounts and for the couple's billing details. | P1-12 |
| Available in English and Hindi | Notice text goes through the i18n dictionary | P1-12 |
| Purpose limitation | Guest data used only for this wedding. No cross-wedding analytics, no marketing, no resale — state it and mean it. | Contract + code review |
| Data minimisation | Guests are never asked for a name, phone or email. Do not add guest identity to the viewer side — it would move the highest-traffic path into scope. | P1-02 |
| Retention limit | Subscription lifecycle in doc 01 §7 governs content. Operator and billing data purged 12 months after an org closes. | P1-02 |
| Security safeguards | RLS, encryption in transit and at rest, access logging, no personal data in client-side error reports | P1-01, P1-03 |
| Grievance mechanism, ≤90-day resolution | Published contact on the privacy notice; a real monitored inbox | P1-12 |
| Data-principal rights (access, correction, erasure) | Documented manual process in Phase 1. Not a public endpoint — that endpoint is an attacker's tool. | P1-12 |
| Breach notification | Written incident runbook: who is called, in what order, within what window | Pre-launch |

### Controller / processor

The couple (or the planner acting for them) is the **Data Fiduciary**; we are a **Data
Processor** acting on documented instructions. This must be papered in the partner contract,
because it determines who answers a guest's erasure request. Get it wrong and we are a
fiduciary by default, with materially heavier obligations.

### Children's data

DPDP has strict rules on children's data. Wedding films contain children — that is
unavoidable and is the couple's content, lawfully processed on their instruction. What we
must not do is add anything that *identifies* a viewer or subject as a minor: no ages, no
dates of birth, no "kids" category, no face recognition or auto-tagging. Ever. Face
detection on wedding footage is a feature someone will eventually suggest; the answer is no.

### Content rights — specific to video

| Question | Position |
|---|---|
| Who owns the films? | The couple, or the videographer per their contract. Not us, not the planner. |
| What licence do we need? | A narrow one: to store, transcode and deliver the content for the purpose of running the catalogue. Nothing more. |
| Can we use a clip in marketing? | **Only with written, specific permission** from the couple — not the planner. Ask for it explicitly and accept a no. Never assume it via terms of service. |
| Music in the films | The videographer's problem contractually, but a takedown lands on us. Note in the partner contract that they warrant they have the rights, and that we will act on a credible complaint. |
| Takedown request | A documented process with a named human. A wedding video dispute (a separation, a family fallout) will happen, and it needs an answer that is not improvised. |
| Deletion on request | The couple can demand deletion at any time; honour it within 30 days and confirm in writing. |

The scenario to have an answer ready for: a couple separates and one of them asks for the
catalogue to come down while the other wants it up. Decide the policy now, in writing, not
during the phone call.

## 3. Communications — WhatsApp and SMS

The original plan included automated WhatsApp invites and reminders. Constraints:

- Automated business messaging on WhatsApp requires the **WhatsApp Business Platform (Cloud
  API)** with an approved business, registered number, and pre-approved message templates.
  You cannot programmatically message people from a personal or Business-app number at scale,
  and doing so via unofficial libraries risks the number being banned mid-wedding-season.
- Sending to people who have not opted in to *us* is a consent problem under DPDP as well as
  a platform-policy one.
- SMS to Indian numbers requires TRAI DLT registration of sender ID and templates.

**Therefore:** Phase 1 and 2 generate `wa.me` deep links that the family or planner sends
manually from their own number. This is better anyway — an invite from an actual family
member gets opened; one from an unknown business number does not. Revisit the Cloud API only
if a partner asks and will fund the onboarding.

## 4. Payments and tax

We take no guest money. Registry and Shagun links point at the couple's own UPI or a
third-party service, and we never touch the funds — handling them would drag in RBI payment
aggregator rules and settlement obligations for negligible revenue. This is why "registry
with a small transaction fee" from the original business case is cancelled.

For B2B invoicing to planners: register for GST if turnover crosses the threshold or if
supplying inter-state services; SaaS/website services attract GST at the standard rate;
issue proper tax invoices from the first rupee. Talk to a CA before the first invoice, not
at year end.

## 5. Employment IP

You are employed as a software architect. Employment agreements commonly assign inventions
and works created during employment, sometimes broadly enough to reach outside work,
particularly where there is any subject-matter overlap or use of employer time or equipment.

**Action, before the first pitch meeting:** have an employment lawyer read the IP-assignment
and moonlighting clauses in your contract and give you a written view. Build only on personal
hardware, on personal accounts, outside work hours. Keep the boundary clean and documented.

This is the risk most likely to be ignored and most damaging if it lands, because it arrives
after there is something worth taking.

## 6. Operational risk

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Site down on a wedding day | Low | Catastrophic — ends the partner relationship | Static ISR, no runtime deps on the critical path, rollback one click away, phone reachable on the day |
| Wrong venue or time in config | Medium | Severe | Pre-wedding runbook §6 requires cross-check against the planner's sheet, signed off by the planner |
| Guest data leak across tenants | Low | Business-ending | RLS, no guest-list endpoint, mandatory isolation question on every data PR |
| Dashboard token forwarded publicly | High | Moderate | Assume it will be; no phone numbers on screen, rotatable token, access log |
| Planner asks for a feature mid-season | High | Moderate | Per-wedding pricing means scope is per wedding; say no and schedule it |
| Copycat once the format is public | High | Moderate | Accept it. The defensibility is operational reliability and the planner relationship, not the visual idea. |
| Season concentration (Nov–Jan) | Certain | Structural | Known and accepted. Do not solve it by building anniversary/birthday products before the wedding product has paying users. |
| Founder bandwidth | High | High | See §7 |

## 7. The risk this document cannot engineer around

This product competes for the same 5–20 hours a week as an already-committed consulting
practice, in overlapping months. Both cannot have the Sep–Oct window.

That is a scheduling decision, not a technical one, and it belongs to Sandeep — but it should
be made explicitly and written down, because the failure mode is not choosing: both efforts
get half the hours, the demo is late for the season, and the consulting sprint misses its
first-invoice target.

If this proceeds, the honest scope is **Phase 0 only** — roughly 50 hours to a demo and five
pitch meetings — with Phase 1 conditional on a signed pilot. If no planner commits by end of
September, the wedding season is gone and the correct action is to stop, not to build Phase 1
in hope.

---

### Sources for the regulatory summary

- Digital Personal Data Protection Rules, 2025 — notified November 2025; phased compliance to 13 May 2027
- Netflix trade-dress enforcement precedent — Stranger Things pop-up bar cease-and-desist, 2017
- Indian wedding-website market price points — see doc 11 §1

Verify all of the above with counsel before launch; regulation moves faster than this document.
