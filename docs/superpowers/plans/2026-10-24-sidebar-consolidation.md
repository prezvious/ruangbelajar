# Sidebar consolidation

Implement the accepted navigation analysis directly in the current checkout. Preserve existing uncommitted work and the workspace data format.

- [x] Add a browser regression covering five primary links, two utilities, active parent sections, legacy URLs, Back/Forward, timer continuity, and narrow screens. Confirm it fails against the current navigation.
- [x] Consolidate the shell into Hari ini, Jadwal, Materi, Tryout, Statistik; retain Panduan and Pengaturan as utilities. Keep legacy paths and tracker subject filters. Add `/jadwal` to local and deployed routing.
- [x] Combine daily queue/timer/task editing; expose agenda/calendar/capacity and progress/resources/notes through contextual section navigation. Move profile and subject management into Settings. Combine statistics and editable time history without editing active timer intervals.
- [x] Translate new labels in all six locales, preserve the existing visual system, and document the navigation. Verify behavior with the new browser regression, existing affected browser suites, unit tests, formatting, and a desktop/mobile render review.

Review focus: one live timer display, independent completion states, no duplicate search IDs, task recurrence and subject fields preserved, legacy deep links remain reachable, no production account access.

Verification: initial navigation test failed on the old fourteen-link primary menu. The consolidated navigation test passes, including all five mobile links in six locales, subject deep links, Back/Forward, timer continuity, independent completion, and recurring tasks with an optional end date. Full unit suite, locale/model checks, HTTP, backup/account/conflict browser suites, formatting, and vendor checks passed. Desktop/mobile screenshots are in outputs/navigation-*.png. No production services were used.
