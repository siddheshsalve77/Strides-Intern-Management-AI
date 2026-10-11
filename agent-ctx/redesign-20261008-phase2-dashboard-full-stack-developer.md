---
Task ID: redesign-20261008-phase2-dashboard
Agent: full-stack-developer (dashboard enhancement)
Task: Premium visual enhancement of dashboard.tsx using the new design token system.

Scope: `/home/z/my-project/src/components/views/dashboard.tsx` ONLY (no other files touched).

## What I enhanced

1. **Hero** — plain `rounded-xl` + gradient overlay → `.card-hero` (teal→emerald glass) + `animate-fade-in-up`. Added `.orb-teal` (top-right) + `.orb-blue` (bottom-left) ambient depth orbs + `.bg-dots` overlay, all `pointer-events-none` inside `overflow-hidden`. Adapted every text color to the now-dark hero surface (white/70, emerald-200/300, rose glass for check-out, white/95 + teal-700 for check-in button + shadow-pop).

2. **KPI strip** — flat `MetricStrip` band → `grid grid-cols-2 lg:grid-cols-4 gap-3` of enhanced `StatCard` with VARIED accents per task spec:
   - Today (attendance) → `emerald` (Clock)
   - Leave → `amber` (CalendarDays)
   - Tasks → `violet` (ListChecks)
   - Completion (performance) → `teal` (TrendingUp)
   Each StatCard auto-applies card-premium + accent-edge + icon-tile. All metric values/subs preserved verbatim.

3. **Section cards** — wrapped all 7 grouped sections in `SectionCard` with semantic `accent`:
   - Today's Schedule → `teal`
   - Quick Actions → `warm`
   - My Tasks → `violet`
   - Leave Balance → `violet`
   - Goals → `success`
   - Holidays → `teal`
   - Announcements → `warm`
   - Recent Activity (ActivityFeed) → `teal`
   Each SectionCard receives the existing title + header action link as `action` slot.

4. **Progress bars** — replaced raw divs with `ProgressBar` component:
   - Leave Balance: Casual → `primary`, Sick → `warm`, Earned → `success` (all `showLabel`)
   - Goals: `success` tone at 100%, `primary` otherwise

5. **Status indicators** — replaced raw `<span>` task-status badges with `Pill`:
   - Overdue → `rose`
   - Today / Xd-left → `amber`

6. **Empty states** — replaced all 5 plain "No X" divs with `EmptyState` component:
   - No meetings → `teal` (Calendar)
   - No pending tasks → `emerald` (CheckCircle2)
   - No active goals → `emerald` (TrendingUp)
   - No upcoming holidays → `teal` (CalendarDays)
   - No announcements → `amber` (Megaphone)

7. **Quick Actions** — bare colored icons → `.icon-tile-*` wrappers (emerald/amber/violet/rose) + AI assistant tile uses `.icon-tile-ai`. Renamed cosmetic array field `tint` → `tile` (1:1 styling swap).

8. **Tactile + typography** — added `.press-tactile` to ~12 interactive elements; `tabular-nums` to all numeric displays.

9. **Loading skeleton** — `bg-muted/40 animate-skeleton` → `card-premium` wrappers + `skeleton-premium` shimmer.

## Imports
- ADDED to ui-helpers import line: `StatCard, EmptyState, SectionCard, ProgressBar, Pill` (all verified present in ui-helpers.tsx).
- Did NOT remove/modify pre-existing imports (MetricStrip, Progress, Card, Button, Badge, motion, taskColor, taskLabel, Timeline, CompactRow, SectionLabel, useTheme — several pre-existing unused, tolerated by eslint config).

## Safety / what I did NOT touch
- `DashboardView` export + signature: unchanged
- All `useState`, `useEffect` (fetch + AbortController + uid guard), `clock()` async fn + toast: unchanged
- All computed vars (inProgress/pending/dueSoon/overdue/isCheckedIn/isCheckedOut/isWeekend/todayMeetings/totalLeave/completedPct/workingHours): unchanged
- `ActivityFeed` component logic (fetch + `return null` early-return): unchanged
- All API URLs, request bodies, `setView` navigation, type imports: unchanged

## Lint
`bun run lint` → CLEAN (zero errors, zero warnings introduced). No fixes needed.

## Could-not-enhance (would require logic change)
1. ActivityFeed empty case: still `return null` (showing an EmptyState would change conditional-rendering logic — skipped per safety rule).
2. The "Xd" neutral task day-count (d > 3): left as plain span — no semantic Pill tone fits a neutral count.
3. PageHeader: NOT added — the `.card-hero` already serves as the premium page title area (greeting + name + role + date); a separate "Dashboard" title above would be redundant.
