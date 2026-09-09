# Narrative-First Post Settlement PRD

## 1. Change ID and Status

- Change ID: `hogwarts-narrative-first-post-settlement`
- Revision: 1
- Status: Revision 1 approved; implementation in progress
- Complexity: L3
- Change kind: feature
- Feature delta: 1
- Core change: yes
- Scope: ordinary-turn narrative preservation, unified Post bookkeeping, and one
  player-selected supplementary Post. This is not a redesign of all game systems.

Links: [Spec](./spec.md), [Tasks](./tasks.md), [Checklist](./checklist.md),
[Progress](./progress.md), [Baseline](./evidence/baseline.md),
[State contract](../hogwarts-runtime-contracts/state-fields.md),
[Model routes](../hogwarts-runtime-contracts/model-field-routes.md).

## 2. Problem and Evidence

The player pays for narration but can lose the reply because unrelated bookkeeping
is malformed. The latest failure returned 1,717 characters and then failed on
missing `signals.sceneProgression`. At revision 399, the player message survives,
turn count is 111, and the new reply was not committed to chat.

Current Scene output combines prose, seven proposal types, two signals and
historical-claim annotations. Post extracts overlapping Actor/Item results.
Scene validation runs before prose preservation; transaction validation also
precedes establishment of a complete Post recovery envelope.

The user's confirmed outcome is to minimize discarded prose, not to make
unvalidated prose authoritative. Scene should write the story; Post should fill
one partitioned bookkeeping form. Failed partitions may be supplemented together
once at the player's request, without regenerating the story.

## 3. Before

| User workflow | Current visible result | Current State/cost |
| --- | --- | --- |
| Valid prose, missing Scene progression or malformed attached proposal | Generic reply-failed card; only player message is guaranteed saved | The paid Scene request is spent; no successful turn |
| Valid Post siblings and one invalid independent family | Invalid family is omitted, normally without a recovery choice | Valid siblings settle via the previous isolation change |
| Post provider or eligible movement result fails | Saved prose plus Retry Post / Discard | World remains pending; retry requests full Post and is not limited to one |
| New person speaks but the full temporary Actor package is bad | Actor validation can reject the whole response | Prose and formal Actor admission are coupled |
| No progression summary exists | A later helper can copy the final narration's first 48 whitespace words and guess a type | This is an excerpt, not semantic verification; the preceding gate often prevents it |

## 4. After

**Narration is saved before bookkeeping can reject it. Saving narration does not
commit the turn or grant its statements world authority.**

Minimum preservation condition: one parseable final-content JSON object with a
`segments` array containing at least one nonempty string in a display-text field.
No word count, missing auxiliary field, unknown Actor ID, language mismatch,
provenance annotation or world-authority rejection may erase displayable prose.
Invalid JSON, an empty response, or JSON with no displayable prose does not
satisfy this condition; do not invent a story.

| User workflow | Promised result | State/calls |
| --- | --- | --- |
| Normal Scene and Post success | Prose appears, then the turn settles | Existing Scene once + selected Post once; no supplement |
| Scene emits prose and stray/invalid bookkeeping | Prose saved; Post handles bookkeeping | Stray Scene fields never write State; no Scene retry |
| Post has invalid/missing entries but valid siblings | Prose stays visible; one recovery panel lists failed categories | Accepted records frozen as a draft; no partial world commit while choosing |
| Player selects several failed categories and supplements | One request fills only unresolved slots in selected categories | No Pre, Scene, accepted-record rewrite, or chained repair |
| Player selects Continue With Defaults | Prose unchanged; safe accepted results settle | Unresolved optional proposals write nothing; zero added model calls |
| Supplement fails again | Safe defaults/no-write apply to remaining optional failures | No third Post attempt; prose remains; ordinary turn may settle |
| Eligible movement remains uncertain | Prose remains with a precise movement-pending status | No guessed destination, clock advance, companion move or held-Item relocation; new actions remain locked |
| A new speaker's formal creation fails | Dialogue text remains, with a message-local or unresolved speaker label | No implicit Actor creation, presence, memories, Item custody or Canon identity |
| Revision conflict / storage failure | Prose already saved remains; state commit is reported unsuccessful | No overwrite of newer State, partial world commit, or model request to repair storage |
| Refresh / duplicate click / late response | Same prose, same decision state and remaining allowance | Never reset or duplicate supplement; no automatic model invocation |

Fallback is category-specific. It must not be advertised as recovered truth.
In particular, missing health assessment is not health, missing movement is not
arrival, and a copied prose excerpt is not a verified event summary.

## 5. In Scope

### Business Matrix

| Field/family | Target source | Admission and fallback | Sole writer / dependencies |
| --- | --- | --- | --- |
| `segments[].type/textEn/actorId` and language evidence | Scene | Preserve displayable strings in order; unresolved metadata cannot erase text | Message writer; world adoption is separate |
| Minimal new speaker declarations | Scene, message-local | Stable local reference + public display name only; missing/invalid declaration uses a static unresolved label | Message metadata only, no Actor/ACL authority |
| Former `actor_activity` | Unified Post Actor family | Existing ID, evidence and activity guards; unresolved record no-write | Actor Runtime reducer |
| Former `actor_move/actor_enter/actor_exit` | Unified Post Actor family | Existing room/path/presence eligibility; no-write if optional invalid | Actor/Presence reducers; formal Actor must exist |
| Former `social_hint` | Unified Post first-impression family | Existing first-meeting eligibility only; no-write on failure | Existing first-impression adoption/Memory Synapse writer, not arbitrary Social changes |
| Former `item_update` and existing `inventoryUpdates` | One Post Inventory result | Merge equivalent operations before settlement, not duplicate two sources; invalid record no-write | Item reducer/candidate queue; holder and recipient dependencies |
| Former `temporary_actor` | Unified Post Actor-creation family | Existing creation authority and public evidence; never import private facts from a display declaration | Actor Core/Runtime admission; dependent records held together |
| `sceneProgression` | Unified Post progression family | Valid typed, evidence-bound summary; fallback excerpt is display-only and no semantic type is guessed | Existing timeline/Event consumers only for validated summary |
| `pacingBeatRealized` | Unified Post pacing family | Accepted realization for the exact pending beat; false/missing/invalid retains pending | Existing Pacing consumer, gated on successful world commit |
| Dialogue `historicalClaims` | Unified Post historical-claim family | Exact frozen segment reference and same-speaker authorized supporting Event; otherwise omit metadata, retain dialogue | Existing provenance/reported-Event path; cannot assert objective truth |
| `materialEvents` | Existing Post family | Existing shape, evidence, material/transition guard, per-record isolation | Material reducer |
| `actorUpdates` | Unified with former Scene Actor proposals | One accepted operation per logical target; unchanged/no-change narration is not an update | Actor/Presence reducers |
| `inventoryObservationRequired` | Initial Local Post only | Existing optional shared Dynamic route; malformed route does not mean completed inventory assessment | No State writer; Low and supplement never wake Dynamic |
| `perception` | Existing Post family | NPC-only normalized participants, evidence/concealment/ACL guards | Perception/witness/Event dependency group; no synthetic witnesses |
| `temporalClaims` | Existing Post family | Validation-only; rejected claims do not change deterministic elapsed time | No clock or Calendar writer |
| `playerMovement` | Existing Post family + deterministic preflight | No marker: discard. Ineligible/already-there: deterministic no move. Eligible unresolved: block State | Movement reducer; companions, presence and carried-Item locations atomic |
| `identityObservations` | Existing Low Post or initial Local shared Dynamic | Existing direct-injury/inspection eligibility; invalid/no assessment means no-write | Identity reducer; not full Identity/life-state inference |
| Pending recovery and accepted records | Turn recovery workflow | Frozen prose reference, guarded draft, failure dispositions, one supplement allowance | Recovery workflow; not committed `turnTransaction` |
| `clock/checks/turn` | Existing deterministic rules | No reroll or new Pre during recovery; world changes only on successful commit | Existing turn/check/clock reducers |

Only the migrated first-impression and pacing-realization responsibilities cross
Social/Pacing boundaries. Creating new relationships, Pacing decisions, memories
or director tasks is not authorized.

### One Supplement

- One manual combined supplementary request **per turn**, shared across all
  selected failed categories from Scene/Post bookkeeping. Not one per field.
- Initial Post is normal work and does not consume the allowance.
- No automatic supplemental call. The player explicitly selects retry or defaults.
- Accepted records are immutable inputs to recovery, not regeneration targets.
  Valid empty arrays mean legitimate no-change, not a failure to retry.
- A family with partial success keeps its accepted records; only failed record
  slots are eligible. Pure harmless cleanup (duplicate/reserved IDs, unsolicited
  movement) is normalization, not a reason to ask for another model call.
- Real dependencies are handled as a unit: e.g. Actor promotion and Item transfer
  to that Actor. Other valid families are not discarded with this group.
- The selected Post provider remains unchanged. Supplement handles selected
  failed sections in one request and does not invoke Dynamic, Pre or Scene.
- Once dispatch is reserved durably, timeout/cancel/reload does not restore the
  allowance. A capacity failure before reservation/dispatch spends no call.
- After supplement, optional failures settle by fallback/no-write. A true blocking
  movement or persistence conflict remains pending with no further model retry.
  Existing explicit discard remains available with confirmation; never automatic.

### Operational Budget

| Work | Before | After |
| --- | --- | --- |
| Scene | One Low call with prose and attached form | One Low call with prose and minimal display identity |
| Initial Low Post | One complete Low call, zero Local/Dynamic | Same count; one unified partitioned form |
| Initial Local Post | One Local core + zero/one serial shared Dynamic | Same route budget; moved Scene duties join Post; valid Scene Item hints no longer required |
| Defaults | No unified action | Zero model calls |
| Manual recovery | Repeated full Post possible | At most one extra selected Post request; no Dynamic |
| Pre, translation, Appraisal, Calendar, Social, background Event | Existing policies | Unchanged; not secretly moved into supplemental generation |
| Concurrency/residency | Existing scheduler/FIFO | Unchanged; supplement follows initial completion; no new model residency |
| Latency/RAM | Current baseline | Earlier prose eligibility expected; no unmeasured speed/RAM promise; larger Post may be slower |

Test-only authorization is a separate **10 real remote model dispatch total**
ceiling, including failed calls, translation/director calls triggered by a test,
and provider timeouts. It is not the product retry budget and not ten retries.
Main agent owns a before-dispatch call ledger; independent agents make no paid
requests. Unused calls remain unused.

## 6. Non-Goals

- No automatic retry, provider switch, semantic Regex/Embedding fallback,
  reasoning-as-final-content, or model-generated replacement story.
- No general log redaction/refactor, normal SillyTavern compatibility work,
  global localization redesign, or unrelated test/debt cleanup.
- No change to Scene Opening/Transition/creation or arbitrary director recovery.
- No new Item, injury, money, Spell, relationship or life-state mechanics.
- No canonical identity merging based on name similarity.
- No repair of old committed saves or reconstruction of missing old model prose.
- No provider-setting removal or silently replacing Local with Low.

## 7. Runtime Contract Impact

The new contracts separate immutable display evidence, uncommitted proposal
drafts and committed State. Proposed routes are specified in
[Spec section 3](./spec.md#3-field-routes); current living tables stay explicit
about implementation status until cutover.

- `extra.hogwartsMud.segments[]`: preserved before auxiliary validation.
- Message-local speaker declarations: display only; no entry into Actor Library.
- `pendingPostSettlement`: versioned recovery containing accepted records,
  unresolved slots/groups, frozen-source identity and supplement state.
- `turn.status`: pending while choosing or genuinely blocked; `idle` only after
  successful world settlement. No new action against an unresolved turn.
- `turnTransaction`: created only with validated records at atomic commit.
- Timeline/Event/Knowledge: fallback excerpt must not become verified public event
  metadata or wake Appraisal; quoted dialogue remains attributed evidence.
- Pacing beat consumption occurs only for accepted realization, on both paths.

## 8. Migration and Compatibility

Do not rewrite committed transactions/messages. New ordinary turns use the new
contract. Delete obsolete Scene proposal/Signal readers from the active generation
path at cutover; do not keep dual prompt schemas or dual semantic writers.

Old pending V1 records need a single deterministic upgrade at explicit recovery:
keep their original prose, checkpoint, timeline guards and legitimate context;
revalidate stored proposals, never assume acceptance. Treat any prior retryCount
greater than zero as an already-spent supplementary allowance. Missing source,
checkpoint or guard means no automatic reconstruction; retain evidence and expose
the existing explicit discard path. Old failed turns without saved prose have no
recoverable narration in this change.

Persist upgrade atomically, then remove V1 recovery interpretation for that record.
Older clients must refuse the new pending version, not overwrite it. Rollback
cannot open new-version pending records with an older writer without an explicit
reverse migration; no such migration is authorized here.

## 9. Prompt Field Budget

See [baseline evidence](./evidence/baseline.md). All sizes are measured through
current production builders without a model call.

| Request | Current total chars | Estimated input tokens | Current hard char capacity |
| --- | ---: | ---: | ---: |
| Scene | 46,168 | 15,390 at configured 3 chars/token | 298,080 |
| Low Post | 20,396 | 6,799 at configured 3 chars/token | 298,080 |
| Local Post | 17,358 | 4,340 at existing 4 chars/token estimate | 28,672 |

Scene slot: 120,000 context, 12,000 response reserve. Local Post: 8,192 context,
1,024 response reserve. After-change numeric sizes do not exist yet; task NFP-01
must measure them before a provider request. Passing capacity is necessary, not
proof that Local can accurately handle the combined form or finish its response.

| Prompt change | Source / audience | Replacement / exclusion rule |
| --- | --- | --- |
| Remove Scene State proposal schema/instructions and signals | Scene system | Replace with prose + minimal speakers; keep world/knowledge/Check constraints for storytelling |
| Move bookkeeping into Post's unified descriptor | Existing seven Scene proposals, two signals and provenance metadata | Merge Actor/Item overlap; one instruction/schema source, not two appended forms |
| Add context needed by moved families | Current relevant Actor/room, pending beat, new-speaker declaration and same-speaker Event references | Bounded authorized projection; no full libraries/graph/raw history |
| Supplement failed targets and accepted-record constraints | Frozen source and server/workflow failure registry | Exactly selected unresolved targets plus dependency closure; accepted data read-only, one narration copy |

Protected: frozen narration, player action, exact preflight/Check authority,
identity/reference constraints and executable output schema. Reuse existing
approved optional-section compaction; do not trim prose or invent new omission
priorities. If protected content does not fit, preserve prose and report no-fit.
Larger Local capacity or different model is not implicitly authorized.

## 10. Frontend Field Whitelist

| Read/write | Allowed field | Registry route |
| --- | --- | --- |
| Read | Preserved segments, canonical Actor display mapping | `MSG-004/005/006`, existing translation/evidence routes |
| Read | Message-local speaker public label; static unresolved label | Proposed `NFP-UI-001`, TranslationTable message-scoped key / static locale |
| Read | Failure family/disposition/reason enums, counts, allowance/status | `GEN-007` extended; static localized labels, no raw provider error |
| Write session only | Selected failure group IDs | Proposed `NFP-UI-002`; checkbox selection, reset on source/timeline change |
| Commands | Supplement Selected, Continue With Defaults, confirmed existing discard | `GEN-007`; disabled according to pending identity, busy state and allowance |

No direct UI State mutation, raw reasoning, raw rejected JSON, or generic model
error text. Supplement success cannot alter previously rendered prose bytes or
source hash. Labels update only if formal identity adoption succeeds; missing
identity uses the documented unresolved display route.

## 11. Acceptance Criteria

| ID | Requirement / normal workflow | Required evidence and forbidden result |
| --- | --- | --- |
| NFP-A01 | Parseable JSON + displayable prose is preserved before all bookkeeping | Inject missing signals, bad proposal/type/speaker metadata; disk reload retains all recoverable text; no whole-Scene discard |
| NFP-A02 | No usable prose remains an honest generation failure | Invalid JSON, empty response, empty segments; no synthetic story or automatic request |
| NFP-A03 | Scene no longer fills the State form | Production prompt/output/parser inspection; no active Scene proposal/Signal authority or legacy second writer |
| NFP-A04 | Post covers original Scene and Post responsibilities | Per-family positive and no-change cases, including Actor creation, first impression, pacing and history; not just empty-schema success |
| NFP-A05 | Family rejection is local and selectable | Mixed-validity response: valid records frozen; failed slots identified; dependent group atomic; unchanged/no-change not falsely retried |
| NFP-A06 | One manual combined supplement | Two+ selected failures -> exactly one request, only permitted outputs adopted, no accepted-value overwrite, Pre/Scene/Dynamic count zero |
| NFP-A07 | Defaults never invent authority | Optional no-write, no forged arrival/health/pacing/Event; fallback excerpt cannot reach verified Event/Knowledge/Appraisal |
| NFP-A08 | True movement conflict preserves prose and blocks State | Compare complete State including clock, companions, carried Items, lastMovement; no new action; no extra model attempt |
| NFP-A09 | Durable recovery/idempotency | Refresh, cancel, double click, late result, revision race and failing save; prose retained, allowance not reset, world commit once or none |
| NFP-A10 | New-speaker display is not formal identity | Invalid/missing/colliding declaration cannot drop dialogue, create Actor or gain existing ACL; valid Post promotion succeeds with dependent records |
| NFP-A11 | UI reaches understandable steady state | zh-CN desktop/narrow: readable prose, localized groups/controls, usable recovery, no raw internal IDs/errors; source prose unchanged |
| NFP-A12 | Budgets and model performance are evidenced | Scene/Low/Local initial and supplement production build-only; fresh blind results; positive-family results and real workflow within <=10 paid calls |
| NFP-A13 | Cutover does not damage historical data | Committed archive unchanged; V1 pending upgrade guarded and deterministic; no old Scene writer in new path |

Tests must not gain acceptance by deleting nonempty proposals, disabling a provider,
skipping a difficult category, or constructing already-accepted output by hand.
Evidence distinguishes parser unit checks, real reducer/save integration, blind
model simulation, real provider output and rendered browser behavior.

## 12. Risks and Rollback

- A larger Post can lose extraction quality or hit Local response limits; this
  must fail relevant acceptance rather than silently reducing responsibilities.
- Preserved prose can contradict uncommitted State. The pending/display boundary
  must remain visible and must not contaminate future canonical inputs.
- Dependency grouping and duplicate resolution can lose valid siblings or apply
  changes twice; test mixed Actor/Item/witness cases explicitly.
- Storage failure cannot be wished away: distinguish session-visible from durable
  prose, retain recoverable text, never report saved when save was not acknowledged.
- Scene prose retention and Post merge require changes in currently large modules.
  Use focused domain helpers where needed, not a new generic framework.
- Rollback is code-scoped before new pending records exist. After version cutover,
  retain a compatible reader or perform a separately approved rollback migration.

## 13. Approval

The user confirmed the architecture, requested this PRD and self-testing, and
authorized at most ten real remote model calls on 2026-09-09.

Fixed PM business discovery and production-informed review passed. The user
explicitly approved Revision 1 of this PRD, Spec, Tasks and Checklist through the
artifact review tool on 2026-09-09. Implementation is authorized within this
scope. The paid-call ledger remains in progress.md.
