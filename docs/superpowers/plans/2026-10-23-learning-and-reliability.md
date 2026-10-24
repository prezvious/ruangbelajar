# Learning workflow and reliability

Execution: authorized implementation in this chat, with direct implementation and self-review. No deployment or production database mutation.

## Design

Preserve the vanilla frontend, six locales, themes, account isolation, explicit completion, and version 3 backup compatibility. Add a separately versioned `learning` extension: capacity preferences, recurring-task occurrence status, topic notes/resources, reminders, and time correction history. Existing workspaces receive empty defaults. Unknown extension versions fail closed with the original available for export.

Daily work combines dated unfinished curriculum and tasks, with recurring occurrences computed from a series rather than persisted in advance. A series displays its earliest unfinished occurrence and today's occurrence. Capacity scheduling previews all unfinished sessions, preserves completed sessions, accounts for personal tasks, supports study weekdays/estimates, and reports deadline feasibility before applying explicit date overrides.

Time edits are atomic, require a reason, reject overlap/future/end-before-start, and cannot modify an active timer's run. Keep the latest 500 corrections, with that retention explained. Notes and personal text sources import/export UTF-8 Markdown/TXT; render Markdown using pinned Marked + DOMPurify, with no raw HTML or remote images. Reminders appear in-app; calendar export contains dated occurrences with VALARM. User chose application + ICS, not server Web Push.

Use IndexedDB transactions for workspace persistence and the synchronous mutation façade consumed by the existing conflict engine. Resolve writes only after transaction completion; reload state under the same cross-tab lock before each mutation. Migrate legacy localStorage only after committed insertion. Keep ten local recovery snapshots per workspace. Do not falsely acknowledge failed writes. Keep original oversized backups readable/exportable; a shared 3 MiB UTF-8 canonical workspace cloud budget is checked before upload and enforced by SQL. Local backups remain up to 128 MiB, clearly a separate recovery envelope.

Revision probes avoid unchanged full-document downloads. Reuse a single in-flight sync; retain CAS and identity checks. SQL grants read-only table access and moves privileged writes into a private, ownership-checking function behind an invoker RPC. Add shape/size constraints and revision tests on actual embedded PostgreSQL; Supabase staging/provider configuration remains an external release check.

## Files and interfaces

- `study/learning-model.mjs`: `newLearning`, `validateLearning`, `validateTaskExtras`, `taskOccurrences`, `dailyQueue`, `capacityPlan`, `correctTime` pure domain functions.
- `study/calendar-export.mjs`: bounded occurrence export with RFC 5545 escaping/folding and alarms.
- `study/learning-ui.mjs`: daily queue, planner preview, record editor, notes/resources/routines/reminder controls; uses the existing UI API and contextual actions.
- `study/learning-locales.mjs`: complete six-locale copy; merged by `study/i18n.mjs`.
- `study/repository.mjs`: `workspaceStorage`, `withWorkspaceLock`, `snapshot`, `snapshots`, `restoreSnapshot`; no account-dependent UI details.
- Existing `core`, `sync`, `migration`, `app`, `academic-ui`, `cloud`, `api/workspace`: integrate schema, merges, view hooks, revision protocol and limits.
- `supabase-schema.sql` and numbered `supabase/migrations`: identical idempotent deployment contract. `tests/database.test.mjs` exercises roles/auth/CAS/constraints using PGlite; CI also defines the supported verification commands.
- `tests/learning.test.mjs`, `repository.test.mjs`, browser workflows and existing suites prove migration, input boundaries, concurrency and UI.

## Tasks

1. [x] Write failing domain tests: legacy defaults, recurrence/month boundaries, overdue queue, weekday capacity/deadline/task load, reason/overlap/active-run time corrections, text validation and calendar injection/folding. Implement domain and backup/merge compatibility; run domain and existing core tests.
2. [x] Write failing repository tests: migration committed before source removal, two-client concurrent changes, abort rollback, quota failure, ten-snapshot restore and isolation. Implement IndexedDB adapter and integrate lock/storage; run repository and sync suites.
3. [x] Add revision probe tests and implement conditional reads. Enforce shared canonical upload budget; test unchanged and changed revisions, malformed responses and account switches. Test private SQL write contract on actual PostgreSQL, with two accounts, anonymous access, stale revisions, invalid shapes and oversized data.
4. [x] Add UI controls for queue/planner/time/notes/resources/recurrence/reminders/recovery. Connect calendars, tracker topic controls and existing task actions. Verify live drafts, stale dialogs, six languages and mobile overflow. Import/export hostile Markdown and TXT in a real browser.
5. [x] Add reproducible browser and SQL commands/CI, storage diagnostics, public release runbook and official-reference notes. Run full unit, HTTP, SQL, browser and format checks; self-review changes and report measured limits/external checks accurately.

## Review focus

- Month-end recurrence, skipped occurrences, deleted series and duplicate completion must not create duplicate tasks.
- Concurrent edits and account switches must not overwrite a newer record or expose another account's notes/history.
- IDB transaction abort must not leave UI reporting a durable save or erase the only legacy source.
- Malicious Markdown/URLs/calendar text must not execute HTML or inject calendar properties.
- Time corrections must preserve disjoint intervals and active timer elapsed invariants, including paused runs.
- Capacity proposals must never silently replace completed work, lose overrides before approval, or promise an impossible deadline.

Self-review: all requested capabilities map to tasks above. No speculative social/AI features. Provider SMTP/CAPTCHA, real Supabase deployment and dashboard rate limits require external configuration; do not claim them verified locally.

## Official sources consulted

- https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API/Using_IndexedDB
- https://developer.mozilla.org/en-US/docs/Web/API/IDBDatabase/transaction
- https://developer.mozilla.org/en-US/docs/Web/API/StorageManager/persist
- https://supabase.com/docs/guides/database/functions
- https://supabase.com/docs/guides/database/postgres/row-level-security
- https://supabase.com/docs/guides/local-development/testing/overview
- https://marked.js.org/using_advanced
- https://github.com/cure53/DOMPurify
- https://www.rfc-editor.org/rfc/rfc5545


Execution complete for local scope. Final evidence: `docs/analysis/2026-10-23-verification.md`. Production SQL deployment, provider configuration and real Supabase transport remain explicit external release checks, not claimed completed.
