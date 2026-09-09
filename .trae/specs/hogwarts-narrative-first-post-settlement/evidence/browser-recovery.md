# Recovery Renderer Verification

2026-09-09. Production `createStoryRenderer`, static locale catalog and existing
stylesheet run in an isolated browser fixture, no game save access or model calls.
Playwright Chromium revision 1194, desktop 1280x850 and narrow 390x850.

Command:

```sh
PLAYWRIGHT_BROWSERS_PATH=0 node tests/hogwarts-mud-post-recovery.e2e.mjs
```

Result: 14 rendered states PASS (seven per viewport):

- Pending: available supplement/defaults controls; two failed categories.
- Spent and reserved: supplementary action unavailable.
- Movement uncertainty: conservative defaults unavailable.
- Save conflict: actions disabled.
- Legacy V1: bounded validated recovery projection provides reachable selection.
- Initial storage failure: session prose remains visible, explicit not-saved
  warning, no misleading durable-pending/supplement action. Clicking the
  storage-only retry sends `{saveOnly:true}`, then removes the unsaved warning
  and restores the pending selection without changing displayed prose. The
  fixture callback models successful storage; actual guarded ports are tested
  separately in the workflow integration tests.

Changing a checkbox, redrawing and submitting retained the selection and sent only
the remaining selected group. The post-submit action became disabled. No page
errors occurred. Width and title/field/action geometry assertions passed.

The first narrow screenshot exposed a two-column layout squeezing title and
checkboxes into a vertical strip. This was a real usability failure despite no
outer overflow. A dedicated recovery layout now places actions below the content,
allows wrapping, and removes the default fieldset frame. Screenshots were retaken
and visually inspected after repair:

- [390px](./recovery-390.png)
- [1280px](./recovery-1280.png)

Limits: message body localization is fixture-provided. Message-local speaker
lookup was subsequently expanded to eight real-message-renderer cases (four per
viewport): translated local name, pending local name and duplicate conflicting
declarations, plus a declaration colliding with a canonical Actor ID.
Exact `message_speaker/message:1:speaker:temp_delivery_person/
displayNameEn` lookup is asserted; unknown speakers do not request `actor_core`
names/roles, visible IDs/English names are absent. These eight cases pass alongside
the 14 recovery states. Translation rows remain fixture-provided, not a live
translation job. Full application's reload/composer/archive flows have not yet
passed browser acceptance. NFP-UI-001/002/003 remain PATCH, not YES.
