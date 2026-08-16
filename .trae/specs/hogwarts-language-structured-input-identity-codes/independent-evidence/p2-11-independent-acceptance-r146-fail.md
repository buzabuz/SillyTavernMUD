# P2-11 Independent Acceptance: FAIL

Status: failed

Task ID: `db35aad5-d093-4c9d-9140-6ecf8cb9d217`

Verifier: `independent_phase2_acceptance`

Fresh-context declaration:

- the verifier was a fresh independent Agent;
- it received the project goal and authoritative PRD, Spec, checklist, living
  contracts and frontend registry paths;
- it was read-only with respect to production code, tests and real saves;
- it designed and executed acceptance independently from the implementation
  Agent.

## Scope

The verifier inspected:

- all five Revision 4 artifacts and living contracts;
- the 196-row frontend dynamic-field registry;
- production source and focused/regression tests;
- the active Tina save and TranslationTable;
- Home, Settings, Setup, current Game/messages, Calendar, People/Composer,
  Relationship Constellation, three Actor Dossiers and nine visible Items.

Calendar expansion covered all 17 entries, the single Storyline and all eight
beats.

## Result

Final result: **FAIL**

Primary failures reported:

1. `56` registry routes still contain `PATCH`, which remains a failing route.
2. Harry, Hermione and Lavender Dossiers displayed English memory summaries
   and persistent localization status in the verifier's browser session.
3. TranslationTable revision `238` contained one current visible
   `SOURCE_LOCALE_LEAK` row:
   `item/harry_signed_parchment/detailEn`.
4. The verifier observed stale English Home/Calendar chrome even though the
   current source contained Chinese replacements.
5. zh-CN Settings exposed the complete English world-system Prompt.
6. Active-save Prompt measurement failed:
   - Scene Transition: `76,531 > 76,100`;
   - Social latest evidence: `82,386 > 80,000`.
7. Task 6 UI regression retained the explicitly known module-size failures:
   - `workflows/social-memory.js`: `2,197 > 2,000`;
   - `index.js`: `610 > 600`.
8. The real-Tina Knowledge activation test failed one historical retrieval
   assertion.

## Evidence Boundary

The verifier started against Tina revision `145` and TranslationTable revision
`217`. While it was running:

- the implementation Agent repaired the approved timeline writer defect
  through a guarded whole-timeline rewrite, producing Tina revision `146`;
- browser activity and the old running server degraded ready rows to error
  before the server-side ready-precedence fix was deployed;
- the TranslationTable advanced to revision `238`.

The verifier therefore stopped exhaustive remaining Map, historical-message,
Actor and relationship-detail expansion because its evidence crossed both save
and TranslationTable revisions.

The verifier made no direct save, retranslation, model, submission or mutating
API call.

## Main-Agent Follow-Up

This FAIL cannot approve Phase 2.

After the verifier's baseline:

- the Node service was restarted with ready-row precedence;
- `45` current error rows with durable ready history were restored through the
  versioned upsert API;
- a submitted late error was proven unable to increment the revision or
  downgrade ready;
- the real timeline row was migrated from `label` to
  `summaryEn/sourceRef`, producing Tina revision `146`;
- the resulting timeline translation was seeded from an exact same-source
  ready row without a model request;
- the current candidate set reached `1,649 ready / 0 error / 0 missing`
  before the stricter single-letter quality audit;
- the stricter audit then intentionally moved
  `item/harry_signed_parchment/detailEn` to one dormant
  `SOURCE_LOCALE_LEAK` error after exactly one explicit model request.

A different fresh independent Agent must rerun the full project-goal
acceptance after all approved remediation is complete.
