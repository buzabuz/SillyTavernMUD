# Revision 25 Post Provider Blind Simulation

Status: PASS for the shared VCON-013 request contract.

Date: 2026-08-19

## Request Isolation

Two fresh no-history model contexts each received only the final production
post System message, canonical User input and transport JSON Schema. They did
not receive this PRD, source code, validators, expected answers or repair
feedback. Each was instructed to answer once.

```text
System hash: bfd565e6f8c6fe0ee0372865e00ff6bbc30cf6a42a9d25f591e9c4d5582df628
User hash:   178b3761a1f7ec691de79e895ae84a878d86ca15ab0b86c7e4716c33ecc9b4e3
Schema hash: c237b74148ecc346c19eaa61694a8cea37141b489359969087ce6398785012f2
```

## Untouched One-Shot Results

Both responses were strict-schema JSON and passed unchanged through
`settlePostTurnModelResult()`:

| Fresh response | Schema | Actor proposal | Perception guard | Temporal guard | Follow-up call |
| --- | --- | --- | --- | --- | --- |
| 1 | pass | one supplied Hermione activity update | pass | zero rejected | none |
| 2 | pass | one supplied Hermione activity update | pass | zero rejected | none |

Both kept Material empty, set the Item route false, used exact narrative
evidence and referenced only the supplied Actor ID. No repair, retry,
Low/Local fallback, semantic Regex or dynamic 4B request was issued.

This proves request-contract behavior only. It does not claim five-family
quality across a corpus or an external Low Profile runtime result.
