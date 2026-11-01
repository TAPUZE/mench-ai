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
