# P2-07 Home and Configuration Layout Evidence

Date: 2026-08-15

Server:

```text
http://127.0.0.1:8001
current worktree process
```

No save card was opened. Tina was not loaded, migrated or saved.

## 390 x 844

- CSS viewport: `390 x 844`
- device pixel ratio: `2`
- document client/scroll width: `390 / 390`
- Home bounds: `0..390`
- horizontal viewport violations: `0`
- overlapping interactive controls: `0`
- campaign option width: `309`
- year/grade columns: `151 + 151`
- difficulty columns: approximately `100 + 100 + 100`
- the save excerpt uses its intentional single-line ellipsis

Screenshot:

[p2-07-home-390x844.png](./p2-07-home-390x844.png)

## 1440 x 1000

- CSS viewport: `1440 x 1000`
- device pixel ratio requested by the audit: `1`
- document client/scroll width: `1440 / 1440`
- Home bounds: `0..1440`
- horizontal viewport violations: `0`
- overlapping interactive controls: `0`

Screenshot:

[p2-07-home-1440x1000.png](./p2-07-home-1440x1000.png)

## Settings and Profile Editor at 390 x 844

The display locale was switched to `en` through the real segmented control.
No Profile was saved, tested, imported, deleted or rebound.

Settings dialog:

- dialog bounds: `16.5..373.5 x 50.64..793.36`
- document width: `390`
- horizontal viewport violations: `0`
- overlapping visible interactive controls: `0`
- dialog horizontal scroll: `0`
- visible Han runs: `0`

The first Profile Editor inspection found two nested vertical scroll regions:
the generic dialog was capped at `88vh` while its frame was capped at `92vh`.
The bottom action row extended below the dialog, partially clipping the Save
button. The Profile-specific dialog limit now matches its frame and the outer
dialog clips instead of scrolling.

Post-fix Profile Editor:

- dialog/frame bounds: `16.5..373.5 x 33.76..810.23`
- document width: `390`
- outer dialog scroll range: `0`
- content scroll range: `340`
- horizontal viewport violations: `0`
- clipped interactive-control overlaps: `0`
- Save button fully visible: `true`
- manual Model placeholder:
  `For example: gemini-3.1-pro-preview`
- visible label/placeholder/aria Han runs: `0`

The audit page was returned to `zh-CN`, `1440 x 1000`, and the Home screen
after verification.

## Result

Home passes the P2-07 narrow and wide layout gate. Settings and the Profile
Editor pass the `390 x 844` configuration gate after the Profile-specific
single-scroll fix.
