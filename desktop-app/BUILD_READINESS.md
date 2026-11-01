# Mench AI build readiness

Objective: finish, test, and deliver the full school coding program discussed in
this thread. A successful frontend build alone does not establish completion.

## Current acceptance scope

Latest reviewed candidate: `.local/windows-community-candidate` (0.3.0, unsigned).
The reports prove the scopes below; the unchecked release gates remain intact.
Historical checkpoints farther down describe earlier candidates, not new evidence.

| Requirement | Authoritative local evidence | Still unproved for release |
| --- | --- | --- |
| Desktop and files | `desktop/runtime.test.mjs`, `desktop/changes.test.mjs`, `src/workspace/native-workbench.test.js`; actual archived renderer creates/saves/reopens native projects | Installed main-entry lifecycle, real OS folder dialogs, clean-host draft/crash recovery |
| Terminal and project execution | Actual bundled Node/npm/npx install/scripts, real exit codes, capability-bound HTTP preview, PowerShell PTY and restart in source/package/UI reports | Installed app with no development tools, process cleanup on clean Windows host |
| Git | Actual initialize/status/diff/stage/commit, linked-metadata rejection and recovery-data exclusion in `desktop/git.test.mjs` and archived-service report | Installed clean-host acceptance; remote Git transport was not promised or implemented |
| Project AI | Shared bilingual context builder, distinct approved community frameworks/voices, scoped source retrieval, account-private history/project briefs, FTS citations, real Monaco multi-file diff/apply/undo, actual task results, safe-save regressions | Real provider response, reviewed code usefulness, broader live adversarial evaluation |
| Managed gateway and policy | Real HTTP authentication/roles, exact-revision approval, input/output checks, revocation/cancellation, encrypted credentials and pinned gateway; fixture provider clearly identified | Actual school approver/rules, real provider key access, actual network/TLS acceptance |
| Classrooms | Accounts/classes/rosters/templates/assignments/snapshots/feedback; real role UI flows and bounded-history/collection tests; old admin project assessed read-only | School network/load and staff acceptance; no actual school work has been imported or approved |
| Windows release | Lockfile build, x64 bundled runtime, real PE/icon/version inspection, unsigned NSIS artifact, offline recovery, documented manual-update process | Clean-machine install/upgrade/uninstall/recovery execution and signed distribution |
| Verification | Lint, 139 source tests, 86 package + 10 archived-service checks, 48 ordinary + 51 managed actual-renderer checks; screenshots reviewed | Native OS dialogs, installed executable lifecycle, live AI and real deployment evidence |

School policy approval and real-network operation are deployment acceptance,
not claims established by fixture approvals or loopback traffic. A provider key
is unnecessary for local editing, saving, preview, terminal, Git, or classroom
records; it is necessary to finish live AI verification. Existing user projects
and the user's original running application have not been replaced.

## Required release gates

- [ ] Windows desktop application, native project/folder access, recent projects,
  tabs, safe saving, recovery, file search, rename/move/delete with recovery.
- [ ] Real terminal, process lifecycle, supported project templates, dependency
  installation, run/build/test commands, live development-server preview, and
  useful errors. No simulated command success.
- [ ] Git status, diffs, staging, commits, and recovery guidance without silently
  discarding user work.
- [ ] Project-aware AI with explicit context, multi-file change review, undo,
  bounded project tools, and truthful build/test output.
- [ ] Managed AI gateway with protected credentials, administrator-controlled
  content policy, input/output enforcement, audit/review workflow, and adversarial
  checks. School approval must be recorded rather than inferred.
- [ ] Student and teacher accounts, approved templates, assignments, progress,
  teacher review, and school-managed settings; assess existing admin project for
  reuse.
- [ ] Reproducible Windows installer, recovery, update configuration, clean-machine
  installation/runtime checks, and documented operating requirements.
- [ ] Automated unit/integration tests, desktop end-to-end verification, rendered
  UI review, real native-folder verification, and live AI verification with a
  configured provider key. Mock-provider tests are supplemental evidence.

## Historical browser baseline

The browser workspace has new/open/recent project flows, Monaco, explicit saves,
browser draft recovery, static HTML/CSS/JS preview, and reviewed single-file AI
suggestions. Thirteen automated checks pass. The native browser folder-picker
check was interrupted; live AI was not verified with a real provider key.

## Work order

1. Desktop/runtime and complete local project execution.
2. Project-aware AI and managed policy/gateway.
3. Classroom workflows and school administration.
4. Installer, deployment, and full release audit.

Windows is confirmed as the initial target. The school-policy approver has not
been selected; do not represent the policy as school-approved.
This file tracks the full scope; incomplete gates must remain visible.

## Desktop foundation progress

- Added native capability-scoped file access, atomic saves, conflict detection,
  saved revisions, persistent recent projects, and project content search.
- Added real npm task processes and a Windows PTY isolated in a helper process,
  plus Git status/diff/stage/unstage/commit using a bundled implementation.
- Added a locally bundled Monaco editor and verified official Node runtime,
  desktop IPC/preload isolation, and Windows packaging.
- The desktop foundation originally passed 15 frontend/service checks and 7
  real native runtime checks; school checks below extend that coverage.
- The rebuilt packaged app created a real project through the native folder
  dialog, ran its working JavaScript preview, opened its PowerShell terminal,
  and saved an editor change verified on disk. The contextBridge error-field
  fix has both regression coverage and native create-flow verification.
- The running initial test instance is being used by the user; build new
  candidates separately rather than overwriting or terminating that instance.
- The unsigned NSIS installer was built in `.local/windows-candidate` without
  launching it. Clean-machine installation and signing are not verified.
- Production dependency audits for the app and the separately prepared npm
  runtime both report zero vulnerabilities; this does not cover development
  dependencies.
- Project-wide AI release validation, classroom release validation, clean-machine
  verification, and live provider checks remain incomplete.

## School service progress

- Added SQLite-backed accounts, private first-administrator setup, one-use
  invitations, hashed passwords and session tokens, role enforcement, and
  session revocation. No default school password or automatically approved policy.
- Added class enrollment, reviewed templates, assignments, explicit selected-file
  snapshots, student submission history, teacher feedback, and progress counts.
- School AI uses a server-held key and model, exact-version nominated policy
  approval, input/output term checks, provider safety settings, rate limits,
  cancellation, and metadata-only block reviews/audit records.
- Added a machine-managed gateway setting and a main-process encrypted credential
  vault. Keys and school tokens are not returned to renderer code. Persistence
  tests use a test codec. A separate windowless Electron 45 smoke check now also
  verifies actual Windows encryption, encrypted on-disk bytes, and reopening.
- Added the School dialog and tested policy approval, student file selection,
  snapshot submission, and teacher review through the real school store.
- The school-service checkpoint passed 19 frontend/component tests, 13 native/client tests, and 13 school
  tests pass. The production frontend builds. An updated unsigned NSIS installer
  including the school service was built at `.local/windows-school-candidate`.
- Direct packaged-runtime verification found that electron-builder skips a root
  `node_modules` folder in an extra-resource tree. Added a separate npm dependency
  resource mapping. The corrected package now passes 31 verification checks:
  source and frontend-asset parity, runtime checksum/version, npm security patch
  versions, real offline dependency installation, real bundled-Node script
  execution, actual packaged PowerShell PTY output/exit, and standalone packaged
  school-service authentication and pending-approval enforcement. Evidence is in
  `.local/windows-school-candidate/verification.json`.
- At that checkpoint, live AI, school-approved policy evaluation, account recovery,
  database backup, real network deployment, and installed-app validation remained
  open. Recovery work below extends this evidence. The separate
  curriculum admin project was assessed and left intact; see `SCHOOL_SETUP.md`.

## Verification constraints

The user requested background-only work. Do not take focus, move the mouse,
operate visible windows, or launch visible test apps. Continue through CLI
builds and automated tests. Native interactive checks requiring a visible
window remain pending unless the user explicitly authorizes them later.

## Project-wide editing and file recovery progress

- Added explicit multi-file context selection, private/generated path exclusions,
  bounded context size, validated multi-file proposals, and concise proposal cards.
- Added selected-file diff review, native apply/save, persistent original-content
  journals, guarded undo, rollback after write failure, and interrupted-operation
  recovery. Newer editor and disk changes are not silently overwritten.
- Added Explorer rename/move and recoverable deletion, retaining unsaved buffers
  on rename and explicitly saving them before trash. A project-local trash catalog
  can be rediscovered in another application profile. Restore rejects collisions.
- Added explicit task suggestions and optional sharing of actual task output;
  process results retain real status/exit codes and are checked by school policy.
  The generic school bridge cannot accept a forged AI task-result request.
- Fixed npm/npx launchers for Unicode installation paths and verified nested
  commands with host Node removed from PATH. Runtime child environments remove
  inherited school bootstrap/provider credentials.
- Source checks: 26 frontend/component tests, 23 native/client tests, and 14 school
  tests pass (63 total), with a successful production build. UI test concurrency
  was reduced after a parallel run exhausted available memory; caches are isolated.
- A new unsigned Windows installer is built at `.local/windows-project-candidate`.
  Its 38 package checks pass. Nine additional checks load the actual archived
  service modules in a windowless Electron process and verify group apply/undo,
  trash restore, Git staging/commit, Unicode-safe nested npm/npx without host
  Node, real failing exit codes, and the unpacked terminal helper. Reports are
  `verification.json` and `desktop-services-verification.json` in that candidate
  directory; the service report records zero visible windows created.
- At that checkpoint, remaining release work included account/password recovery,
  consistent school database backup/restore, Git/filesystem boundary review, installer/update and
  clean-machine checks, full desktop UI verification, and live/school policy
  evaluation. The full release gates above remain open until proved.

## Account recovery, school backups, and Git boundary checks

- Added verified password changes and administrator-issued, one-use reset tokens
  with one-hour expiry, hashed storage, account binding, session revocation, and
  role preservation. Offline last-administrator recovery requires a real OS lock
  and writes a private token file rather than logging its contents.
- Upgraded new password hashes to versioned scrypt parameters and migrate older
  hashes on successful sign-in. Tests cover authentication races with account
  deactivation, password changes, and late desktop sign-in/status responses.
- Added unreadable desktop-vault recovery that preserves project files and the
  machine-managed gateway, and accessible password/reset/data UI flows. The real
  Windows safeStorage check now also verifies rejection of a damaged vault,
  clearing it, and protecting/reopening replacement credentials without windows.
- Added consistent live SQLite snapshots, hashes and database checks, daily
  automatic snapshots, configurable retention, manual snapshots, and offline
  restore with exact confirmation. Manual/pre-restore backups are never pruned
  automatically. A damaged older snapshot does not invalidate a verified new one.
- Restore keeps a healthy pre-restore snapshot or raw damaged originals and
  journals, revokes sessions/invitations/reset tokens, and creates a new draft
  policy requiring fresh nomination and approval. Durable restore records block
  unsafe startup after interruption. Existing backups also prevent silent fresh
  school creation if the current database disappears.
- School data now defaults to the service user's application-data directory and
  preserves legacy development data. Ambiguous locations require an explicit
  choice. Setup and maintenance commands are documented in `SCHOOL_SETUP.md`.
- Git now scopes its own filesystem operations, rejects external/linked metadata,
  protects recovery files from staging/commits, and reports missing committed
  objects. Tests include top-level and nested metadata junctions, working-tree
  links, external `.git` pointers, ordinary commits, and staged deletion.
- Source verification: 30 frontend/component tests, 32 desktop/native/client tests,
  and 33 school tests pass (95 total); the production frontend builds. Evidence
  is in `.local/recovery-check.log` and `.local/recovery-desktop-check.log`.
- A separate unsigned Windows candidate is built in
  `.local/windows-recovery-candidate`. Its 51 package checks and 10 archived
  desktop-service checks pass, including real packaged password reset/change,
  online snapshot/verification, offline restore and safety snapshot, Git boundary
  rejection, npm/npx, and PowerShell. Reports are `verification.json` and
  `desktop-services-verification.json` in that directory. No visible app or
  installer was launched. Installer SHA-256:
  `BEB79012A51F2469609C3616E9AC387ED572B510AD8C4C00033AEEF9C3DC8B53`.
- Remaining work includes classroom list scaling, broader desktop UI verification,
  installer/update and clean-machine checks, real network deployment, and live
  AI/school policy evaluation. The policy approver and real provider key are still
  unavailable. Full release gates remain open.
  At that checkpoint, assignment/template lists included full starter files and
  every submission summary; the classroom paging work below addresses that issue.

## Classroom paging and on-demand project details

- Replaced whole-collection responses with bounded keyset pages for accounts,
  classes, class rosters, templates, assignments, and submission history. Search
  and role/status filters run in SQL; cursors are tied to the actor, resource,
  and filters, with authorization reapplied on every request. Added supporting
  enrollment/class/assignment/submission/template indexes.
- Assignment/template pages omit starter files. Instructions and files load only
  when opened, and submission lists carry bounded excerpts rather than complete
  projects or feedback bodies. Detail endpoints check class ownership/enrollment,
  template approval, and student submission ownership.
- Reworked School sections to fetch their current lists and details, with next/
  previous navigation, search, explicit template opening before approval, and
  searchable class/template/teacher/approver pickers that retain selections.
  Late responses cannot replace a newer search, and account changes clear token
  cards and selected upload files.
- A real HTTP/client regression fixture contains 61 assignments, 62 templates,
  242 submissions, and more than 120 accounts. It verifies bounded response sizes,
  file retrieval, cursor misuse, isolation, complete nonduplicated paging when
  new records arrive, and account revocation. This is synthetic regression
  coverage; school deployment load and network testing remain open.
- `npm run check` passes 34 frontend/component tests, 32 desktop/native/client
  tests, and 36 school tests (102 total), and builds the production frontend.
  Evidence: `.local/school-pages-check.log`.
- The updated unsigned candidate is built separately in
  `.local/windows-classroom-candidate`. Its 60 package checks and 10 archived
  desktop-service checks pass. Packaged checks create 32 real templates and
  assignments, exercise complete student paging and lazy file access, create and
  enroll a class, submit/review a snapshot, and load authorized roster/account
  pages, alongside the prior recovery/runtime checks. No visible windows or
  installers were opened. Reports are `verification.json` and
  `desktop-services-verification.json` in that directory. Installer SHA-256:
  `F6F033DC07EA7F9B7C4B9A119C63DC9E15F88221A56DB993B2B2D1BE3989DC4D`.
- Remaining gates include full desktop UI/Monaco verification, update and clean-
  machine installation checks, real network deployment/load checks, and live AI
  and school policy evaluation. Audit/review history and backup catalog paging
  also need a separate scale review; this change does not establish those limits.
- At that checkpoint, a separate audit found `npm run lint` was broken because this repository
  has no ESLint configuration. Evidence: `.local/lint-readiness.log`. Restore a
  meaningful lint configuration and address its findings before release; the
  successful `check` command does not include lint.
- At that checkpoint, desktop flow verification also needed signing out while Change password
  is open: the existing dialog retains `mode='password'` across sign-out and needs
  to return to the normal sign-in form. This has been identified by source review
  and was not repaired in the classroom candidate. The next checkpoint fixes it.

## Lint, save concurrency, and offscreen desktop verification

- Restored a repository ESLint configuration covering JS/JSX/MJS/CJS, React hooks,
  unused bindings and core correctness rules. Removed unused imports and dead
  bindings, corrected effect dependency/closure issues, scoped switch declarations,
  and moved cleanup boundary validation before child-process launch. Deliberate
  control-character path/terminal regexes have narrow documented exceptions.
  `npm run check` now includes lint rather than silently skipping it.
- Signing out from Change password returns to the normal sign-in form; another
  account starts in Assignments. Regression coverage includes the actual dialog,
  account roles, and retained school work.
- Real Monaco keyboard testing exposed overlapping saves reporting the app's own
  write as an external conflict. Saves now coalesce identical pending content,
  serialize newer content, keep native hash conflict protection, and avoid handling
  shortcuts already consumed by the editor. A delayed-write regression proves two
  repeated saves share one write and a newer edit is saved afterward.
- Runtime callbacks use current handlers without restarting effects on unrelated
  renders. Terminal creation guards project/session changes, and Restart terminal
  starts a fresh shell after natural exit instead of leaving an unusable session.
- Extracted the normal desktop host into `desktop/application.mjs` so an isolated
  test can use the same protocol, preload, IPC authorization and services. The
  ordinary main entry retains its single-instance and unsaved-close behavior.
  The background test host creates only a non-focusable offscreen renderer, injects
  a fixture directory chooser, prohibits native dialogs, blocks external requests,
  and uses a separate temporary profile. It never launches the user's running app.
- `npm run check` passes lint, 36 frontend/component tests, 32 desktop/native/client
  tests and 36 school tests (104 total), and builds the production bundle.
  Evidence: `.local/desktop-ui-check.log`.
- The source UI run passes 18 checks using real Monaco text/paste, Ctrl+S, bundled
  JSON-worker diagnostics, real native project creation/save/reopen/recent files,
  HTTP preview, xterm input into PowerShell, shell exit/restart, Git stage/commit,
  and native IPC error/capability checks. It records zero visible windows and zero
  native dialogs. Captured welcome/workbench/terminal screens were visually
  reviewed; evidence is in `.local/source-ui-evidence`. This does not exercise
  OS folder dialogs or the installer.
- The current unsigned candidate is built separately in `.local/windows-ui-candidate`.
  Its 61 package checks, 10 archived-service checks, and 18 archived-application
  offscreen UI checks pass. The UI run uses the actual archived host, preload and
  production frontend, with bundled Node/npm/PTY resources. The reports agree on
  archive SHA-256 `0321fd224952f76c28ad2eeaac6c820c66d54b34bb01fd8ae946156a3b4eabc2`.
  Reports/screenshots are `verification.json`, `desktop-services-verification.json`,
  and `ui-evidence/verification.json` in that candidate directory. The packaged
  welcome/workbench/terminal captures were visually reviewed. Installer SHA-256:
  `382A5287431347BCAADABBF8065CB19C6BB6C319D08A8747D9E0FFB2F96D356D`.
- At that checkpoint, release gates remained open: full school and assistant-change
  flows in the real renderer, audit/review/backup catalog scale, Windows branding/update configuration,
  clean-machine installation and native-dialog checks, school network deployment,
  and live AI evaluation/actual school policy approval. The school approver and
  provider key are still not configured. Do not mark the release complete from
  the passing source/renderer checks.

## School renderer, safe saves, and bounded administration histories

- Tested the archived application in an offscreen, non-focusable renderer with
  its real preload, IPC, Monaco workers, Node/npm/PTY, and isolated school server.
  Real accounts exercise first setup, teacher/student invitations, policy revision
  review, classes, selected starter-file approval, assignment creation, a separate
  native student project, snapshot submission, teacher feedback, and backup verify.
- The fixture provider supplies a two-file proposal. The actual Monaco diff review
  applies selected changes to disk and History undoes them, including recovery of
  a newly created file. A blocked fixture request is reviewed and resolved. These
  responses and approvals are isolated test data; they establish neither live AI
  behavior nor actual school approval.
- Ordinary and managed connections both pass. Managed credentials use actual
  Windows encryption, reject personal keys and gateway removal, and retain the
  pinned gateway when saved credentials are cleared. Signing out from Change
  password returns to sign-in. Tests measure zero visible windows and zero native
  dialogs and never access the user's existing app profile.
- Editor models are keyed by project and path. Pending user input can be saved
  before its React state update, while a stale model cannot overwrite a newer
  programmatic change. A save continuation from an old project cannot replace the
  next project's file handles or document state. Separate regressions cover these
  cases; the renderer harness waits for Monaco's asynchronous paste before Save.
- Review and audit histories now have searchable, actor-scoped keyset pages with
  a 400 KB serialized response budget. Tests traverse 350 reviews and 80 large
  audit records, including worst-case character escaping and older resolutions.
- Backup status returns a compact summary; the catalog has searchable pages and
  scoped cursors. Individual catalog records have a 64 KB read limit and normalized
  metadata. Invalid/oversized records remain on disk and raise a status warning;
  valid snapshots remain browsable and verifiable. Tests cover 61 valid records,
  tied timestamps, malformed/oversized records, paging, authorization, and verify.
- `npm run check` passes lint, 40 frontend, 32 desktop, and 38 school tests (110)
  and builds the production frontend. Evidence: `.local/school-review-check.log`.
- The separately built `.local/windows-school-review-candidate` passes 63 package,
  10 archived-service, 41 ordinary renderer, and 44 managed renderer checks. Reports:
  `verification.json`, `desktop-services-verification.json`,
  `ui-evidence/verification.json`, and `managed-ui-evidence/verification.json`.
  All four agree on archive SHA-256
  `e48f574271972739a1631136ccab512c24ab255ca68fa7021a8f2658b76f0734`.
  Installer SHA-256:
  `60415ADB4130A0288C5E146106C645B2FCBE08737A8F4F6847112615D1D3439A`.
  Student feedback, project diff, and administrator Data captures were visually
  reviewed. These checks use the archived app in Electron, not the installed
  executable or real OS folder dialogs.
- Remaining release gates include Windows branding/update configuration (next
  checkpoint), clean-machine installation/native dialogs/recovery, actual school
  network deployment/load checks, live provider evaluation, and a designated school
  approver. The default policy remains draft. No real key has been verified.

## Windows identity and manual-update candidate

- Added a simple editable geometric Mench M mark and deterministic, font-free
  generator for nine Windows icon resolutions (16 through 256 pixels). The window,
  executable, installer, uninstaller, and shortcuts use the same mark. The mark
  was visually reviewed. Actual desktop shell/shortcut rendering remains part of
  clean-machine acceptance.
- Windows executable resource editing is enabled while signing remains disabled
  for this preview. Static PE inspection proves current product/version resources,
  all nine embedded icons, and `asInvoker` permissions. Installer resources have
  the current application description/version and the same embedded icon sizes.
  Both packaged editable assets match their source. A verifier path-separator
  error was corrected; the assets were already present in the package.
- Pinned packaging to x64 to match the bundled runtime, retained the stable
  `org.mench.workspace` app ID, and set the Windows process AppUserModelID. Settings
  identifies version 0.1.0 and administrator-installed updates. NSIS is explicitly
  configured for assisted installation, per-user default with optional elevated
  machine scope, directory choice, Start menu/desktop shortcuts, retained profile
  data, and no launch after setup. These installer behaviors still need execution
  on a clean host; resource inspection cannot prove them.
- Documented manual school-managed updates in `WINDOWS_RELEASE.md`: no automatic
  updater/publishing endpoint, version plus lockfile changes, candidate hashes,
  backups and app shutdown before upgrade, retained data locations, compatibility
  checks, and clean-machine install/upgrade/uninstall/recovery acceptance. No
  signing certificate or distribution endpoint has been configured.
- `npm run check` passes lint, 40 frontend, 32 desktop, and 38 school tests (110)
  plus the production build. Evidence: `.local/windows-branding-check.log`.
  Final tool changes also pass lint; `git diff --check` has no whitespace errors.
- The fresh unsigned candidate is `.local/windows-branded-candidate`, installer
  `Mench AI-Setup-0.1.0-x64.exe`. It passes 70 package checks, 10 archived-service
  checks, 42 ordinary offscreen renderer checks, and 45 managed renderer checks.
  Both renderer runs measured zero visible windows and native dialogs. Settings
  version/update text is checked in the actual renderer. All reports agree on
  archive SHA-256:
  `e1c4504cab458a9d7f514416fdff78b26d3f24dd2860fbcf12ae0bce12892c08`.
  Installer SHA-256:
  `b344687969324540f8121346adb2f4b264713a77e32990a3baa7f6e1edf73836`.
  Reports are `verification.json`, `desktop-services-verification.json`,
  `ui-evidence/verification.json`, and `managed-ui-evidence/verification.json`.
  Package verification now records executable/installer hashes alongside archive
  identity. The provider and policy approvals in these runs remain fixtures.
- Hyper-V services are present/running, but current-account `Get-VM` enumeration
  is denied. No accessible VM, alternative VM CLI, or repository remote was found.
  No installation, native dialog, visible application, existing user profile,
  or existing running app was controlled. The existing `Hebrew rabbi` edit remains
  untouched. All requested work stayed in background commands/offscreen renders.
- Keep the release gates open: clean-machine installed-app and native-dialog
  verification, signed distribution, actual school network/TLS/load and recovery
  acceptance, real provider evaluation with a configured key, and designation of
  the school's actual policy approver. Build/fixture success is not school approval.

## Repeat build and requirement audit

- Rebuilt unchanged source into `.local/windows-repeat-build` without installing
  or launching a visible application. The build completed successfully, and all
  70 package checks passed again. Evidence: `.local/windows-repeat-build.log`,
  `.local/windows-repeat-verification.log`, and the repeat candidate's
  `verification.json`.
- Compared every regular file in both `win-unpacked` directories by relative path
  and SHA-256: 2,394 files in each, no missing/added files, and no content changes.
  This includes the application archive, executable, Node/npm, native PTY, school
  modules, and runtime resources. The archive retains SHA-256
  `e1c4504cab458a9d7f514416fdff78b26d3f24dd2860fbcf12ae0bce12892c08`.
  Evidence: `.local/repeat-build-comparison.json`.
- Installer wrappers differ: original SHA-256
  `b344687969324540f8121346adb2f4b264713a77e32990a3baa7f6e1edf73836`,
  repeat SHA-256
  `05e6076b4019052c3ca23880c863adadee30fc7c1d04fd2f4cf04ed48bbfcfd1`.
  The cause of wrapper-byte variation was not established. Do not describe the
  entire installer as bit-for-bit reproducible or substitute the repeat hash for
  the reviewed original installer. Neither candidate was distributed or installed.
- Re-examined source test assertions, actual renderer paths, package reports,
  recovery checks, and release instructions. Added the current acceptance table
  near the top of this file to map every original gate to its evidence and its
  remaining gap. No full gate was marked complete from narrower fixture results.
- Revalidated external availability: no Gemini key is available in the current
  process, no repository-root `.env*` exists, no school data/host override is set,
  no repository remote is configured, and Hyper-V enumeration is still denied.
  These observations do not establish whether another school computer has a key
  or service. The actual school policy approver is still unspecified. A question
  about a separate Windows acceptance machine is pending; no permission or machine
  availability is inferred from a missing answer.
- Remaining execution depends on a separate clean Windows environment and the
  school's real provider/deployment/reviewer configuration. Background fixture
  tests cannot supply that evidence. The goal remains incomplete and active.

## Context, source indexing, and tutor consolidation (0.2.0)

- Replaced the active browser/desktop/school persona assembly with a shared context
  builder and provider request format. Both old canvas persona configuration files
  now delegate to the same router/profile registry. The full English/Hebrew Rabbi
  blueprint documents remain intact; the pre-existing Hebrew document edit was
  not changed. No blueprint or real school source was automatically approved.
- English and Hebrew use subject terms with word boundaries, Hebrew normalization,
  and conversation-aware follow-ups. Regression cases cover `app` inside `happy`,
  generic Hebrew questions, source-code versus source-research requests, ordinary
  coding questions beginning "Can I", and continued religious/source questions.
  The tutor identifies as AI; style and school source approach/minhag are explicit
  policy fields, independent of response language. Named-rabbi impersonation
  templates are removed from the active and compatibility persona paths.
- School chats and saved project briefs now live on the service, keyed to actor
  and project, with optimistic revisions. No school conversation is written to
  local storage. Account/gateway/project changes clear visible history and briefs
  and cancel obsolete replies. Login generation guards reject stale status and
  request results; an expected-account check protects AI requests during account
  changes. Personal chat stays local. Old unscoped histories remain untouched and
  are not guessed into an account.
- Added bounded recent turns, relevant earlier verbatim excerpts, a user-saved
  project brief, and an estimated 24,000-token context budget. Older oversized
  answers can be shortened; the current question and selected file data are not
  silently cut. Trusted policy is separate from notes, files, source passages,
  and actual process results. Context receipts use readable, expandable labels.
- Added School > Sources: staff draft/import-by-paste, precise reference/author/
  edition/language/keywords, exact-revision review by the current policy nominee,
  revision/retirement history, actor-scoped collection pages, and FTS5 passage
  lookup. Draft/retired/wrong-policy sources cannot enter retrieval. New policies
  require fresh source approval. Unicode passages and offsets preserve original
  text, including Hebrew marks and supplementary characters.
- AI receives up to six approved passages. Source-dependent answers require their
  actual citation IDs; unknown/malformed IDs and missing citations are rejected.
  Source retirement, policy change, or account revocation during generation stops
  release. Practical halachic questions are referred to the human authority; no
  matching approved evidence produces a truthful response without invented model
  research. Numbered citations expand the real text, reference, author and edition;
  revision details remain available behind disclosure controls. No general web
  lookup or embedding service was silently enabled.
- Schema 3 adds sources/passages/indexes and private conversations/briefs. Existing
  schema-2 data migrates; v2/v3 backup verification is supported. Snapshot checks
  validate source hashes, passage boundaries, FTS contents and conversation shape.
  Real restore tests retain sources/chats while revoking sessions and requiring
  new policy/source approval. Deploy matching 0.2.0 client and service; older code
  cannot open a newer database. Procedures are in `CHAT_CONTEXT.md` and setup docs.
- The real renderer check caught missing citation/receipt markup. A focused test
  failed before the repair and passes afterward, including escaped source text
  and explicit brief saving. A Windows run also exposed a temporary atomic-rename
  failure. Writes now retry bounded Windows locks while rechecking capability and
  original content before every attempt. Fault-injection tests prove both recovery
  and preservation of an external edit during the retry. Test fixture cleanup has
  bounded Windows retries and preserves original service-check failures.
- `npm run check` passes lint, 44 frontend, 35 desktop and 51 school tests (130),
  plus production build. After the final disclosure/label polish, all 44 frontend
  tests and lint were run again, and the installer was rebuilt. Evidence:
  `.local/context-final-check.log`, `.local/context-final-frontend.log`,
  `.local/context-final-lint.log`, `.local/context-package-build.log`.
- The unsigned `.local/windows-context-candidate` installer is
  `Mench AI-Setup-0.2.0-x64.exe`. Its 84 package checks, 10 archived-service checks,
  46 ordinary renderer checks, and 49 managed renderer checks pass. Both UI runs
  measured zero visible windows and zero native dialogs, including actual source
  review/cited-answer UI, private conversation and brief boundaries, credential
  handling, assignment feedback, and Monaco apply/undo. Provider responses and
  school approvals are isolated fixtures, not live model/school acceptance.
- All four candidate reports agree on archive SHA-256:
  `bf0ede212c29c4835cc750cd56809a101c66faa1ad01e9c7725ae2e1dbb4e792`.
  Installer SHA-256:
  `d28a4dda689ee21b2a3fb548e1936fd6343b4917d92ffdd08446d745393af1a4`.
  Reports: `verification.json`, `desktop-services-verification.json`,
  `ui-evidence/verification.json`, `managed-ui-evidence/verification.json`.
  Final cited-passage screenshots were visually reviewed in both modes.
- Full release acceptance remains open: live Gemini evaluation with an actual
  configured key, school-selected source corpus/approver and network acceptance,
  signing, and clean-machine installed-app/native-dialog checks. The user has no
  separate test machine yet. This work used only background commands, isolated
  service data and offscreen renderers; no running user app was replaced.
