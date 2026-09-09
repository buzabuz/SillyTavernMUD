# Browser Acceptance

Date: 2026-09-08

Surface: Hogwarts MUD AI Configuration -> Edit Connection Profile

Viewport: 615 x 770

| Registry row | Case | Rendered result | Result |
| --- | --- | --- | --- |
| SETTINGS-002 / SETTINGS-004 | `https://api.svips.org/` under Custom source | Input receives a red border; localized red status text says the value may not be an API base and gives a `/v1` example. Save and test commands remain available. | PASS |
| SETTINGS-002 / SETTINGS-004 | `https://api.svips.org/v1` | Inline warning and red input emphasis disappear immediately. | PASS |
| SETTINGS-004 | Existing correct Custom Profile opened | No visible warning before editing. | PASS |

The warning wrapped within the dialog without clipping or overlapping the API
Key field. No profile was saved and no gameplay or model request was triggered
for acceptance.
