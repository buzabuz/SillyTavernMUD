# Task 7.4 Browser Acceptance

- Identity dossier: rendered for Harry Potter with required section structure.
- Data defect: every authoritative identity field is `未知`; known claims are empty.
- Placement: hairstyle/scar/injury fields are under 身体状态; family/background remains a separate declaration section.
- Visual: midnight blue/dark green/gold/purple-star treatment is present.
- 390px: FAIL, app scrollWidth 460px at clientWidth 390px; top actions cause 70px overflow.
- Focus/motion: dossier tabindex and focus-visible rules exist; body has `reduced-motion` and `no_animation`; reduced-motion CSS exists.
- Stale conflict: naturally present, requires refresh, input and persistent write controls are disabled.
- Model traffic: no story inference endpoint was requested. Only tokenizer/status/dry-run paths appeared.
- Persistence: no turn, stale metadata, or chat was manually submitted. Host initiated `/api/chats/save` during load, but console recorded `ERR_ABORTED`.
