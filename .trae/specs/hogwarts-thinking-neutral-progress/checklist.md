# Checklist

## Approval

- [x] Fixed PM initial L2 verdict is PASS.
- [x] Replacement PM production-informed verdict is PASS.
- [x] User approved provider-default thinking, activity-only progress and final-content-only authority.
- [x] Current PRD/spec/tasks/checklist revision is explicitly approved.

## Contracts

- [x] Hogwarts GLM-5 named OpenAI/Custom requests no longer inject the extra forced-disabled trio.
- [x] Generic non-Hogwarts Tavern requests are unchanged.
- [x] Final content is the sole parser input.
- [x] Reasoning has no State, chat, Prompt, translation, Knowledge, archive, DOM or storage route.
- [x] Named Schemas, guards and Reducer ownership are unchanged.
- [x] Runtime, model-field, validation and frontend registries are current.

## Calls And Failure

- [x] Every task invocation makes at most one provider request.
- [x] No automatic retry, repair, capability probe, provider fallback or Local fallback exists.
- [x] Provider/parse/Schema/guard failure preserves existing no-write semantics.
- [x] Low Post failure preserves paid Scene and explicit retry/discard.
- [x] Prompt and selected-role capacity measurements remain unchanged.

## Foreground UI

- [x] Every active `blocking=true` role task exposes finite task/phase/elapsed activity.
- [x] Every `blocking=false` task remains silent in foreground UI.
- [x] Activity clears on success, failure, cancellation, navigation and reload.
- [x] Desktop/mobile rendered UI has no overlap or stale activity.
- [x] All visible activity text is localized static content.

## Verification

- [x] Focused request-shape, response-authority, scheduler and UI tests pass.
- [x] Directly affected Scene, Opening, Transition, Calendar, Post, Interior and Map regressions pass.
- [x] Real provider-visible request proves the forced-disabled fields are absent.
- [x] Blind structured-output simulation passes through the real production chain.
- [x] Independent acceptance passes the approved user goal; Agent-created logging/privacy expansion was rejected and rolled back.
