# Post Failure Isolation Tasks

Status values: `pending`, `in_progress`, `blocked`, `completed`.

| ID | Task | Dependencies | Expected files | Verification | Status |
| --- | --- | --- | --- | --- | --- |
| PFI-01 | Reconcile VCON-013 and all eight Post field routes with the approved failure matrix. | User approval of artifact revision 1 | Validation registries; model field routes; state fields | Registry consistency checks | completed |
| PFI-02 | Split server root viability from family-local parsing and diagnostics. | PFI-01 | `src/hogwarts-mud/local-semantic-adjudicator.js`; focused parser tests | Root and mixed-family test matrix | completed |
| PFI-03 | Make browser perception and temporal rejection family-local, including `player` normalization. | PFI-02 | `adapters/local-semantic.js`; focused Post tests | Real incident fixture plus sibling-family commit tests | completed |
| PFI-04 | Implement typed movement normalization/discard/block policy. | PFI-01 | `domain/movement-post-settlement.js`; movement tests; workflow callers | Complete approved movement matrix | completed |
| PFI-05 | Narrow workflow failure mapping and preserve atomic revision/Reducer/persistence blocking. | PFI-02, PFI-03, PFI-04 | `workflows/turn.js`; pending settlement/turn tests | Main and retry parity; no partial writes | completed |
| PFI-06 | Verify model-call budget, prompt byte identity, diagnostics privacy, and focused regressions. | PFI-05 | Existing focused suites; generated evidence | Deterministic tests and build-only comparison | completed |
| PFI-07 | Run required blind Low/Local simulations and real-save browser acceptance. | PFI-06 | Acceptance evidence under this directory | One-shot traces and rendered outcomes | blocked |
| PFI-08 | Run one fresh independent acceptance Agent and close documentation. | PFI-07 | Checklist, progress, registries, Product Spec | Criterion-by-criterion PASS | completed |

At most one task may be `in_progress`. No implementation task starts before
explicit approval of PRD/spec revision 1.
