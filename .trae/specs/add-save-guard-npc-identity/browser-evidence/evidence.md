# Final browser evidence

- URL: `http://127.0.0.1:8000/?hpmud_identity_v1=final`; Tina Zhang save loaded; Harry Inspector opened.
- PASS identity authority: five groups rendered (`basic`, `education`, `lineage`, `body`, `claims`). Canon/authority values include male, 1980-07-31, Hogwarts/Gryffindor/year 1, half-blood.
- PASS classification: hairstyle `untidy`, scar, injury, and current form `human` are in Body Status; Current Presentation contains only glasses and held pumpkin juice; family/background statements are separate; claims is the true empty state `暂无已知说法`.
- PASS visual/a11y inspection: constellation-themed star map is present; focus CSS rules exist for toolbar/canvas/buttons; 9 `prefers-reduced-motion: reduce` rules were found, including relationship dialog and identity dossier animation/transition suppression.
- PASS network model guard: no story generation/chat-completion request was observed. Only backend status and tokenizer count endpoints appeared.
- NOT VERIFIED at 390px: available browser viewport remained 728px. At 728px, document/body/app were each `scrollWidth=728` and `clientWidth=728`.
- STALE CONFLICT: pre-navigation `?hpmud_identity_v1=verify` showed “时间线已在其他页面更新，请刷新后继续。” with prompt, move, spell, rollback, archive, check, and submit disabled. The loaded `final` namespace did not remain stale and its write controls were enabled, so stale-write rejection was not re-proven on `final`.
- Network caveat: app initialization emitted `/api/settings/save` and `/api/chats/save`; no turn submission or story-model call was performed by this verification.
