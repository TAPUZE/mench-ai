# Run Kosher AI / Mench AI locally

The Windows desktop app provides native project folders, a locally bundled
Monaco editor, real project processes and terminal, and Git support. The browser
version is also available, with fewer runtime capabilities.

## Windows desktop

From this directory, with Node.js and npm available:

```powershell
npm ci
npm run runtime:prepare
npm run build
npm run desktop:start
```

`desktop:start` opens a visible application. For frontend development, run
`npm run dev` in one terminal and `npm run desktop:dev` in another.
The installed build bundles Node, npm, and Git support. Project dependency
installation may still need internet access.

To test and package without opening the application:

```powershell
npm run check
npm run desktop:build
```

The second command produces an unsigned Windows installer under `release`;
it does not install or launch it. To keep candidates separate, use
`npm run desktop:build -- --config.directories.output=.local/windows-candidate`.
Tests use temporary projects and do not control the user's desktop.
Clean-machine installer validation remains a separate release gate.

`check` includes ESLint across the application and services, automated tests, and
the production bundle. To exercise the actual renderer in the background:

```powershell
npm run build
npm run verify:desktop-ui -- --source
```

This runs the real Monaco editor, JSON worker, preview, Git, and PowerShell terminal
in an isolated offscreen renderer. It uses temporary folders and its own profile;
it neither shows windows nor uses the OS clipboard or native folder dialogs.
Screenshots and the report are saved in `.local/source-ui-evidence`. Build first
after changing frontend source so this check uses the current bundle.

For the current UI candidate, `npm run verify:package --
.local/windows-community-candidate/win-unpacked` checks the actual packaged runtime
and school service without opening the app. `npm run verify:credentials` checks
Windows encryption in a process that creates no windows. These do not execute
the installer or establish clean-machine installation success.

`npm run verify:desktop-ui -- .local/windows-community-candidate/win-unpacked` loads the
actual archived desktop host and production frontend with their bundled runtime.
It runs 48 real renderer checks in the background and writes screenshots and a
report in the candidate's `ui-evidence` folder. This uses Electron's
[offscreen rendering](https://www.electronjs.org/docs/latest/tutorial/offscreen-rendering);
native folder dialogs are replaced only in the test host with its isolated
directory chooser. The normal application retains its native folder dialogs.

Add `--managed` to run the 51-check managed configuration, which rejects personal
keys and gateway removal and tests credential recovery with its pinned gateway.
Both modes start their own temporary school server and exercise real roles,
policy/template review, assignments, submission/feedback, backup verification,
and Monaco multi-file diff/apply/undo. The provider response and policy approval
are fixtures; these checks do not call a live model or approve the school's rules.
Managed evidence is saved under `managed-ui-evidence`. See
[WINDOWS_RELEASE.md](WINDOWS_RELEASE.md) for versioning and deployment updates.


In the desktop app, **Run project** starts the actual development script when
available, or serves a static website. Tasks expose install/build/test output,
exit status, and stopping. **Terminal** opens PowerShell in the project folder.
**Source control** provides initialization, diffs, staging, and commits.
Project search and saved file revisions are available in the lower panel.
Use **Restart terminal** to stop the current shell and open a fresh session,
including after `exit`. Repeated save shortcuts share the pending save, and newer
edits queue behind it; genuine external file changes still require review.

Source control uses an in-project `.git` directory and rejects linked metadata
and external worktree pointers. Open a standalone checkout for those repositories.
It stages individual files, keeps recovery data out of commits, and reports
damaged committed objects instead of presenting a misleading empty diff.

Editing, saving, preview, terminal, tasks, and Git do not require an AI API key.
In personal desktop mode, the Assistant requires a Google Gemini key in
**Settings**, protected with Windows credential encryption. In school mode,
the key is configured only on the school service; students sign in without
receiving it. The **School** panel provides accounts, classes, assignments,
template review, policy approval, and teacher feedback. See `SCHOOL_SETUP.md`.
The school's approver has not been selected, so its initial policy remains a
draft and school AI is disabled. Live AI has not been verified with a real key.
See `BUILD_READINESS.md` for the remaining release gates.

School accounts support password changes and administrator-issued one-use reset
tokens. If the desktop cannot read its encrypted credential file, **School** can
clear saved credentials so you can sign in again; projects are preserved.
Administrators have a **Data** panel for consistent school database snapshots
and an offline maintenance command for restore or last-administrator recovery.
See `SCHOOL_SETUP.md` for storage locations, retention, and recovery commands.

School collections use searchable pages. Open an assignment to see its
instructions and submission history; open a template to fetch its files. Class
rosters and full submission feedback load on demand. Search inside the assignment
and account pickers to select older records beyond their first page. Reviews,
audit history, and the backup catalog also provide search and next/previous pages.
Pages can contain fewer than the requested rows to stay within their byte limit.

## Project-wide editing and recovery

- In the Assistant, expand **Project context** and check the files you want to
  send. The current-file checkbox is separate. Private credential files and
  generated folders are excluded. Context is limited to 20 files and 100,000
  characters; smaller context also leaves room for your conversation.
- A multi-file suggestion appears as a summary and file list. **Review project
  changes** opens a per-file diff with individual selection. Save unsaved edits
  in affected files before preparing the review.
- **Apply and save** writes only the selected files and keeps a recovery journal.
  The app checks for disk changes before applying. Failed groups roll back when
  the files still match the recorded versions; conflicting newer work remains
  intact and the group stays available for recovery.
- Use **File → Project changes** or **History → Project changes** to review a
  group, undo it, or recover an interrupted apply. Undo protects newer edits and
  moves files created by the group to project trash.
- Right-click an Explorer entry, or press **Shift+F10**, for **Rename or move**
  and **Move to project trash**. Renaming preserves unsaved editor contents.
  Moving an entry to trash asks before saving any unsaved files inside it.
- **File → Deleted files** opens the restore list. Trash payloads and a recovery
  catalog stay inside `.mench/trash` in the project; they can be rediscovered in
  a new app profile. Restore does not overwrite an existing path. Keep `.mench`
  with the project if you need its deleted-file recovery data.
- Assistant task suggestions offer only install, run, build, and test. A command
  starts only after your click. Choose **Task output** explicitly to send actual
  process output, status, and exit code back to the assistant. Output can contain
  project data, so check what you choose to share.

The editor supports UTF-8 text. Binary and invalid UTF-8 files are rejected
before editing or AI change journaling to avoid losing their original bytes.
The internal recovery folder is hidden in Explorer, excluded from AI context,
and ignored by the app's Git controls.

UI test files run sequentially and use separate Vite caches to reduce background
memory use and avoid changing the development server's cache. A packaged backend
check is available with `npm run verify:desktop-services --
.local/windows-community-candidate/win-unpacked`; it creates no windows and does not
install the application. It tests actual archived service modules, bundled npm
and npx, real terminal output, Git, apply/undo, and restore.

## Browser version

From this directory, run `npm run dev`, or double-click `run-server.bat` on Windows.
Open http://localhost:3000. If dependencies are missing, run `npm install` first.

AI chat requires a Google Gemini API key. Enter it in **Settings**. This app stores
the key in this browser's local storage; it does not use the other Mench-ai
project's backend `.env`. Browser storage is separate for `localhost` and
`127.0.0.1`, so use the same address when returning to the app.

The app opens to **New project**, **Open project**, and **Recent projects**.
Use Chrome or Edge for local folder access.

- **New project:** enter a name, choose a simple website or an empty project, and
  choose the parent folder. A new project folder is created there.
- **Open project:** select an existing folder. Recent projects can be reopened
  from the welcome screen; the browser may ask for folder access again.
- **Previous browser canvases:** earlier saved canvases remain available on the
  welcome screen and can be saved into a project folder.
- **Save:** Ctrl+S writes the current file to disk. Ctrl+Shift+S saves all open
  files. A dot on the tab marks unsaved work. Drafts are also backed up in this
  browser and restored when the project is reopened.
- **Files:** select files in Explorer to open tabs. Ctrl+N creates a file, Ctrl+O
  opens a project, and Ctrl+B shows or hides Explorer. Panel dividers resize the
  Explorer and Assistant.
- **Preview:** previews HTML with local CSS and JavaScript. This is a static web
  preview, not a Node.js server or an npm terminal.
- **AI:** one optional Assistant panel. File content is shared only when
  **Include [filename]** or an explicit **Project context** file is checked.
  Single-file suggestions can be reviewed as a diff, applied to the editor,
  and explicitly saved. Group apply/undo and project tasks use the desktop app.

Content protection and the existing Torah-centered assistant instructions are
configured in Settings. Earlier chat/canvas data is left intact.

`npm test` checks project creation, saving, recovery, and workspace behavior.
`npm run build` verifies the production bundle.

## Community profiles, chat context and approved sources (0.3.0)

See [CHAT_CONTEXT.md](CHAT_CONTEXT.md) for the canonical bilingual tutor pipeline,
account-private history, saved project briefs, estimated context budget, and
approved-source search/citations. Deploy the matching 0.3.0 school service before
using school chat. Personal mode has no approved source library or web lookup.
The source library starts empty; importing a draft never grants school approval.

Settings defaults Hebrew to the Israeli blueprint family and English to the
English-speaking family. Choose a permitted explicit framework override to keep
that outlook independently of answer language, and choose a response approach or
automatic voice selection. School mode exposes only administrator-permitted,
exact-revision-approved frameworks and voices. Original blueprint documents are
preserved. See CHAT_CONTEXT.md for the full families and their source scopes.
