# Windows release and updates

The current version is **0.3.0, an unsigned school preview**. It is not yet
approved for school deployment. See [BUILD_READINESS.md](BUILD_READINESS.md) for
the unverified release gates. The real school policy stays draft until its
designated reviewer approves the exact revision.

## Packaging

Build from the lockfile with Node/npm available:

```powershell
npm ci
npm run check
npm run desktop:build -- --config.directories.output=.local/windows-community-candidate
npm run verify:package -- .local/windows-community-candidate/win-unpacked
npm run verify:desktop-services -- .local/windows-community-candidate/win-unpacked
npm run verify:desktop-ui -- .local/windows-community-candidate/win-unpacked
npm run verify:desktop-ui -- .local/windows-community-candidate/win-unpacked --managed
```

These commands build and test in the background; they do not install the app.
An earlier 0.1.0 repeat build matched all 2,394 unpacked application files byte
for byte; its NSIS installer wrappers had different hashes. This is historical
evidence and does not establish 0.3.0 byte-for-byte reproducibility. Use the exact reviewed installer
hash for distribution, and do not claim whole-installer byte reproducibility.
The comparison report is `.local/repeat-build-comparison.json`.

The installer is `Mench AI-Setup-0.3.0-x64.exe`. Node, npm, Monaco, and Git
support are bundled. PowerShell must be present; package installation can require
network access. This build targets Windows x64 only. Clean Windows runtime
compatibility still requires the validation below.

The editable geometric mark is `desktop/assets/mench.svg`; regenerate its nine
Windows ICO sizes with `npm run brand:generate`. Electron Builder edits executable
icon, product, version, and execution-level resources while signing is explicitly
disabled. The app uses the stable ID `org.mench.workspace` and runs as the signed-in
user. See the [Electron Builder v26 Windows options](https://www.electron.build/v26/docs/win/)
and [NSIS options](https://www.electron.build/v26/docs/nsis/).

Settings shows the app version. The assisted installer defaults to per-user
installation, permits a different directory or an administrator-authorized
machine installation, and creates Start menu and desktop shortcuts. It is configured not to
launch the app after installation. Uninstall is configured to retain application
data by default. Test these behaviors on a clean machine before release.

## School-managed updates

There is no automatic download or updater endpoint. `publish: null` and
`--publish never` prevent accidental publishing. School IT distributes a reviewed
installer through its existing deployment process; students do not enter an
update URL or install updates from the assistant.

For each release, increment `package.json` and the lockfile together (for example,
`npm version patch --no-git-tag-version`), retain the product name/app ID, and
build a new candidate directory. Record the installer SHA-256, source checks,
package reports, and UI reports together. A release number identifies one
distributed build; do not distribute different installers under the same version.
Before public distribution, configure an actual signing identity and re-enable
signing; no publisher certificate is configured in this preview.

Before upgrading, save project files, stop project processes, close the app, and
make a verified school database backup using [SCHOOL_SETUP.md](SCHOOL_SETUP.md).
Keep project folders, including their `.mench` recovery data, and the previous
installer. Install the newer version in the same scope/location. Reopen it and
check the version, managed gateway, sign-in, recent project, actual save, terminal,
and assignment access. This procedure has not yet been verified on a clean host.

User data lives outside the installation directory: desktop profile and encrypted
credentials under the user's AppData, projects in their chosen folders, school
data in its configured service directory, and managed gateway configuration under
`%ProgramData%\MenchAI\school.json`. The installer neither provisions nor updates
a running school service. Review service/schema compatibility separately. A
rollback requires compatibility with existing data; preserve backups before
attempting it and use the documented offline restore when necessary.

## Clean-machine acceptance

Use a disposable Windows x64 VM or dedicated test computer, with no Node/npm/Git
installation and no existing Mench profile. Do not run installer acceptance on
the user's working computer.

1. Record Windows build/architecture, account permissions, candidate installer
   SHA-256, and installer/executable signature status.
2. Install as a standard user. Verify directory choice, shortcuts, product icon,
   version details, and that setup finishes without launching the app. Launch
   deliberately inside the test machine.
3. Test the real native New/Open folder dialogs, cancellation, Unicode paths,
   recent projects, editor input, exact disk saves, and draft recovery after
   forced app termination.
4. With no developer tools installed, exercise bundled npm install/build/test,
   live preview, PowerShell input/resize/restart, Git commit/diff, and process
   cleanup on app exit.
5. Connect to an isolated school service in managed mode. Check role boundaries,
   approved test template and assignment, submission/feedback, encrypted
   credentials after restart, blocked personal key configuration, backup verify,
   and the documented offline recovery procedure. Test live AI separately with
   the actual configured provider and authorized school evaluation.
6. Test an upgrade from the previous distributed version. Confirm retained
   projects, drafts, credentials, gateway, and school work. Test uninstall and
   reinstall, with retained profile data and a new clean profile.
7. Repeat applicable tests in machine-install scope and on the school's actual
   network/TLS/proxy setup. Record failures and attach evidence before closing
   the release gates.

On the current workstation Hyper-V services are running, but `Get-VM` is denied
for this account. No accessible clean VM or repository remote has been identified.
No installer acceptance or native OS dialog test has been run on this host.
