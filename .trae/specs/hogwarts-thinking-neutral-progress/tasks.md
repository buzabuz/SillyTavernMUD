# Tasks

| ID | Task | Dependencies | Expected files | Verification | Status |
| --- | --- | --- | --- | --- | --- |
| HTNP-01 | Register response-channel and ephemeral activity contracts. | approved artifacts | runtime contracts, validation registries, frontend registry, README | registry parsing and cross-reference checks | completed |
| HTNP-02 | Remove Hogwarts forced-thinking injection and make final content the sole response authority. | HTNP-01 | chat-completions backend, model adapter | focused request-shape, parser, and call-count tests | completed |
| HTNP-03 | Add scheduler-owned foreground activity and elapsed-time UI across blocking workflows. | HTNP-01 | scheduler, application ports, UI session/renderers/locales/styles | focused lifecycle and DOM tests | completed |
| HTNP-04 | Run deterministic and directly affected regression suites. | HTNP-02, HTNP-03 | tests only | tests, ESLint, syntax, diff checks | completed |
| HTNP-05 | Run real provider request capture, blind structured-output simulation and browser acceptance. | HTNP-04 | acceptance evidence only | one-call/content-only/provider/browser evidence | completed |
| HTNP-06 | Run fresh independent acceptance and close documentation. | HTNP-05 | checklist/progress/registry status | goal-derived acceptance of approved scope | completed |
