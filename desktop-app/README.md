# Mench AI Windows desktop workspace

Version 0.3.0 is a Windows x64 preview. The desktop and school service share one
context pipeline with separately configurable English-speaking and Israeli
community frameworks. Hebrew defaults to Israeli and English to English-speaking;
school-approved explicit overrides and voice choices are available in Settings.

## Run locally

Use Windows with Node.js 24 and npm. From this directory:

```powershell
npm ci
npm run runtime:prepare
npm run build
npm run desktop:start
```

For the browser version use `npm run dev`. For desktop frontend development,
prepare the runtime, then run `npm run dev` in one terminal and
`npm run desktop:dev` in another.

The editor, files, terminal, preview and Git work without an AI provider key.
Live AI needs a Gemini API key configured in personal Settings or centrally on
the school gateway. School profiles and sources require actual school approval.
Do not use fixture approvals as deployment approval.

## Railway browser deployment

Railway serves the browser workspace from this directory's Dockerfile. Set the
service root to `/desktop-app`, Dockerfile path to `Dockerfile`, and healthcheck to `/healthz`.
These are service settings; no deprecated `railway.json` configuration is needed.
The production server binds Railway's `PORT` on all interfaces and exposes
`/healthz`; it serves only the compiled `dist` directory. No database or volume
is needed for the browser workspace. Projects stay in each user's chosen local
folders, with browser-local settings and recent-project references.

Live browser AI uses the Gemini key each user enters in Settings. Do not place a
shared key in frontend environment variables. Managed school accounts, source
approval screens, native terminal and Git remain desktop/service features.
Chrome or Edge is required for the browser's local-folder APIs.

Run the same web server locally with `npm run build` and `npm run web:start`.
The Docker build skips Electron/native install scripts because the web bundle
does not use them; the runtime image contains only Node, compiled assets and
the production static server.

## Verify and package

```powershell
npm run check
npm run desktop:build -- --config.directories.output=.local/windows-community-candidate
npm run verify:package -- .local/windows-community-candidate/win-unpacked
npm run verify:desktop-services -- .local/windows-community-candidate/win-unpacked
npm run verify:desktop-ui -- .local/windows-community-candidate/win-unpacked
npm run verify:desktop-ui -- .local/windows-community-candidate/win-unpacked --managed
```

The verification hosts run offscreen with isolated test data. They do not install
the app or establish live-model, actual-school, or clean-machine acceptance.
Runtime downloads are prepared by the scripts; generated runtimes, dependencies,
installers, credentials, databases and local evidence are not committed.

- [Local setup](LOCAL_SETUP.md)
- [School setup and administration](SCHOOL_SETUP.md)
- [Chat context, source indexing and community voices](CHAT_CONTEXT.md)
- [Windows packaging and updates](WINDOWS_RELEASE.md)
- [Build readiness and outstanding release gates](BUILD_READINESS.md)

This directory was imported from desktop source commit
`59028a707e187c0cf0ebdcbd547951786a76d436`. The original blueprint documents
`English Rabbi` and `Hebrew rabbi` are preserved as design material.
