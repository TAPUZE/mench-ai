# School service and desktop connection

This build has a school service and a **School** panel in the Windows app. Its
initial policy is a draft with no nominated approver. School AI remains disabled
until an administrator nominates an approver and that person records approval
of the exact policy revision. No approval has been supplied for this school yet.

## Start the service from this repository

```powershell
npm run runtime:prepare
npm run school:start
```

The service listens on `http://127.0.0.1:4180`. On Windows, its default data
directory is `%LOCALAPPDATA%\MenchAI\school-service`. It writes a private
`setup-token.txt` there for the first administrator. An existing development
database in `.local/school` is preserved and used instead; if both locations
contain school data, startup requires an explicit `MENCH_SCHOOL_DATA` choice.
No provider key is needed for accounts, classes, templates,
assignments, submissions, or feedback.

For AI, supply `GEMINI_API_KEY` in the service process environment using the
school's secret-management/deployment method. Do not put it in student settings
or committed files. `MENCH_AI_MODEL` chooses the server model; its default is
`gemini-3.8-flash`. Provider calls use Google's
[generateContent API](https://ai.google.dev/api/generate-content); the model is
listed in Google's [model documentation](https://ai.google.dev/gemini-api/docs/models/gemini-3.8-flash).
Live provider access still needs verification with the school's real key.

Optional environment variables:

| Variable | Purpose |
| --- | --- |
| `MENCH_SCHOOL_DATA` | Absolute directory for the database and setup token |
| `MENCH_SCHOOL_PORT` | Service port, default 4180 |
| `MENCH_SETUP_TOKEN` | Supply the initial private bootstrap token externally |
| `MENCH_SCHOOL_HOST` | Bind address, default loopback |
| `MENCH_SCHOOL_BEHIND_TLS_PROXY=1` | Required before binding a non-loopback address |
| `MENCH_BACKUP_KEEP` | Automatic snapshots to retain, default 14, range 1–365 |

Keep the data directory accessible only to the service account and school
administrators. Remote clients require an HTTPS service origin. Use a TLS reverse
proxy and restrict direct access to the backend port; the environment flag does
not itself add encryption. TLS deployment and Windows service registration have
not yet been validated for a real school network.

The default is in the service user's private application-data folder. For a
custom directory, school IT must set appropriate Windows permissions for that
service account. Database snapshots contain school accounts and student work;
store off-machine copies only in school-controlled, protected storage.

The installer also includes the service under `resources/school`, with Node
under `resources/runtime`. An administrator can run that service without a
separate Node installation, setting a writable, protected `MENCH_SCHOOL_DATA`
directory. It does not start automatically when a student opens the editor.

## First setup and classroom workflow

1. In the desktop app, open **School** and connect to the service origin. Local
   development uses `http://127.0.0.1:4180`.
2. Choose **First administrator**, enter the private setup token, your name,
   username, and a password of at least 12 characters. Setup can run only once.
3. Under **Accounts**, create one-use invitations for teachers and students.
   Share each token privately with the intended person. Tokens expire in seven
   days. Invitees choose **Use invitation** to create their account.
4. Teachers create classes and add enrolled students by username. Administrators
   can also create a class and choose its teacher.
5. A teacher opens a starter project, chooses files under **Templates**, and
   proposes a draft. An administrator reviews the displayed files and explicitly
   approves it. Only approved templates are offered to students.
6. Teachers publish assignments with instructions and an approved starter.
   Students can create a new local project from it, choosing the project name
   and location. Existing project folders are never silently overwritten.
7. Students submit only the files they check. Open editor contents are included
   in the submitted snapshot. Private/generated paths are rejected on the server.
   Submitting does not save or change local files.
8. Teachers review the stored snapshot and save feedback. Students see their
   submission history and feedback. Teachers see submission and review counts.

School lists now use searchable pages. Open an assignment to read its
instructions, submit a snapshot, or browse its submission history. Starter files
are fetched only when an assignment or template is opened; opening the School
panel does not download every project. Choose **View template files** before
approving a draft. Class rosters also load only when opened.

Use **Next** and **Previous**, or search, to find older accounts, classes,
templates, assignments, and submissions. Teacher/template/class/approver pickers
have their own search and paging, and keep your selection when the search changes.
Submission lists show a feedback excerpt; open the submission to read the full
feedback and stored files. A new assignment arriving while you page does not
duplicate records; refresh to see new arrivals at the top.

Deploy the desktop client and school service from the same candidate. Collection
responses now use `{items, nextCursor, total}` with 25 items by default and a
maximum of 50; file details are separate authorized operations. An older service
that returns whole arrays prompts an update message in the new client.

For AI policy, an administrator uses **Policy** to enter school instructions,
literal blocked terms, and the nominated approver. That reviewer signs in,
reviews the displayed version, confirms it, and records approval notes. A new
draft suspends school AI until the new version is approved. Administrators can
review blocked-request metadata and the audit log without stored prompt bodies.

## Managed Windows clients

School administrators can deploy this file with Windows permissions that allow
administrators to edit it and students only to read it:

`C:\ProgramData\MenchAI\school.json`

```json
{
  "gatewayUrl": "https://school.example.org"
}
```

The desktop process reads this machine configuration and refuses connection
changes or personal provider keys. If a managed configuration is invalid, startup
fails instead of silently reverting to personal AI. Student sessions are retained
in the desktop credential vault, never returned to renderer code. A school
provider key remains only on the service computer.

Personal-mode desktop keys and school sessions use Electron's asynchronous
[safeStorage API](https://www.electronjs.org/docs/latest/api/safe-storage).
Windows uses DPAPI; this protects against other Windows accounts, not programs
running as the same Windows user. Codec persistence and unavailable-encryption
failure paths are tested. `npm run verify:credentials` also runs a real Windows
encryption and reopening check in Electron without creating a window. The
installed application's full credential migration flow remains pending.
Existing browser-local keys are migrated into the vault after successful
protection, then removed from local storage.

If a saved credential file cannot be decrypted, **School** offers **Clear saved
credentials**. This removes local saved sessions and personal keys, then lets
the user sign in again. It preserves projects and any machine-managed gateway.

The browser-only development app remains a personal prototype. Managed school
flows use the desktop client. This program does not replace Windows account,
network, or internet-filter controls.

## Password and administrator recovery

Signed-in users can choose **Change password**, verify their current password,
and set a new password of at least 12 characters. The change signs out all of
that account's sessions, including the current one.

An administrator can issue a one-use reset under **Accounts**. Share the token
privately with the intended user; it expires in one hour and issuing another
invalidates the previous token. Existing sessions are signed out immediately.
The user chooses **Reset password** on the sign-in screen, enters their username,
token, and new password, then signs in normally. The account's role is retained.
The program does not email or send these tokens automatically.

If the last administrator cannot sign in, stop the service and run:

```powershell
npm run school:maintenance -- recover-admin --username admin --confirm admin --data "C:\SchoolData\MenchAI"
```

Use the actual existing administrator username and data directory. The command
prints the path of a private token file and its expiry, rather than the token.
Use that token in **Reset password** after restarting the service. This operation
cannot create an administrator or promote another account. A live service or
another maintenance operation holds an OS lock and prevents offline recovery.

New passwords use versioned scrypt hashes with N=32768, r=8, p=3 and a random
salt, a configuration listed in the
[OWASP password storage guidance](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html).
Existing hashes upgrade after a successful sign-in. Only password hashes and
reset-token hashes are retained in the database.

## School database backup and restore

Administrators use **Data** to create and verify snapshots while the service is
running. The standalone service also checks for a daily automatic snapshot on
startup, hourly, and after first setup. By default it keeps 14 automatic
snapshots; manual and pre-restore snapshots are never automatically pruned.
Check the displayed backup status and maintain protected off-machine copies.
Status is a compact summary; use the searchable catalog pages to find older
snapshots. Malformed or oversized catalog records are retained and reported in
status, while valid snapshots stay usable. Catalog records are limited to 64 KB.

Snapshots use SQLite's consistent
[online backup API](https://nodejs.org/api/sqlite.html), including committed WAL
data. Each snapshot in `backups` has a UUID `.sqlite` file and a matching `.json`
catalog record with its SHA-256 checksum, counts, and policy version. Verification
checks the hash, schema, database integrity, foreign keys, and snapshot data.
Keep both files together. Do not copy just the live `school.sqlite` file while
the service is running. The provider API key is configured separately and is
not included in these snapshots.

From the repository, list and inspect snapshots with:

```powershell
npm run school:maintenance -- list --data "C:\SchoolData\MenchAI"
npm run school:maintenance -- verify --id BACKUP_ID --data "C:\SchoolData\MenchAI"
```

Restore is offline. Stop the service, verify the selected backup, and repeat its
exact ID to confirm replacement:

```powershell
npm run school:maintenance -- restore --id BACKUP_ID --confirm BACKUP_ID --data "C:\SchoolData\MenchAI"
```

The command verifies the selected snapshot, makes a pre-restore safety snapshot
of a healthy current database, and preserves the original database file. Restore
signs out all sessions, invalidates invitations and password-reset tokens, and
creates a new draft content policy with no nominated approver. School AI requires
fresh approval. Accounts, passwords, and school work otherwise come from the
selected snapshot, so changes after that snapshot require the retained originals.

If the current database is missing, damaged, or a previous restore was
interrupted, add `--replace-damaged` to the same restore command. Unreadable
original database and journal files are preserved together. An interruption
record prevents startup from silently creating an empty database; retrying
restore preserves that record as well. Startup also refuses to create a fresh
school when the database is missing but existing backups remain. Do not delete
the preserved originals or restore records until school IT has verified recovery.

In an installed package, use `resources\runtime\node.exe` to run
`resources\school\maintenance.mjs` with the same arguments; npm is not required.

## Verification and remaining release work

`npm run check` includes account and authorization tests, policy/input/output
checks, real HTTP gateway/client integration, encrypted credential persistence,
and rendered component interaction tests for policy approval and assignments.
Provider responses in these tests are fixtures; they do not prove live model
behavior or school suitability.

The classroom paging tests use the real HTTP client with 61 assignments, 62
templates, 242 submissions, and over 120 accounts. They check bounded metadata
responses, on-demand file access, teacher/student isolation, cursor misuse,
search, and newly arriving assignments. Component tests cover next/previous,
older-account selection, late-search rejection, and explicit template review.
These synthetic datasets establish this regression coverage, rather than a
capacity guarantee for an untested school deployment.
Review/audit paging additionally covers 350 reviews and 80 large audit records;
backup paging covers 61 records, corrupt catalogs, and valid snapshot verification.
Collection APIs return `{items,nextCursor,total}`; reviews and audit pages have a
400 KB serialized budget and can return fewer rows than requested. `backup.status`
returns summary/settings without the catalog; authorized `backup.list` pages it.


The current candidate at `.local/windows-community-candidate` also passes 86
packaged-runtime checks through `npm run verify:package --
.local/windows-community-candidate/win-unpacked`, including a real offline npm
install, script execution with bundled Node, packaged PowerShell PTY output,
standalone school-service startup/authentication, password recovery/change,
online snapshot verification, offline restore with a safety snapshot, and real
classroom/template/assignment paging with lazy details and snapshot review. These run without
opening the desktop app. The unsigned installer itself has not been installed
on a clean machine. An additional ten checks through
`npm run verify:desktop-services -- .local/windows-community-candidate/win-unpacked`
load the actual archived desktop modules in a process that creates no windows,
and exercise Git and linked-metadata rejection, project apply/undo and restore,
npm/npx, and terminal output.
The archived frontend also has 48 ordinary and 51 managed offscreen renderer
checks, including actual account roles, reviewed templates, student submission,
teacher feedback, multi-file Monaco review/apply/undo, and backup creation/verify.
Use `npm run verify:desktop-ui -- .local/windows-community-candidate/win-unpacked`
and append `--managed` for the pinned gateway run. No visible windows, native
folder dialogs, OS clipboard, or existing school data are involved. The test
provider and approvals are fixtures. See `WINDOWS_RELEASE.md` for manual updates.


The current filter combines normalized literal-term checks, school system
instructions, and the provider's safety settings. It has no educational-keyword
or developer-mode bypass in managed mode. School review and a broader semantic
adversarial evaluation remain necessary; literal-term checks do not guarantee
all answers follow the school's standards.

Before release, complete live provider evaluation, installed-app credential
verification, real network deployment, clean-machine recovery exercises, and the
remaining gates in `BUILD_READINESS.md`. Automated recovery checks do not prove
a school's deployment or disaster-recovery procedure.

## Existing admin project

The separate `mench-ai-admin-foundation (Mench_ai)` directory was inspected for
reuse. It contains curriculum/source/lesson-review data and useful administrative
workflows. Its current API handlers do not enforce school account authorization,
so this student-facing service does not expose those handlers. The existing
project and its database were left intact. Importing curriculum or linking its
review workflow requires an explicit data mapping and school content review;
it has not been silently copied or marked approved.

## Community frameworks, source library and private chat (0.3.0)

Deploy desktop and service 0.3.0 together. **School > Sources** lets staff submit
precisely referenced passages for review. Only the current approved policy's
designated reviewer can approve the exact revision. Students and AI search see
only currently approved sources. Revised text stays draft until reviewed; source
retirement or a policy change prevents further use under the old approval.

In **School > Policy > Prepare a new policy revision**, enable the English and
Israeli blueprint families. Review each family's guidance, additional blocked
terms, baseline voice and permitted voices. Choose the permitted frameworks,
language-based or fixed default, and whether explicit overrides are allowed.
The nominee must approve the exact full instruction snapshot. Existing approvals
continue using their earlier framework until this new revision is approved.

In **Settings**, Hebrew automatically selects Israeli and English selects
English-speaking unless the school sets a fixed default. A permitted explicit
framework override survives answer-language changes. Users may choose a response
approach or let it match the question. The approaches are AI styles inspired by
the original blueprints; they do not impersonate a real rabbi or supply evidence
of his views. Common school restrictions apply across all profiles.

With communities enabled, source approval must specify English, Israeli or both.
The source's written language does not determine its community approval. Student
browsing, retrieval and final response checks enforce the selected scope.

Chat transcripts and saved project briefs are private service records per account
and project, included in protected school backups. They are absent from student
browser local storage. History keeps up to 80 messages within 240 KB; project
briefs hold up to 4,000 characters. Administrators should include these student
records in their normal retention/access procedures. Old unscoped local histories
remain untouched and are not automatically imported into an account.

Schema 4 migrates existing schema-2/3 data, retaining sources, passage indexes,
conversation records and policy snapshots, and adds source approval scopes.
Back up before upgrading. A restore retains the data,
revokes sessions, and creates a draft policy: sources require approval under the
new policy before AI can retrieve them. See [CHAT_CONTEXT.md](CHAT_CONTEXT.md) for
request boundaries, indexing, citations, memory, and evaluation limits.
