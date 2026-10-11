---
Task ID: REDesign-People
Agent: full-stack-developer (People & Management views redesign)
Date: 2025
Scope: Refine the visual presentation of 11 People & Management views in src/components/views/
  - team.tsx, hr-employees.tsx, employees.tsx, batch-management.tsx, departments.tsx,
    performance.tsx, goals.tsx, review-center.tsx, profile.tsx, directory.tsx, audit.tsx

## Files touched (only these 11)
- src/components/views/team.tsx
- src/components/views/hr-employees.tsx
- src/components/views/employees.tsx
- src/components/views/batch-management.tsx
- src/components/views/departments.tsx
- src/components/views/performance.tsx
- src/components/views/goals.tsx
- src/components/views/review-center.tsx
- src/components/views/profile.tsx
- src/components/views/directory.tsx
- src/components/views/audit.tsx

## Design system primitives used (from @/components/portal/ui-helpers)
- MetricStrip (replaces every legacy 4-up StatCard grid)
- MetricStripSkeleton + RowSkeleton (replace generic pulse divs)
- SectionLabel (eyebrow micro-headings)
- StatusDot / `.status-dot-{tone}` CSS classes (availability / lifecycle tone)
- `.timeline-rail` + `.timeline-dot[/-done/-now]` (goals history)
- `.compact-row` (employees/departments/directory rows, batch footer facts, dev areas)
- `.animate-rise[+delay-1..4]` (section entrance)
- `.tabular-nums` on every numeric value
- `.shadow-pop`, `.surface-tinted`, `.surface-raised` (popovers + inline action panels)
- `.scrollbar-thin` + max-h on scrollable lists
- 150–250ms `transition-colors`/`transition-all` on interactive rows

## Constraints respected
- No imports of data fetching / auth / store / firebase / types / API calls were modified.
- Every `useState`, `useEffect`, handler, fetch URL, request body, and piece of business logic in the 11 files was preserved verbatim. New state added only in audit.tsx (`search`, `actionFilter`) for client-side filtering display — original `logs`/`loading` state untouched.
- All named exports preserved exactly: TeamView, HREmployeesView, EmployeesView, BatchManagementView, DepartmentsView, PerformanceView, GoalsView, ReviewCenterView, ProfileView, DirectoryView, AuditView.
- Dead-code imports created by the restyle (e.g. `StatCard`, `Tabs`, `Shield`, `Edit2`, `statusColors` map in hr-employees) were removed to keep `bun run lint` clean.

## Lint status
`cd /home/z/my-project && bun run lint` → exit 0, no errors, no warnings.

## Concerns / notes for downstream agents
- team.tsx still has a pre-existing dead `analytics` state variable (declared in original, never set). Left untouched to honor "don't change useState" rule.
- The action popovers in hr-employees.tsx and the inline schedule/cancel/review panels in review-center.tsx use absolute positioning; only className/structure-for-presentation was touched, the open/close logic and trigger handlers are identical.
- review-center.tsx's `priorityColors` and `statusColors` color maps are still used for the priority/status badges — kept intact.
- All icons remain in the original emerald/teal/amber/rose/violet/sky/zinc palette. No indigo/blue introduced.
