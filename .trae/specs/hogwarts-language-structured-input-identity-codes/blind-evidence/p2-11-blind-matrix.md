# P2-11 Fresh Blind Model Matrix

Status: passed

Date: 2026-08-15

## Method

- Seventeen fresh agents were launched with `fork_turns=none`.
- Each agent received only one final post-trimming production request file.
- No agent received the PRD, implementation, validator, expected response,
  prior response or validation feedback.
- Each agent wrote one untouched raw response.
- Hosted responses traversed their production parser, language adoption,
  validator and reducer/composed reducer.
- Local responses traversed a fake Ollama HTTP boundary and the production
  `JSON.parse`, Zod, language-adoption and marker-validation paths.
- No failed response was edited. Prompt or harness defects caused a new
  request hash and a new fresh agent for only that affected case.
- Full requests and responses remained temporary under `/tmp` and are not
  persisted in this repository.

## Result

```text
fresh context-free agents: 17
final request count: 17
final response count: 17
model calls per case: 1
repair/retry/fallback calls per case: 0
source archive unchanged: true
matrix passed: true
```

| Case | Request SHA-256 | Response SHA-256 | Calls | Repair | Production stage |
| --- | --- | --- | ---: | ---: | --- |
| `character_polish` | `4a159693e15d30f2751c62d5a4fb38abdeb734a749a23177ef074a890181c3d1` | `b4eeb0035eabebf4d3627c3af890544843ad2684e878949ce135b1229b3eec30` | 1 | 0 | `setup_preview` |
| `opening_world` | `9d49ce44a2cc42537f59dd7eb452e404e8be8e3e8beccf960b0291817cc9eb0d` | `c1067029f59203409c9d8db93a4647d4b15a8792f3692bcc4be9185979a6b2bd` | 1 | 0 | `reducer` |
| `calendar_high` | `25e21fd3ed7af3677367dd8e3e54e487cd2b0057b0b1862a3be29b4fcb51185d` | `cca58716e3b9ccc78749cedf5fff401386d0c88cc8d4c9a48c2f84c81020c9d4` | 1 | 0 | `reducer` |
| `calendar_medium` | `b2d766a7e7fa1c70f993dbaf61ae0046d6a46b191a5a1c5fb213ca7c54d07666` | `668834d826e67ebd147a0cdd83bb191272b42f8588f405a6f9a15de46ade3d56` | 1 | 0 | `reducer` |
| `interior_cartographer` | `d4891ae067475d89f1a331b8d2ca0395556b33d9d1e3261451b141fdda3d07b6` | `0708ee039aaefb91db22f27aa59a8cff175242f886253203b5f954aa0a3ab6f5` | 1 | 0 | `reducer` |
| `pacing_director` | `6ed1c3273acbe54584b3626e1ecd64dcb2211f40411991560474e2c945568e1f` | `827712ea01d38e44f290fa96c866154a1e8ddade10ad6b47f06f6581f1975aad` | 1 | 0 | `reducer` |
| `scene_performance` | `5d9ebfa5935446475505ef8255e74dcc6abd5ed82ec9bcb47e7ccede41ad1a28` | `edaf4b7ce14c28dc5dde9fdc62f3a38351e54df8e8b6f6e9145426260c374b7e` | 1 | 0 | `reducer` |
| `scene_transition` | `f2f370d3520fce8da4ecb7796f3f26fa9b3b9cf30a346129475557e942a2bdbe` | `9de5e6eb918a0083997c7c2c3099d365a69ee729a46c570182cba0d67df863c4` | 1 | 0 | `composed_reducer` |
| `scene_opening_bootstrap` | `e7a1bf7469b43c7d6ffcce5da020a8482f47d83b2c49af7d2ddae45afdaf37a3` | `b1be737c4e78c052d93003f89b01b1d0003bb6073eda483bfd9ca2e793a7a673` | 1 | 0 | `validator` |
| `scene_opening_runtime` | `853ddfd3ed674adfc96410180aeae42e6c19595eb645d155cc93f12099bc161d` | `087ab4bcc59cbcab5b13b1136dbfd1520a653be62575bced959791485192fd34` | 1 | 0 | `composed_reducer` |
| `social_director` | `b35737f2bc651710dbf0fea89a746fb88edaad85e4f906f88418c07a8edca1c0` | `46e158d065e6b3496f70e863ea742b7a23de94d4556ac1c72d866becf52cb4be` | 1 | 0 | `reducer` |
| `map_expansion` | `7f81a7c66ec629c18f1a04ad1ef081fe87c0554f7776234242a570d895528c60` | `d4569c17e76c868e948d0aa6a859a9303bf9e80d373a544e56d5e1f822262171` | 1 | 0 | `no_change` |
| `local_pre_turn_adjudicator` | `d878642c0642e64b56cd318565606bbf17e7188d7bc66ba0c7c13d6e3744f75a` | `25fced7de849ce318305954d8ddbb73108e60c5466774d95faa1ab675fbc97b2` | 1 | 0 | `zod_language_adoption` |
| `local_post_turn_observer` | `e70df5fba9d03a32eece043ca1da408191df7a96b2dcbfeb8d6c1199337b7751` | `17adf46390cd274f219a0e6d4b342a60bc4364e727f49c59fbaf2f4965b12de9` | 1 | 0 | `zod_language_adoption` |
| `local_inventory_observer` | `4bb1de38fcf22b3e874c43b74d627111a7dff50643ad7526f9a05e02ea306edd` | `bde216961aab36df1e511dfdab6796a951feb506737113bf3b3e0503d8ba7a2d` | 1 | 0 | `zod_language_adoption` |
| `local_appraisal_proposer` | `25c3bcf99f987ccdfec9f6d50e70246ab6512ff42ad4a164af3635c39937d324` | `e7f556c18bcdb37222197418469d7dcca125c9379897332278eacbaa8770d47c` | 1 | 0 | `zod_language_adoption` |
| `local_translation_zh_cn` | `ff19a79469bb562b0d58d15528bd9cd84f8dbc5afcd8f204fdaeeb3907db7143` | `25237770552047052d5909dc46db28f0b908812ebce00ff2b1586c9356c8ebb3` | 1 | 0 | `zod_marker_validation` |

## Deliberate Non-English Sample

A separate fresh context-free Agent received the Map request and one
adversarial instruction to return Chinese semantic prose. This sample is not a
retry and is not counted in the 17-case correctness matrix.

```text
response SHA-256: 6d88a41248fc411b87f0441d6499ad3f02beae74f0ebb219544e5f14bdbec142
response bytes: 187
language diagnostics: 1
admissible changes: 0
second requests: 0
result: non-fatal skip; no State write
```

## Defects Found by Blind Acceptance

- Opening World omitted the validator's 24-word first-impression limit and
  non-empty offstage activity requirement. The Prompt now states both.
- The Interior and Pacing build-only fixtures did not reach valid production
  triggers. They now use a missing carriage interior and a real key-item
  causal-collapse opportunity.
- Language migration removed required empty `identity.gender.label` keys.
  The exact required structure is now preserved and Actor Context V1 validates.
- Medium Scene Transition deleted Low-owned opening segments but validated as
  if they were already present. Core validation now defers only opening-owned
  checks; the composed Low result still receives full validation.
- Descriptive aliases such as `Gryffindor` no longer count as explicit Actor
  names in next-scene summaries.
- Map Expansion now accepts an explicit no-change result and performs no State
  write when preset topology already represents the location.

## Structured Local Translation Follow-up

A real idle batch showed that the local model could satisfy the former
single-string Schema while deleting every multi-field marker. The batch failed
once, wrote error rows and did not retry. The replacement request uses
structured segment identities.

One new fresh agent used `fork_turns=none` and received only the exact changed
production request:

```text
case: local_translation_zh_cn
mode: zh-CN_batch
request SHA-256: 7983e726ff0ba183f1c87146a19579c3f0c86656c005f7f505924137c8632caf
request characters: 1587
request estimated tokens: 529
raw response SHA-256: 229908a11ea96a8929ba4a1445b88cd5d5a763485a312498b3fb54789c8baff4
model responses: 1
repair/retry/fallback: 0
returned segment IDs: 0:0, 1:0
production stage: zod_marker_validation
result: passed
```

The untouched response passed the fake-Ollama transport plus real
`translateText`, Zod and exact segment-ID validator. No prior marker failure,
source code, PRD, expected answer or validator feedback was supplied to the
agent.

## Post-Regex Final Matrix

After retiring the regex historical-prose Validator, all seventeen cases were
run again with fresh context-free agents. Each agent received only its exact
production transport request and returned one untouched response.

The Scene Transition response changed the committed opening clock. The runtime
Scene Opening request was therefore recaptured from that untouched Transition
response, and a separate fresh agent answered the composed request. No response
was edited or repaired.

```text
representative archive SHA-256:
439dd7a4f65e0d226b6856dda27bb6e8d842a60b3d8a2661b38597b3c7b16849
fresh context-free agents: 17
request count: 17
response count: 17
model calls per case: 1
repair/retry/fallback per case: 0
source archive unchanged: true
matrix passed: true
```

| Case | Request SHA-256 | Response SHA-256 | Production stage |
| --- | --- | --- | --- |
| `character_polish` | `4a159693e15d30f2751c62d5a4fb38abdeb734a749a23177ef074a890181c3d1` | `2a9cd22dc2c22cfb914b7027d684cbe386a11dcc0a8f143bcd94f703131f17b5` | `setup_preview` |
| `opening_world` | `9d49ce44a2cc42537f59dd7eb452e404e8be8e3e8beccf960b0291817cc9eb0d` | `26dbe48ec24d2859d91e72a09128ea67c98221940b2dd5aee0a7f3cfe33361a6` | `reducer` |
| `calendar_high` | `ce3a37dd6b1a1c8e7e100eb67d470f524b2b56f99adbbe6963d9dfaa4767b9d9` | `7fab33b9ca6e51afa5f4e1e196236c8a62c1290e59fde81c034a7d375bd94738` | `reducer` |
| `calendar_medium` | `bbcce74c5f25a3cccd3e49217ed0e4d87b02a5b8fb49d31f544917cb86dcc91b` | `1379bd64e6a31940bd8d3685ed89c8c8581a4686ed898686adf0995c06964a82` | `reducer` |
| `interior_cartographer` | `d4891ae067475d89f1a331b8d2ca0395556b33d9d1e3261451b141fdda3d07b6` | `f6956b9b577d08754be9ee9f3868134b75820cbf957898c1a9113d7ff11ace5b` | `reducer` |
| `pacing_director` | `6ed1c3273acbe54584b3626e1ecd64dcb2211f40411991560474e2c945568e1f` | `d88a4b5cf959422592d1789d03ff9ec881fa75368146f26af2434c49d828ca57` | `reducer` |
| `scene_performance` | `fb5c24b8dc1a20cecd592cb072ff294544e0a30f9db789e3a6179c65a285e524` | `cfbabb2a36a8ecb9483c6043c319043a4358f10b71315ed844529709db23cab2` | `reducer` |
| `scene_transition` | `e4fd416be0e9e54f7c9b3201de3e27d8d14e897a284168b4a29dc0a24a83f3f0` | `ff0e7cec74b3ab74514d4e4b027a285545c87fdf7e80f9add1eb8329df7e5d98` | `composed_reducer` |
| `scene_opening_bootstrap` | `80a246892682889be1d48ed79cfc50db426e215107015e3e8ee8868f26740a2b` | `758e3e63f2f254ae0a75808616f720ec463d04e898a7397c088d7de152f256a3` | `validator` |
| `scene_opening_runtime` | `0d131c72a014e2c7da718136028996b710b64b9c45fafe443a2db61d7d7d017a` | `44cac846863a61b6e06be2319636d2974a06cf52bc519156b94c0abebb5dbca0` | `composed_reducer` |
| `social_director` | `b8b312f015047ee03abb8fc10605b1c1aa19987b09bfc3371da9a128bc81374a` | `4ae2127945169acff7f429831b89c307f1a4989ba590a58dbe6f1f8d55a1f44c` | `reducer` |
| `map_expansion` | `7f81a7c66ec629c18f1a04ad1ef081fe87c0554f7776234242a570d895528c60` | `e815cfd8cc9d56f7b4e40bf1d979e922469b7cf9dfbb2d32b67bd799b42276cb` | `no_change` |
| `local_pre_turn_adjudicator` | `b9f609d32463d5b7c81e66b4fbdfd31e5412823f6f4355f3f4ac055c156615ee` | `c786bb0b583dd584c68c10b38a0ceda73ff6614406f09bb71e2cdcc9551c16d6` | `zod_language_adoption` |
| `local_post_turn_observer` | `e59a2a13d77e1434972b8d965ccd0889eec06311df5b22e285f9053bed06a9fb` | `b5f119e31d9bbd49aefe61195ba0245f9ac1b297736f36722de56d75741f7c8e` | `zod_language_adoption` |
| `local_inventory_observer` | `adbec6e9b29a9257cb64d18301368a07f8b0ee4feae070fd4307cbdbfaddcbb1` | `bde216961aab36df1e511dfdab6796a951feb506737113bf3b3e0503d8ba7a2d` | `zod_language_adoption` |
| `local_appraisal_proposer` | `25c3bcf99f987ccdfec9f6d50e70246ab6512ff42ad4a164af3635c39937d324` | `b49cb034a59732f0a6d20046661b9d1db154b10131ffa0e667f5774d9f8763fa` | `zod_language_adoption` |
| `local_translation_zh_cn` | `7983e726ff0ba183f1c87146a19579c3f0c86656c005f7f505924137c8632caf` | `40a64ce1ace0f668b6d9d52a620c06c994d1874a8c473dd0dab7b7b33f90304b` | `zod_marker_validation` |
