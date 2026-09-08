# LifeTrack — Visual Design System
### Design direction for the SIH livelihood-intelligence platform (pre-frontend)

---

## 0. Design concept: "The Ledger"

Before tokens, the idea the whole system hangs off: **LifeTrack is a living public record, not a SaaS dashboard.**

The subject matter is a government tracking a citizen's livelihood over years — training, jobs, income, risk, intervention. The closest real-world object to that is not a startup analytics tool; it's an **official register or case ledger**: a bound record where every entry is dated, some entries are officially stamped as confirmed and others are provisional notes awaiting confirmation, and the record accumulates rather than resets. That object — a ledger, not a dashboard — is the design's organizing metaphor, and it's where every distinctive choice below comes from:

- The **trainee timeline** (the product's most important element) is drawn as a **ledger spine**: a solid vertical rule with dated entries branching off it, each one carrying a mark that shows whether it's an official stamp (verified) or a provisional note (self-reported) — not a generic dot-and-line activity feed.
- **Verification** is expressed as a **stamp/seal**, because that is literally what employer verification is: an external party attesting a record is true. Unverified data looks like a handwritten note; verified data looks like it's been officially sealed.
- The palette reads like a well-produced **policy document** — ink, paper, and a small number of restrained accent colors used the way a printed report uses color: sparingly, and only where it changes what the reader does next.

This concept is why the system avoids both failure modes named in the brief: it can't drift toward "generic AI SaaS" because the metaphor (ledger, stamp, record) has nothing to do with software-startup visual conventions; and it can't drift toward "dated government portal" because the ledger idea is executed with modern spacing, restrained color, and no literal skeuomorphism (no fake paper texture, no drop-shadowed rubber stamp graphics) — it's a contemporary product that happens to borrow the *logic* of a paper record, not its appearance.

---

## 1. Color Palette

Six named colors, plus ink/paper neutrals. Nothing else is added without a reason — the brief explicitly asks for restraint, and a small palette is also what makes the semantic colors (Section: "How color communicates") legible at a glance across five different dashboards.

| Token | Hex | Role |
|---|---|---|
| `--ink` | `#1C2B45` | Brand/chrome. Deep navy-indigo — sidebar, primary buttons, headings, the verification "seal." Institutional without being the generic SaaS blue (`#3B82F6`-family is avoided entirely). |
| `--paper` | `#F4F5F7` | Main canvas background. A cool, soft off-white — deliberately *not* the warm cream (`~#F4F1EA`) that's become an AI-generated-page cliché. Reads closer to a well-printed report page than a screen. |
| `--paper-raised` | `#FFFFFF` | Card/panel surface, sits one level above `--paper`. |
| `--slate` | `#5B6472` | Neutral. Secondary text, "no outcome yet" states, dividers' text label. |
| `--teal` | `#1F7A5C` | Positive outcome. Muted forest-teal, not a bright success-green — feels earned, not celebratory-SaaS. |
| `--ochre` | `#B8811E` | Warning. Warm mustard — attention without alarm. |
| `--brick` | `#A33B2B` | Risk. Muted brick/oxide red — serious, not a neon danger-red. |
| `--plum` | `#6E4C8C` | AI-generated insight **only**. The one accent outside the institutional ink/paper/slate family, used exclusively to mark output from the Intelligence layer (risk factors, root-cause, recommendations) so it's never confused with human-entered or verified data. |

Each semantic color also has a light tint (10–12% mix onto `--paper-raised`) for badge/alert backgrounds — e.g. `--teal-tint: #E3F2EC`, `--ochre-tint: #FBF0DC`, `--brick-tint: #F8E6E2`, `--plum-tint: #F1EAF6`, `--slate-tint: #E7E9EC`.

**Why not more colors:** five dashboards (Government, Provider, Trainee, Counsellor, Employer) all read the same handful of trainee records. If Provider used blue-for-risk and Government used red-for-risk, the system would be unlearnable across roles. One fixed semantic mapping, enforced everywhere, is what lets a counsellor and a policymaker look at the same trainee and see the same story.

---

## 2. How Color Communicates

Two separate questions get two separate visual answers — this is the palette's key discipline:

**Question A — "What happened?" (sentiment) → answered by hue:**
| Meaning | Color |
|---|---|
| Positive outcome (employed, growing wage, converted apprenticeship) | Teal |
| Risk (high outcome/attrition risk, flagged for intervention) | Brick |
| Warning (needs attention, but not yet high-risk — e.g. partial skill match) | Ochre |
| Neutral (certified, no outcome yet; informational) | Slate |
| AI-generated insight (system-computed risk, root cause, recommendation) | Plum |

**Question B — "How sure are we?" (confidence/provenance) → answered by fill style, not hue:**
| Meaning | Treatment |
|---|---|
| Verified (employer- or counsellor-confirmed) | **Solid fill** + small seal glyph (circle with a check) |
| Self-reported / unverified | **Outline only**, no glyph — reads as a note, not a record |
| Needs review / conflicting | **Dashed outline** + small flag glyph |

This is deliberate: a trainee can be a **verified job loss** (Brick, solid, sealed) or a **self-reported success** (Teal, outline, no seal) — sentiment and confidence are independent facts, and collapsing them into one color-per-status system (as most dashboards do) would hide exactly the distinction this product exists to make. AI-generated insight is the one place hue and confidence merge into a single treatment (always Plum, always tagged "System insight," never solid-filled like a verified fact) — because a prediction is categorically different from a record, and should never be visually mistaken for one.

---

## 3. Typography

**Two typefaces, one family, deliberately chosen for the ledger concept:**

- **IBM Plex Sans** — all UI chrome, body text, labels, data, buttons, tables, nav.
- **IBM Plex Serif** — page titles, section headers, and (most importantly) **trainee names on the profile and timeline**.

Both are cuts of the same superfamily, so they're guaranteed to share proportions and never clash — but the serif/sans split does real work: the serif marks the parts of the interface that are *about a person's recorded history* (a name entered in a register), while the sans handles everything that is *system chrome* (navigation, controls, numbers). This is the typographic expression of the ledger concept, not a decorative pairing — a Government KPI dashboard is almost entirely sans (it's aggregate, systemic); a Trainee profile opens on a serif name and timeline entries (it's a personal record).

IBM Plex was chosen specifically over more common dashboard defaults (Inter, Poppins, Manrope) because it was originally designed for large technical/institutional systems — it carries a slightly engineered, official character appropriate to a government platform, without reading as a typewriter-era serif (avoiding "dated government portal") or a geometric startup sans (avoiding "generic AI SaaS").

**IBM Plex Mono** is used in exactly one place: literal identifiers (Trainee ID, verification reference codes) where character-alignment genuinely matters. It is never used for labels, tags, or category text — that's a common "AI-generated template" tell this system avoids.

---

## 4. Font Hierarchy

Modular scale, base 15px (dense-dashboard-appropriate, not 16px marketing-site body), ratio ≈1.25:

| Level | Size / line-height | Family / weight | Used for |
|---|---|---|---|
| Display | 34px / 1.15 | Plex Serif, 600 | Rare — e.g. Government Dashboard hero KPI headline |
| H1 | 27px / 1.2 | Plex Serif, 600 | Page title (dashboard name, trainee name) |
| H2 | 21px / 1.3 | Plex Serif, 600 | Section header within a page |
| H3 | 17px / 1.35 | Plex Sans, 600 | Card/panel title |
| Body | 15px / 1.55 | Plex Sans, 400 | Default text |
| Body-small | 13px / 1.5 | Plex Sans, 400 | Secondary/meta text, table cells |
| Caption | 12px / 1.4 | Plex Sans, 500 | Field labels, timestamps — **sentence case, never all-caps** |
| Data-lg | 28–36px / 1.1 | Plex Sans, 600, tabular figures | KPI card headline numbers |
| Data | 15px, tabular figures | Plex Sans, 500 | Table numeric columns, wage figures |
| Mono | 13px / 1.4 | Plex Mono, 400 | Trainee ID / reference codes only |

No all-caps labels anywhere in the system (a called-out generic-AI tell) — hierarchy is carried by size, weight, and the serif/sans split, not letter-casing.

---

## 5. Spacing System

4px base unit, restrained scale — the same scale is used for padding, gaps, and layout margins everywhere, which is what keeps five different dashboards feeling like one product:

`4 · 8 · 12 · 16 · 24 · 32 · 48 · 64 · 96` (px)

Guidance:
- **4–8px**: within a tight cluster (icon-to-label, badge padding).
- **12–16px**: internal card/panel padding, form field gaps.
- **24px**: gap between cards in a grid, section internal padding.
- **32–48px**: gap between major page sections.
- **64–96px**: top-level page margins, hero sections only.

---

## 6. Border Radius

Radius communicates hierarchy — deliberately **not** the single-radius-on-everything "SaaS card kit" pattern:

| Token | Value | Used for |
|---|---|---|
| `--radius-xs` | 4px | Checkboxes, small chips, table row hover |
| `--radius-sm` | 6px | Inputs, buttons, tags |
| `--radius-md` | 10px | Cards, panels |
| `--radius-lg` | 14px | Modals, side sheets |
| `--radius-pill` | 999px | Status badges/confidence chips **only** — the pill shape is reserved for compact status indicators, so it stays meaningful instead of decorating every element. |

---

## 7. Shadows

Shadows are used for **elevation, not decoration** — most surfaces in this system are flat with a hairline border, and get zero shadow at rest. This is the direct antidote to the "identical soft grey shadow under every card" pattern common to generated dashboards.

| Token | Value | Used for |
|---|---|---|
| `--shadow-none` | none | Cards, panels, table rows at rest (border does the work) |
| `--shadow-sm` | `0 1px 2px rgba(28,43,69,0.06)` | Buttons on hover, low-emphasis lift |
| `--shadow-md` | `0 8px 24px rgba(28,43,69,0.12)` | Dropdowns, popovers, tooltips |
| `--shadow-lg` | `0 16px 48px rgba(28,43,69,0.18)` | Modals only |
| `--shadow-focus` | `0 0 0 3px rgba(28,43,69,0.18)` | Keyboard focus ring on any interactive element |

Shadows are always tinted with `--ink` at low opacity, never pure black — this keeps them feeling like part of the same restrained palette rather than a generic browser default.

---

## 8. Backgrounds

Three flat layers, no gradients, no textures:

1. **`--paper`** — the base canvas for every dashboard's content area.
2. **`--paper-raised`** (white) — cards, panels, table surfaces, modals.
3. **`--ink`** — reserved for the sidebar/navigation shell only (Section 18). Using a dark ink shell around a light paper canvas is what gives the product an institutional anchor (it reads as a bound register with a dark spine and light pages) rather than the flat, all-grey admin-template look, while stopping well short of a full dark-mode SaaS aesthetic.

No background gradients are used anywhere in the system — flat color is a deliberate restraint choice consistent with the ledger concept (a printed page doesn't have a gradient wash on it).
## 9. Cards

Flat `--paper-raised` surface, 1px `--slate` border at 15% opacity, `--radius-md`, no shadow at rest. Internal padding 24px. A card never gets a shadow just for existing — shadow is reserved for things that are genuinely floating above the page (Section 7). Card headers use H3 (Plex Sans 600), never an eyebrow label above the title.

Card variants are distinguished by a **2px left border in a semantic color**, not by changing the whole card's background or adding a colored header bar — e.g. an at-risk trainee card gets a 2px Brick left-edge; this is a restrained, single-signal way to carry sentiment without turning the interface into colored blocks.

---

## 10. Buttons

One shape language, three emphasis levels — no per-page variation:

| Variant | Fill | Border | Text | Used for |
|---|---|---|---|---|
| Primary | `--ink` | none | white | One per view — the single next action (Approve intervention, Confirm) |
| Secondary | `--paper-raised` | 1px `--ink` at 30% | `--ink` | Supporting actions (Dismiss, View details) |
| Ghost/text | transparent | none | `--ink` | Low-emphasis actions inside tables/cards |
| Destructive | `--brick` | none | white | Rare — dispute/revoke actions only |

`--radius-sm`, 15px Plex Sans 600, horizontal padding 16px, height 40px (36px in dense table toolbars). No arrow (`→`) appended to button labels — the label states the action in full ("Approve intervention," not "Approve →"). Hover = 4% darken of fill; focus = `--shadow-focus`; disabled = 40% opacity, no pointer.

---

## 11. Inputs

`--paper-raised` background, 1px `--slate` border at 30%, `--radius-sm`, height 40px, 12px horizontal padding, 15px Plex Sans. Label sits above the field (Caption style, sentence case). Focus state: border becomes `--ink`, plus `--shadow-focus`. Error state: border becomes `--brick`, helper text below in `--brick`, Body-small. Never use color alone for error state — an error icon (small circle-exclamation) always accompanies the border color change.

Conversational follow-up inputs (the trainee-facing Q&A) use the same input styling but larger (48px height, 16px text) — the one place the type scale steps up for a public-facing, lower-literacy-assumed context.

---

## 12. Tables

The workhorse of every dashboard, so restraint matters most here. `--paper-raised` background, no vertical grid lines, a single 1px `--slate` (10% opacity) horizontal rule between rows. Header row: Caption style, `--slate` text, `--paper` background (one shade off the body rows), bottom border 1px `--ink` at 20%. Numeric columns are right-aligned with tabular figures. Row hover: background shifts to `--paper` (no shadow, no border change). Status/confidence always renders as the badge component (Section 12/13), never as plain colored text — so a table scanned quickly still shows sentiment + confidence correctly.

---

## 13. Badges (Status & Confidence)

The most-reused component in the system — it's how every dashboard shows a trainee's state at a glance. Built from the two independent axes in Section 2:

- **Shape:** `--radius-pill`, Caption-size text (12px, sentence case — "Employed," not "EMPLOYED"), 4px vertical / 10px horizontal padding.
- **Sentiment (hue):** background = semantic-color tint, text = semantic-color full value.
- **Confidence (fill style):**
  - *Verified* → solid semantic-color background, white text, small seal glyph (○✓) before the label.
  - *Self-reported* → tint background, semantic-color text, semantic-color 1px outline, no glyph.
  - *Needs review* → tint background, semantic-color text, 1px **dashed** outline, small flag glyph.

Examples: "● Employed" (solid teal, sealed = verified employment) vs "Employed" (teal outline = self-reported) vs "Employed ⚑" (dashed teal = employer disputed, needs review). The same word can appear in three visibly different badges — that's intentional; the confidence, not just the status, is always on screen.

---

## 14. Alerts

Left-accent banner style (not full-color-fill banners, which would fight with the badge system for visual weight): `--paper-raised` background, `--radius-md`, 4px left border in the semantic color, 16px padding, icon + Body text + optional action link. Used for page-level and section-level messages ("This district's placement rate dropped 8 points vs. last cohort"). Alerts always name the specific number or fact that triggered them — never a generic "Attention needed."

---

## 15. Risk Indicators

Risk is shown two ways depending on context, both built from the same 0–100 score:

- **Compact (tables, worklists):** a small horizontal bar (4px tall, `--radius-xs`, track in `--slate` 10%, fill in Brick/Ochre/Teal matched to band) with the numeric score in Data style beside it. No dial, no gauge chrome — a bar reads faster in a dense list.
- **Expanded (trainee profile):** the score as a large Data-lg number with its band badge (Section 13 styling, but band-colored not status-colored), followed by a **factor list** — each contributing signal as a row with its label and point value (e.g. "No placement 52 days after certification  +30"). This factor list is the non-negotiable design requirement carried over from the PRD/Build Spec: a risk score is never shown without its reasons directly underneath it, in the same visual weight as the score itself — never collapsed into a tooltip or a secondary "why?" link.

---

## 16. AI Insight Components

Every piece of system-generated reasoning (risk factors, root cause, intervention recommendation) sits inside a distinct **Insight Panel**: `--plum-tint` background, no border, `--radius-md`, a small spark glyph + "System insight" Caption label in `--plum` at the top-left of the panel, body text in standard Plex Sans. This is the only place Plum appears, which is what makes it functional rather than decorative — the moment a reader sees plum, they know they're reading a system inference, not a fact someone entered. Insight panels always end with the data points the inference used (e.g. "Based on: attendance 64%, assessment 42%, 0 follow-up responses") in Body-small `--slate` — an insight is never presented as a bare conclusion.

---

## 17. Charts

Chart color always maps to the Section 2 semantic palette — never a default rainbow/categorical palette. A stacked bar of outcome status uses Teal/Brick/Ochre/Slate in that fixed order every time it appears, on every dashboard. Axis lines and gridlines are `--slate` at 10–15% opacity, never full black. Data labels use tabular-figure Plex Sans. Line charts (wage progression) use a 2px `--ink` line by default, switching to `--teal`/`--brick` only when the chart's entire purpose is to show growth vs. decline (e.g. a single trainee's wage line turns teal when trending up). No gradient fills under lines, no 3D, no drop shadows on chart elements — charts are read as data, not decoration.

---

## 18. Timeline Component (the hero element)

The single most important visual object in the product — the trainee's longitudinal record — gets the system's one deliberate moment of visual boldness (everything else stays quiet, per the restraint principle):

- A **solid 2px `--ink` vertical spine** runs the full height of the timeline.
- Each event is a **node on the spine**: a filled `--ink` circle for a routine record (certification, follow-up completed), replaced by the relevant **semantic-color seal or outline** (Section 13's confidence treatment) for outcome-bearing events — a verified job is a solid teal sealed node, a self-reported job-loss is a brick outlined node, a pending follow-up due today is a hollow slate node.
- Each node connects to a **record card** to its right: date (Caption, `--slate`) → short headline in Plex Serif ("Employed — BrightRetail Pvt Ltd") → supporting detail in Plex Sans Body-small. The serif headline is what visually marks this as "the ledger," distinct from every other list in the product.
- AI-generated entries (a risk flag, a recommended intervention) appear **on the same spine**, using the Plum insight-panel treatment (Section 16) instead of a record card — so a reader can see, in one continuous scroll, exactly where the system stepped in relative to what actually happened.
- The spine has no fixed length — it grows with the trainee's history, reinforcing that this is an accumulating record, not a fixed-size activity widget.

This component is the one place the design "spends its boldness" (serif headlines, the seal/outline/dash confidence language, the spine itself); every other component in this system is intentionally quieter so the timeline reads as the product's center of gravity on every page that includes it.

---

## 19. Navigation / Sidebar

Fixed left sidebar, `--ink` background, white/`--paper` text — the one large block of the brand color in the interface, giving every dashboard the same institutional anchor regardless of role. Contains: product mark (wordmark, not a logo icon — see below), role-scoped nav items (Body, 15px, `--paper` at 70% opacity when inactive, 100% + a 3px `--teal` left-accent when active), and the current mock-login user at the bottom. No icons-only nav — every item has a text label (icons alone read as generic admin-template chrome). The sidebar is the same component and same width across all five dashboards; only the nav items inside it change per role, which is what makes the five surfaces feel like one product rather than five separate tools.

Top bar (within the `--paper` content area, not part of the sidebar): breadcrumb-style page title (H1, Plex Serif) + role indicator + notification bell. No search bar unless a screen specifically needs one — an empty global search box is template chrome the brief doesn't call for.

---

## 20. Modals

`--paper-raised`, `--radius-lg`, `--shadow-lg`, max-width 560px for confirmation-style modals (Approve intervention, Confirm consent change) and 720px for content modals (full risk-factor breakdown). Scrim: `--ink` at 40% opacity, no blur. Header: H2 title + close control, bottom-bordered 1px `--slate` 15%. Footer: right-aligned button row (Secondary then Primary, in that order left-to-right, so the committing action is always rightmost and last-read). Modals are used only for actions with consequence (approving an intervention, confirming/disputing employer verification) — never for simple detail viewing, which belongs inline or in a side panel.

---

## 21. Tooltips

`--ink` background, white text, Body-small, `--radius-sm`, `--shadow-md`, 8px vertical / 10px horizontal padding, small directional arrow. Used only for genuinely supplementary information (an abbreviation, a precise timestamp on hover) — **never** to hide required information that Section 15 requires to be always-visible (risk factors, insight data points never live only in a tooltip).

---

## 22. Empty / Loading / Error States

Consistent with the "errors don't apologize, emptiness is an invitation to act" writing principle:

- **Empty state:** centered within the card/panel, a single-line Plex Sans Body statement of fact ("No follow-up responses yet for this checkpoint") followed by the one relevant action if one exists ("Send reminder now"). No illustration — illustrations on empty states are template decoration this product doesn't need; the ledger concept treats an empty section as an unfilled record, not a mood moment.
- **Loading state:** a flat `--slate`-at-8%-opacity skeleton block in the exact shape of the content it's replacing (card, table row, chart), with a slow single-direction shimmer. No spinners on full-page loads — skeletons preserve layout and match the flat, document-like visual language better than a spinner would.
- **Error state:** `--brick` left-accent (same alert component as Section 14), stating what failed in plain language and the one recovery action ("Couldn't load this trainee's records. Retry."). Never a generic "Something went wrong."

---

## Applying this consistently across all seven surfaces

| Surface | What stays fixed | What's the only thing that changes |
|---|---|---|
| Government Dashboard | Sidebar, type scale, chart palette, card/badge system | KPI cards are larger (Data-lg), more chart-heavy, fewer individual trainee records shown |
| Provider Dashboard | Same | At-risk table + intervention cards are the dominant content; timeline appears only when a row is opened |
| Trainee Profile | Same | The timeline (Section 18) is the primary content, full width; serif is used more here than anywhere else |
| Counsellor Dashboard | Same | Worklist table + risk indicators (Section 15, expanded form) are dominant |
| Employer Verification | Same, but **no sidebar** (link-based, no login) | Single centered card, Primary/Secondary/Destructive buttons for Confirm/Dispute/No record |
| Skill Intelligence | Same | Plum insight panels and chart components dominate; missing-skill chips use the Slate neutral badge style |
| Analytics | Same | Heaviest chart usage; still the fixed semantic chart palette from Section 17 |

One rule underwrites all seven: **the same trainee record, in the same badge, same colors, same confidence language, everywhere it appears.** That consistency is what turns five different role-based tools into one believable platform — and it's the visual proof of the product's actual claim, that a single continuously-updated record is the whole point.
