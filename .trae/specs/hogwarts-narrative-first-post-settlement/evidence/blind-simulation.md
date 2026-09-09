# Blind Simulation

Status: five representative request/response cases passed on 2026-09-09.
This is supporting evidence for NFP-A12, not complete product acceptance.

Every agent used `fork_turns=none`, one new agent per case, and saw only its
captured production messages/outputSchema. Instructions were to read that request
fully, follow it, produce one raw response, and not read code, requirements, tests,
other conversations or other files. No provider/network calls or repair feedback
were permitted. The main agent did not edit any returned response.

Raw requests/responses are temporary private verification inputs outside the
repository, not governance artifacts. Durable evidence contains hashes only.

| Case / fresh agent | Request messages SHA256 | Raw response SHA256 | Captured requests | Result |
| --- | --- | --- | ---: | --- |
| Scene / `b538f156-0de5-434a-bf9c-a9113d35d4db` | `e71f2d2b1e2e5c58258df03c9d75707fedb9039e292388677a1bbd77bba47953` | `b19e4dd023729b7fb8ab98bb6590f14432f18b997147a45ff02ade64554d09fc` | 1 | PASS |
| Low Post / `95ac1e3f-7601-44be-9912-eaf09b6d42b6` | `0c40752c5d0515e11f17a4f465cf56ba34f8e011bf20e3e8aa99b7c637cf4d77` | `85032b1235630f78b2fce2044427f7a7d3e315d498d4a335c54cab2903de0419` | 1 | PASS |
| Local Post / `f5a40ef3-794b-418d-a36e-cfc1fff50050` | `44cba8cec1895545844dd27a52d8263fe09ce58e148e65dc77c7d6577f327567` | `7a7a9159587243707b33ec84350c5ed994aeb29ba8cb7d573c357ca180c59b31` | 1 | PASS |
| Low supplement / `c6e22cdc-2c8d-42ea-80d7-ab1633ea1472` | `79fa80040dd5ecc47358513d171d21c1f9485a569f139315f4a3f2faeb4634d2` | `49210eb9c8d9ceba799615532f9257d843d08a0e8d5eafc6c2a1793778e7f6cb` | 1 | PASS |
| Local supplement / `222f150e-5cc3-4cc8-a77d-4887bd097bb3` | `dff65519525c28d2851289843eaab2b6596087d3c81195f6102aad235c13bda3` | `b885eda74b5f55e8fec88dea4318f5e891252279a6c38fc5508eb39930eb29e9` | 1 | PASS |

Verification: `scripts/verify-hogwarts-narrative-first-response.mjs` rebuilds
and asserts exact production request equality, substitutes the untouched response
at the transport boundary, then executes production parsing, per-family guards,
supplement merge where applicable, shared integration, transaction validation,
Actor/Item/Presence/turn reducers and guarded State/chat persistence on an isolated
in-memory clone of the representative save. Every case committed one turn, kept
the source prose unchanged, returned no failed family, and left the original
revision-399 save bytes unchanged. No second response or automatic repair was used.

The first verifier run omitted its `normalizeEventKnowledge` injected port;
that test-infrastructure error was corrected by injecting the actual production
function. The same untouched responses then passed. No model was asked to retry.

Limits: Post cases use the latest committed Scene as representative evidence,
not the lost response from the user's failed turn. Local core verification uses
settlement-only adapter mode; routed Dynamic is separately covered by deterministic
tests, not a new blind Dynamic response. Save callbacks are isolated memory
acknowledgements, not the user's disk storage. Scene preservation and Post cases
are distinct fixtures rather than one live consecutive user action. Provider
latency/output-token behavior and full application/browser acceptance remain open.

Real remote model calls for these blind simulations: **0**. The separate real
provider ledger is authoritative for the whole change.

## Final Local Envelopes

Following the Local grammar correction and 2048-token response reserve, two
fresh context-free agents returned untouched responses for the rebuilt Local
initial/supplement envelopes:

| Case / fresh agent | Request messages SHA256 | Raw response SHA256 |
| --- | --- | --- |
| Local / `8c673cf3-7850-4ffe-9940-e7bffaee0337` | `911466475d2e023d867cd6b2a5a110fcd9265908fc1b1539c718546599aa649a` | `261391f544aa3b4b6aa12eb4e825b21d701e3fe4d1d6400a9a25dae4d27432da` |
| Local supplement / `785c530f-58e8-47d6-9491-013a2ec9138b` | `8979cc9146575678c90277e2793f10ecc02675f0766bcfdd2a6eddd208b4361d` | `6f111e745c187e4b6d5c372a3546fa04ebbfc5623e435acf11d4b468ab6a0077` |

Both verifier runs reported exact request equality, one captured transport
invocation, reducer commit, unchanged prose and original save, and no rejected
families. The isolated-save and settlement-only limitations above still apply.
