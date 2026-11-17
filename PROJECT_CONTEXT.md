Always read PROJECT_CONTEXT.md before planning or coding. It is the source of truth.
Never add a shopping cart, checkout or payment gateway.
Never merge public catalogue products with inventory batches.
Never hardcode content the Admin should edit.
Never invent the farm name, address, phone or branding. Use clearly marked placeholders.
Build phase by phase. Do not start a later phase unless I ask.

TWO SEPARATE DESIGN SYSTEMS INSIDE ONE APP:

1) PUBLIC WEBSITE: premium, modern, professional horticulture brand.
2) PRIVATE APP (Admin / Supervisor / User): extremely simple, mobile-first
   (see UI rules below). It must NOT look like the public website.

PRIVATE APP UI RULES (apply to all future phases):
- Design for Android and iPhone browsers first (360-430px wide), then scale up to
  tablet and laptop. Laptop gets a sidebar layout; mobile gets bottom navigation.
- Users have low literacy and low tech experience. Use big icons, short words,
  and one task per screen.
- Touch targets at least 48px. Base font at least 16px. High contrast.
- Max 4 items in mobile bottom nav (e.g. Home, Add, Stock, More).
- Replace typing with tapping: number steppers (+/-), dropdowns, date pickers,
  big option cards, camera QR scan.
- Multi-step wizards for data entry (e.g. "Record Grafting": Step 1 pick
  rootstock, Step 2 pick scion, Step 3 how many, Step 4 confirm). Show a progress bar.
- Colour-coded status: green = good, yellow = attention, red = problem.
  Never rely on colour alone; add an icon and a word.
- Language toggle English / Hindi (i18n from day one, with all strings in
  translation files).
- Plain-language confirmations ("Saved. 120 plants added to batch GR-01").
  Friendly, short error messages. Always confirm before delete.
- Dashboard for simple roles shows only 3-4 big action buttons and a few numbers.
- Handle weak internet: loading states, retry, and no data loss on a failed save.
- Role-based UI: show each role only what it needs.