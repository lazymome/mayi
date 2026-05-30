# Tapnow integration baseline

This document records the safe integration boundary for `.tapnowproj`, the legacy canvas autosave flow, local media jobs, and the first App.jsx extraction.

## `.tapnowproj` fields

- `projectName`, `createdAt`, `updatedAt`, `workspaceMode`: project shell metadata.
- `script`, `storyboard`, `timeline`: video workbench data.
- `assets`: unified local asset records with `path`, `hash`, `thumbnailPath`, and metadata.
- `generationJobs`: queued generation/export jobs.
- `canvas`: reserved bridge target for the legacy canvas snapshot.
- `exportPresets`: export defaults.

## Legacy canvas autosave boundary

The legacy canvas in `src/App.jsx` keeps its existing storage keys and restore behavior:

- `tapnow_autosave`
- `tapnow_autosave_meta`
- IndexedDB database `tapnow_autosave_db`
- IndexedDB store `autosave`
- `tapnow_asset_bundle_meta`

Current implementation keeps this autosave path intact. The `.tapnowproj` project store does not overwrite legacy canvas autosave yet; a later bridge should copy a sanitized canvas snapshot into `project.canvas` while preserving the original autosave fallback.

## Verification checklist

1. Web dev startup: `npm run dev`.
2. Electron dev startup: `npm run desktop:dev`.
3. Frontend production build: `npm run build`.
4. Python syntax check: `python -m py_compile localserver/tapnow-server-full.py`.
5. Media status smoke test: start localserver and call `GET /media/status`.
6. Media job smoke test: create a `thumbnail` job with an existing image/video path and poll `GET /media/jobs/<id>`.
7. Project IO smoke test in Electron: New -> Save As `.tapnowproj` -> Open saved project.

## Progressive App.jsx split rule

Only low-risk boundaries should move first. The first extraction moves the passive event console filter to `src/app/installConsoleFilters.js`; canvas state, autosave orchestration, local image storage, and asset URL resolution remain in `src/App.jsx` for now.
