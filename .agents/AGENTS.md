# PALOMA Project Rules

## Feature Lock Rule
Before modifying `portal/mouthmap.html`, you MUST:
1. Read `.agents/feature-lock.md`
2. Verify your change does NOT break any locked feature
3. If the change touches rendering, lighting, alignment, or jaw mechanics — double check the lock document
4. After pushing, confirm locked features still work

## Rollback
If a locked feature breaks: `git checkout v1.0-mouthmap-working -- portal/mouthmap.html`
