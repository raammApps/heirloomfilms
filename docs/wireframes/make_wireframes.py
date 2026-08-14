#!/usr/bin/env python3
"""Generate annotated SVG wireframes for Heirloom Films.

Pure-stdlib. Writes one .svg per screen into ../wireframes/.
Style: greyscale, low-fidelity, numbered callouts in a right-hand annotation column.
"""
import os, html

OUT = os.path.join(os.path.dirname(__file__), "..", "wireframes")
os.makedirs(OUT, exist_ok=True)

INK, LINE, MUTE, FILL, IMG = "#14161a", "#9aa1ab", "#c9ced6", "#f4f5f7", "#e3e6ea"
ACC = "#d11a2a"


class SVG:
    def __init__(self, w, h, title):
        self.w, self.h, self.title, self.p = w, h, title, []
        self.notes = []

    def add(self, s):
        self.p.append(s)

    def rect(self, x, y, w, h, fill="none", stroke=LINE, sw=1.2, rx=0, dash=None, op=1):
        d = f' stroke-dasharray="{dash}"' if dash else ""
        self.add(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{rx}" fill="{fill}" '
                 f'stroke="{stroke}" stroke-width="{sw}" opacity="{op}"{d}/>')

    def text(self, x, y, s, size=11, fill=INK, anchor="start", weight=400, family="Inter, Helvetica, Arial, sans-serif", ls=0):
        self.add(f'<text x="{x}" y="{y}" font-family="{family}" font-size="{size}" '
                 f'font-weight="{weight}" fill="{fill}" text-anchor="{anchor}" letter-spacing="{ls}">'
                 f'{html.escape(s)}</text>')

    def line(self, x1, y1, x2, y2, stroke=LINE, sw=1.2, dash=None):
        d = f' stroke-dasharray="{dash}"' if dash else ""
        self.add(f'<line x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}" stroke="{stroke}" stroke-width="{sw}"{d}/>')

    def circle(self, cx, cy, r, fill="none", stroke=LINE, sw=1.2):
        self.add(f'<circle cx="{cx}" cy="{cy}" r="{r}" fill="{fill}" stroke="{stroke}" stroke-width="{sw}"/>')

    def img(self, x, y, w, h, label="", rx=6):
        """Image placeholder: box with an X."""
        self.rect(x, y, w, h, fill=IMG, stroke=MUTE, rx=rx)
        self.line(x, y + h, x + w, y, stroke=MUTE, sw=0.8)
        self.line(x, y, x + w, y + h, stroke=MUTE, sw=0.8)
        if label:
            self.text(x + w / 2, y + h / 2 + 4, label, size=9, fill="#6b7280", anchor="middle")

    def copy(self, x, y, w, lines=2, lh=9, widths=None):
        """Grey bars standing in for body copy."""
        widths = widths or [1.0, 0.82, 0.6, 0.9]
        for i in range(lines):
            self.rect(x, y + i * lh, w * widths[i % len(widths)], 4, fill=MUTE, stroke="none", rx=2)

    def btn(self, x, y, w, h, label, filled=False):
        self.rect(x, y, w, h, fill=(ACC if filled else "none"), stroke=(ACC if filled else INK), rx=h / 2, sw=1.3)
        self.text(x + w / 2, y + h / 2 + 3.5, label, size=9.5, fill=("#fff" if filled else INK), anchor="middle", weight=600)

    def callout(self, x, y, n):
        self.circle(x, y, 9, fill="#fff", stroke=ACC, sw=1.4)
        self.text(x, y + 3.5, str(n), size=10, fill=ACC, anchor="middle", weight=700)

    def note(self, n, text):
        self.notes.append((n, text))

    def phone(self, x, y, w, h):
        self.rect(x - 8, y - 30, w + 16, h + 46, fill="#fff", stroke=INK, sw=1.6, rx=26)
        self.rect(x + w / 2 - 26, y - 22, 52, 8, fill=INK, stroke="none", rx=4)
        self.rect(x, y, w, h, fill="#fff", stroke="none")

    def render(self, path, subtitle=""):
        head = (f'<svg xmlns="http://www.w3.org/2000/svg" width="{self.w}" height="{self.h}" '
                f'viewBox="0 0 {self.w} {self.h}" font-family="Inter, Helvetica, Arial, sans-serif">'
                f'<rect width="{self.w}" height="{self.h}" fill="#ffffff"/>')
        # title block
        t = [f'<text x="40" y="46" font-size="19" font-weight="700" fill="{INK}">{html.escape(self.title)}</text>']
        if subtitle:
            t.append(f'<text x="40" y="66" font-size="11.5" fill="#6b7280">{html.escape(subtitle)}</text>')
        t.append(f'<line x1="40" y1="84" x2="{self.w-40}" y2="84" stroke="{LINE}" stroke-width="1"/>')
        # notes column
        ny = 120
        nx = self.w - 340
        body = list(self.p)
        for n, txt in self.notes:
            body.append(f'<circle cx="{nx+9}" cy="{ny-4}" r="9" fill="#fff" stroke="{ACC}" stroke-width="1.4"/>')
            body.append(f'<text x="{nx+9}" y="{ny-0.5}" font-size="10" font-weight="700" fill="{ACC}" text-anchor="middle">{n}</text>')
            wrapped, cur = [], ""
            for word in txt.split():
                if len(cur) + len(word) > 46:
                    wrapped.append(cur); cur = word
                else:
                    cur = (cur + " " + word).strip()
            wrapped.append(cur)
            for i, ln in enumerate(wrapped):
                body.append(f'<text x="{nx+26}" y="{ny + i*14}" font-size="11" fill="{INK}">{html.escape(ln)}</text>')
            ny += len(wrapped) * 14 + 16
        with open(os.path.join(OUT, path), "w") as f:
            f.write(head + "".join(t) + "".join(body) + "</svg>")
        print("wrote", path)


# ── 01 Profile gate (mobile) ────────────────────────────────────────────────
s = SVG(940, 900, "01 · Profile gate — mobile 360×800")
X, Y, W, H = 60, 150, 300, 660
s.phone(X, Y, W, H); s.rect(X, Y, W, H, fill="#f7f7f8", stroke="none")
s.text(X + W/2, Y + 130, "AANYAVIKRAMSTREAM", size=13, anchor="middle", weight=700, ls=3, fill=ACC)
s.text(X + W/2, Y + 172, "Who's watching?", size=15, anchor="middle", weight=600)
for i, lb in enumerate(["Bride's side", "Groom's side", "Friends", "Family"]):
    cx = X + 82 + (i % 2) * 136; cy = Y + 240 + (i // 2) * 152
    s.rect(cx - 42, cy - 42, 84, 84, fill=IMG, stroke=MUTE, rx=8)
    s.text(cx, cy + 12, lb[0], size=30, anchor="middle", weight=700, fill="#8b9099")
    s.text(cx, cy + 64, lb, size=9.5, anchor="middle")
s.text(X + W/2, Y + 596, "Skip →", size=10, anchor="middle", fill="#6b7280")
for n,(cx,cy) in zip([1,2,3],[(X+W+22,Y+130),(X+W+22,Y+240),(X+W+22,Y+596)]): s.callout(cx,cy,n)
s.note(1, "Per-couple app name (catalogue.app_name). Large, tracked out, animates in over ~600ms with a scale settle before tiles appear. That beat sells the reference.")
s.note(2, "Four FIXED labels, letter tiles, generated colours. Never a free-text personal name — this keeps the whole viewer side free of personal data. Tap target ≥84px.")
s.note(3, "Always skippable, remembered in localStorage. Drives Continue Watching and My List. Never gates content.")
s.note("!", "Creates a profiles row server-side; the client keeps only the opaque id.")
s.render("01-profile-gate-mobile.svg", "First visit · sets the profile for Continue Watching")

# ── 02 Browse (mobile) ──────────────────────────────────────────────────────
s = SVG(1000, 1060, "02 · Browse — mobile 360×800")
X, Y, W, H = 60, 150, 300, 840
s.phone(X, Y, W, H)
s.rect(X, Y, W, 40, fill="#fff", stroke="none")
s.rect(X + 14, Y + 13, 58, 13, fill=MUTE, stroke="none", rx=3)
s.text(X + W - 78, Y + 25, "Search", size=8.5, fill="#4b5563")
s.rect(X + W - 40, Y + 11, 22, 18, fill=IMG, stroke=MUTE, rx=4)
s.line(X, Y + 40, X + W, Y + 40)
s.img(X, Y + 40, W, 290, "billboard · muted autoplay trailer", rx=0)
s.rect(X, Y + 200, W, 130, fill="#000", stroke="none", op=0.07)
s.text(X + 16, Y + 246, "FIRST LOOK", size=17, weight=700)
s.text(X + 16, Y + 264, "Highlights · 4 min · New", size=8, fill="#4b5563")
s.copy(X + 16, Y + 276, W - 32, lines=2)
s.btn(X + 16, Y + 298, 96, 26, "▶  Play", filled=True)
s.btn(X + 120, Y + 298, 96, 26, "ⓘ  More Info")
ry = Y + 356
rows = [("Continue Watching", True), ("Trending Now", False), ("The Ceremony", False)]
for title, prog in rows:
    s.text(X + 14, ry, title, size=10.5, weight=700)
    for i in range(2):
        cx = X + 14 + i * 120
        s.img(cx, ry + 10, 110, 148, "", rx=6)
        if prog:
            s.rect(cx + 6, ry + 148, 98, 3, fill=MUTE, stroke="none", rx=2)
            s.rect(cx + 6, ry + 148, 58, 3, fill=ACC, stroke="none", rx=2)
        s.rect(cx + 72, ry + 16, 32, 12, fill="#000", stroke="none", rx=3, op=.55)
        s.text(cx + 88, ry + 25, "12:04", size=6, anchor="middle", fill="#fff")
    s.rect(X + 14 + 2 * 120, ry + 10, 32, 148, fill=IMG, stroke=MUTE, rx=6)
    ry += 186
for n,(cy) in zip([1,2,3,4],[Y+25,Y+246,Y+356,Y+420]): s.callout(X+W+22, cy, n)
s.note(1, "No hamburger. Logo, search, profile avatar. Sticky, transparent over the billboard, solid on scroll.")
s.note(2, "Billboard: poster still paints instantly, trailer fades in only once it can play through. Exactly two buttons. Play goes to /watch — never inline.")
s.note(3, "Continue Watching sits ABOVE every genre row. A returning guest's only intent is to resume.")
s.note(4, "Progress bar in accent on partially-watched cards. Duration badge top-right. Peeking third card is the scroll affordance.")
s.note("!", "Trending hides until ≥50 plays; New hides on a catalogue younger than 14 days. An empty or all-inclusive row reads as broken software.")
s.note("!", "Rows are registry-driven (doc 14). This page contains no switch on module type.")
s.render("02-browse-mobile.svg", "Module-driven · every row comes from catalogue.modules")

# ── 03 Title modal (mobile) ─────────────────────────────────────────────────
s = SVG(960, 880, "03 · Title detail modal — mobile")
X, Y, W, H = 60, 150, 300, 660
s.phone(X, Y, W, H); s.rect(X, Y, W, H, fill="#e9eaec", stroke="none")
mx, my, mw, mh = X + 10, Y + 56, W - 20, H - 86
s.rect(mx, my, mw, mh, fill="#fff", stroke=INK, rx=14, sw=1.5)
s.img(mx, my, mw, 158, "poster / preview", rx=14)
s.circle(mx + mw - 20, my + 20, 11, fill="#fff", stroke=INK); s.text(mx + mw - 20, my + 24, "×", size=13, anchor="middle")
s.text(mx + 14, my + 186, "The Sangeet Film", size=15, weight=700)
s.text(mx + 14, my + 204, "21:24  ·  Sangeet  ·  13 Nov 2026", size=8, fill="#4b5563")
s.btn(mx + 14, my + 216, 106, 30, "▶  Play", filled=True)
s.btn(mx + 128, my + 216, 106, 30, "+  My List")
s.copy(mx + 14, my + 264, mw - 28, lines=4)
s.line(mx + 14, my + 316, mx + mw - 14, my + 316, stroke=MUTE)
s.text(mx + 14, my + 336, "Credits", size=9.5, weight=700)
s.text(mx + 14, my + 352, "Cinematography · Studio Name", size=8, fill="#4b5563")
s.text(mx + 14, my + 366, "Edit · Name", size=8, fill="#4b5563")
for n,(cy) in zip([1,2,3],[my+20,my+216,my+186]): s.callout(mx + mw + 24, cy, n)
s.note(1, "Esc + scrim close. Focus trapped, returns to the originating card. Android hardware back closes the modal, not the site.")
s.note(2, "PREFETCH the HLS manifest and first segment when this modal OPENS. This is where the sub-1.5s playback target is actually won — by the time Play is tapped the first segment is warm.")
s.note(3, "pushState ?title=<slug> so it deep-links and shares. ←/→ move between siblings using replaceState, so back exits the modal rather than walking every card visited.")
s.note("!", "Order: poster → title → duration/category/date → Play + My List → synopsis → credits.")
s.render("03-title-modal-mobile.svg", "Deep-linkable · back-aware · prefetches playback")

# ── 04 Player ───────────────────────────────────────────────────────────────
s = SVG(1180, 780, "04 · Player — /watch/<slug>")
X, Y, W, H = 40, 150, 620, 350
s.rect(X, Y, W, H, fill="#1a1a1d", stroke=INK, sw=1.5, rx=8)
s.img(X + 8, Y + 8, W - 16, H - 16, "video surface", rx=4)
s.circle(X + W/2, Y + H/2 - 10, 26, fill="#fff", stroke=INK); s.text(X + W/2, Y + H/2 - 2, "▶", size=18, anchor="middle")
s.rect(X + 8, Y + H - 66, W - 16, 58, fill="#000", stroke="none", op=.35, rx=4)
s.rect(X + 22, Y + H - 44, W - 44, 4, fill="#fff", stroke="none", rx=2, op=.35)
s.rect(X + 22, Y + H - 44, 210, 4, fill=ACC, stroke="none", rx=2)
s.circle(X + 232, Y + H - 42, 6, fill=ACC, stroke=ACC)
s.rect(X + 176, Y + H - 106, 112, 62, fill=IMG, stroke=MUTE, rx=4)
s.text(X + 232, Y + H - 72, "scrub preview", size=7, anchor="middle", fill="#6b7280")
s.text(X + 232, Y + H - 54, "7:08", size=7, anchor="middle", fill="#6b7280")
for i, g in enumerate(["▶", "⟲10", "10⟳", "🔊"]):
    s.text(X + 26 + i * 30, Y + H - 20, g, size=10, fill="#fff")
for i, g in enumerate(["CC", "1x", "1080p", "⛶"]):
    s.text(X + W - 130 + i * 32, Y + H - 20, g, size=8.5, fill="#fff")
s.rect(X + 22, Y + 24, 250, 30, fill="#000", stroke="none", rx=6, op=.5)
s.text(X + 34, Y + 43, "Resuming from 7:08  ·  Start over", size=9, fill="#fff")
for n,(cx,cy) in zip([1,2,3],[(X+W+22,Y+40),(X+W+22,Y+H-42),(X+W+22,Y+H-20)]): s.callout(cx,cy,n)
s.note(1, "Resume affordance shows for 6 seconds then fades. Position comes from the token response (resumeAtS), not from the client.")
s.note(2, "Scrub thumbnails from a VTT sprite. Start the ABR ladder at 480p and step up — never start at 1080p and stall.")
s.note(3, "Controls auto-hide after 3s, reappear on any input, never hide while a control has focus. All ≥44px, all keyboard-mapped (space, ←/→, f, m, c).")
s.note("!", "On a 403 mid-playback, refresh the token silently and continue at the same second. NEVER restart the film.")
s.note("!", "Heartbeat POST /api/progress every 10s, on pause, and on unload via sendBeacon. A failed heartbeat must never interrupt playback.")
s.render("04-player.svg", "Own route · the component the product is judged on")

# ── 05 Browse desktop ───────────────────────────────────────────────────────
s = SVG(1400, 800, "05 · Browse — desktop 1440×900")
X, Y, W, H = 40, 140, 760, 600
s.rect(X, Y, W, H, fill="#fff", stroke=INK, sw=1.5, rx=8)
s.rect(X + 18, Y + 14, 72, 13, fill=MUTE, stroke="none", rx=3)
for i, lb in enumerate(["Home", "Films", "Photos", "My List"]):
    s.text(X + 116 + i * 56, Y + 25, lb, size=8.5, fill="#4b5563")
s.text(X + W - 92, Y + 25, "Search", size=8.5, fill="#4b5563"); s.rect(X + W - 44, Y + 12, 22, 20, fill=IMG, stroke=MUTE, rx=4)
s.line(X, Y + 40, X + W, Y + 40)
s.img(X, Y + 40, W, 268, "billboard · 16:9 · muted trailer", rx=0)
s.rect(X, Y + 186, W, 122, fill="#000", stroke="none", op=.06)
s.text(X + 40, Y + 232, "FIRST LOOK", size=24, weight=700)
s.text(X + 40, Y + 252, "Highlights · 4 min · New this week", size=9, fill="#4b5563")
s.copy(X + 40, Y + 262, 330, lines=2)
s.btn(X + 40, Y + 282, 100, 24, "▶  Play", filled=True); s.btn(X + 148, Y + 282, 104, 24, "ⓘ  More Info")
ry = Y + 336
for t in ["Continue Watching", "Trending Now"]:
    s.text(X + 40, ry, t, size=10.5, weight=700)
    for i in range(5): s.img(X + 40 + i * 124, ry + 10, 112, 150, "", rx=6)
    s.rect(X + 40 + 5 * 124, ry + 10, 46, 150, fill=IMG, stroke=MUTE, rx=6)
    s.circle(X + W - 20, ry + 85, 14, fill="#fff", stroke=INK); s.text(X + W - 20, ry + 89, "›", size=14, anchor="middle")
    ry += 190
s.callout(X + W + 22, Y + 232, 1); s.callout(X + W + 22, ry - 190, 2)
s.note(1, "Desktop is the enhancement. Build mobile first. Billboard crop switches 3:4 → 16:9 at md.")
s.note(2, "Arrows only under (hover:hover) and (pointer:fine). Scroll by floor(containerWidth/cardWidth)*cardWidth — whole cards, never a fractional offset that half-cuts a card on the left.")
s.note("!", "Rows break the right margin deliberately so the next card peeks. Do not contain them inside the grid margin.")
s.render("05-browse-desktop.svg", "Enhancement layer over the mobile design")

# ── 06 Admin: titles + upload ───────────────────────────────────────────────
s = SVG(1440, 820, "06 · Admin — titles & upload")
X, Y, W, H = 40, 140, 800, 620
s.rect(X, Y, W, H, fill="#fff", stroke=INK, sw=1.5, rx=8)
s.rect(X, Y, 130, H, fill=FILL, stroke="none", rx=8)
for i, lb in enumerate(["Catalogues", "Billing", "Settings"]):
    s.text(X + 16, Y + 44 + i * 26, lb, size=9, weight=(700 if i == 0 else 400))
s.line(X + 130, Y, X + 130, Y + H, stroke=LINE)
s.text(X + 150, Y + 34, "Aanya & Vikram", size=14, weight=700)
s.text(X + 150, Y + 50, "aanya-vikram.heirloomfilms.app  ·  Draft", size=8, fill="#6b7280")
for i, lb in enumerate(["Overview", "Titles", "Customizer", "Branding", "Settings"]):
    s.text(X + 150 + i * 74, Y + 78, lb, size=8.5, weight=(700 if i == 1 else 400), fill=(ACC if i == 1 else "#4b5563"))
s.line(X + 150, Y + 88, X + W - 20, Y + 88, stroke=MUTE)
s.rect(X + 150, Y + 102, W - 172, 56, fill="none", stroke=MUTE, rx=8, dash="5 4")
s.text(X + 150 + (W - 172)/2, Y + 126, "Drop films here, or click to browse", size=9.5, anchor="middle", fill="#6b7280")
s.text(X + 150 + (W - 172)/2, Y + 142, "MP4, MOV · up to 20GB per file · resumable", size=7.5, anchor="middle", fill="#9aa1ab")
rowsd = [("Sangeet Film.mp4", "ready", "21:24", "Sangeet", 100),
         ("Ceremony_FULL_v3.mov", "processing", "—", "The Ceremony", 100),
         ("drone_pass.mp4", "uploading", "—", "From Above", 62),
         ("pre_wedding_teaser.mp4", "failed", "—", "Pre-Wedding", 100)]
for i, (nm, st, dur, cat, pc) in enumerate(rowsd):
    yy = Y + 178 + i * 62
    s.rect(X + 150, yy, W - 172, 54, fill=(FILL if i % 2 == 0 else "#fff"), stroke=MUTE, rx=6)
    s.rect(X + 160, yy + 9, 52, 36, fill=IMG, stroke=MUTE, rx=4)
    s.text(X + 222, yy + 22, nm, size=9, weight=600)
    s.text(X + 222, yy + 36, f"{cat}  ·  {dur}", size=7.5, fill="#6b7280")
    col = {"ready": "#46a758", "processing": "#d9a441", "uploading": ACC, "failed": "#e0685f"}[st]
    s.rect(X + W - 210, yy + 16, 66, 18, fill="none", stroke=col, rx=9)
    s.text(X + W - 177, yy + 28, st, size=7.5, anchor="middle", fill=col)
    if st == "uploading":
        s.rect(X + 222, yy + 42, 200, 3, fill=MUTE, stroke="none", rx=2)
        s.rect(X + 222, yy + 42, 200 * pc / 100, 3, fill=ACC, stroke="none", rx=2)
        s.text(X + 432, yy + 45, f"{pc}%  ·  4.1GB of 6.6GB", size=6.5, fill="#6b7280")
    if st == "failed":
        s.text(X + 222, yy + 47, "Unsupported audio codec · Retry", size=6.5, fill="#e0685f")
    s.text(X + W - 120, yy + 28, "Edit", size=8, fill=ACC)
    s.rect(X + W - 88, yy + 19, 26, 14, fill=(ACC if st == "ready" else "none"), stroke=(ACC if st == "ready" else MUTE), rx=7)
    s.text(X + W - 44, yy + 29, "Live", size=7.5, fill="#6b7280")
for n,(cy) in zip([1,2,3,4],[Y+128,Y+240,Y+302,Y+364]): s.callout(X + W + 22, cy, n)
s.note(1, "Upload starts immediately and keeps running while the operator navigates anywhere in the admin. Navigating away must never cancel it.")
s.note(2, "titles row is created at 'uploading' the moment upload starts, so a refresh shows the file rather than losing it.")
s.note(3, "TUS resumable, 5MB chunks, offsets in IndexedDB. Killing the network at 62% and restoring resumes at ~62%, not 0. Test this explicitly.")
s.note(4, "A failure states the provider's actual reason and offers retry. Never a title silently missing from a couple's wedding catalogue.")
s.note("!", "'Live' toggle = published. Processing and failed titles are visible to the operator and hidden from guests.")
s.render("06-admin-titles.svg", "The screen the pitch depends on")

# ── 07 Customizer ───────────────────────────────────────────────────────────
s = SVG(1480, 840, "07 · Customizer — the differentiator")
X, Y, W, H = 40, 140, 860, 640
s.rect(X, Y, W, H, fill="#fff", stroke=INK, sw=1.5, rx=8)
s.line(X + 380, Y, X + 380, Y + H, stroke=LINE)
s.text(X + 20, Y + 32, "SECTIONS", size=9, weight=700, ls=1)
s.btn(X + 296, Y + 20, 64, 20, "+ Add")
mods = [("Billboard", 1, 1), ("Continue Watching", 1, 0), ("Highlights", 1, 1),
        ("Memory Vault", 1, 1), ("A Message For You", 1, 1), ("Trending Now", 0, 0)]
for i, (nm, vis, gear) in enumerate(mods):
    yy = Y + 50 + i * 40
    s.rect(X + 20, yy, 340, 34, fill=(FILL if vis else "#fff"), stroke=MUTE, rx=6)
    s.text(X + 32, yy + 22, "⠿", size=11, fill="#9aa1ab")
    s.text(X + 52, yy + 22, nm, size=9.5, weight=600, fill=(INK if vis else "#9aa1ab"))
    s.text(X + 306, yy + 22, "👁" if vis else "🚫", size=9)
    if gear: s.text(X + 334, yy + 22, "⚙", size=9.5, fill=ACC)
s.text(X + 20, Y + 314, "THEME", size=9, weight=700, ls=1)
for i, c in enumerate([ACC, "#3c5a72", "#7a4b8c", "#2f7d5b", "#b8873a"]):
    s.circle(X + 34 + i * 30, Y + 340, 11, fill=c, stroke=(INK if i == 0 else MUTE), sw=(2 if i == 0 else 1))
s.rect(X + 190, Y + 329, 74, 22, fill="none", stroke=MUTE, rx=6); s.text(X + 227, Y + 344, "custom", size=8, anchor="middle")
s.text(X + 20, Y + 380, "Logo", size=9, weight=600); s.rect(X + 20, Y + 388, 120, 30, fill="none", stroke=MUTE, rx=6, dash="4 3")
s.text(X + 80, Y + 407, "upload", size=8, anchor="middle", fill="#9aa1ab")
s.rect(X + 20, Y + 436, 340, 32, fill="#fff7ed", stroke="#d9a441", rx=6)
s.text(X + 32, Y + 456, "⚠ This accent is 2.9:1 on black — hard to read", size=8, fill="#8a6d1f")
# preview
px, py, pw, ph = X + 470, Y + 44, 180, 380
s.rect(px - 8, py - 8, pw + 16, ph + 16, fill="#fff", stroke=INK, sw=1.4, rx=18)
s.rect(px, py, pw, ph, fill="#f7f7f8", stroke="none")
s.img(px, py, pw, 130, "", rx=0)
s.rect(px + 10, py + 96, 90, 8, fill=MUTE, stroke="none", rx=2)
s.rect(px + 10, py + 112, 58, 12, fill=ACC, stroke="none", rx=6)
for r in range(3):
    s.rect(px + 10, py + 146 + r * 78, 46, 4, fill=MUTE, stroke="none", rx=2)
    for c in range(2): s.img(px + 10 + c * 62, py + 156 + r * 78, 56, 62, "", rx=4)
s.text(px + pw/2, py + ph + 40, "[ 📱 Mobile ]   [ 💻 Desktop ]", size=8.5, anchor="middle", fill="#4b5563")
s.btn(X + 470, Y + H - 74, 84, 28, "Preview")
s.btn(X + 562, Y + H - 74, 84, 28, "Publish", filled=True)
s.text(X + 470, Y + H - 26, "Draft autosaved 2s ago  ·  Undo", size=8, fill="#6b7280")
for n,(cx,cy) in zip([1,2,3,4],[(X+W+22,Y+70),(X+W+22,Y+250),(X+W+22,Y+452),(X+W+22,Y+H-60)]): s.callout(cx,cy,n)
s.note(1, "Drag to reorder AND keyboard reorder (↑/↓ on a grabbed item). Mouse-only is both an a11y failure and a trackpad annoyance.")
s.note(2, "Eye toggles enabled without discarding config. Gear opens that module's Editor in a side sheet, generated from its Zod schema.")
s.note(3, "Contrast validated AT PICK TIME in the UI, live — not as a build failure the operator never sees. Surface stays near-black in every theme; that is not configurable.")
s.note(4, "Autosave to draft_modules, debounced 800ms. Publish is separate and explicit, shows a diff summary, then revalidates ISR. Undo stack of 20.")
s.note("!", "The preview renders the REAL guest component tree against draft modules — never a mock. A second implementation will drift and an operator will publish something they never saw.")
s.note("!", "Mobile is the default preview. Templates ('Wedding — full', 'Anniversary') are what make 30 minutes achievable.")
s.render("07-customizer.svg", "One codebase · per-catalogue module list · 30 minutes")

# ── 08 White-label swap ─────────────────────────────────────────────────────
s = SVG(1480, 700, "08 · White-label — same build, two partners")
for k, (X, name, tint) in enumerate([(40, "Saanjh Weddings", ACC), (600, "The Wedding Atelier", "#3c5a72")]):
    Y, W, H = 150, 480, 460
    s.rect(X, Y, W, H, fill="#fff", stroke=INK, sw=1.5, rx=8)
    s.text(X, Y - 16, name, size=11, weight=700)
    s.rect(X + 18, Y + 12, 66, 12, fill=tint, stroke="none", rx=3)
    s.rect(X + W - 76, Y + 9, 58, 18, fill=tint, stroke="none", rx=9)
    s.line(X, Y + 36, X + W, Y + 36)
    s.img(X, Y + 36, W, 186, "", rx=0)
    s.rect(X, Y + 148, W, 74, fill=tint, stroke="none", op=.10)
    s.text(X + 26, Y + 184, "FIRST LOOK", size=17, weight=700)
    s.rect(X + 26, Y + 196, 76, 20, fill=tint, stroke="none", rx=10)
    for i in range(4): s.img(X + 26 + i * 110, Y + 246, 98, 132, "", rx=6)
    s.text(X + 26, Y + 408, "presented by " + name, size=8, fill="#6b7280")
s.callout(1120, 300, 1)
s.note(1, "Identical component tree and build. Only the catalogue row differs: partner name, logo, accent, and the module list. Zero code changes, zero forks.")
s.note("!", "Section ORDER and WHICH sections exist are per-catalogue too — that is the differentiator, not just colour. See doc 14.")
s.note("!", "Near-black surface is constant across partners. Letting a planner ship a pastel streaming site destroys the thing they are buying.")
s.render("08-whitelabel-swap.svg", "One codebase · per-catalogue config only")
