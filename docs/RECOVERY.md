# GraveAtlas Data Recovery

## Overview

GraveAtlas can recover from accidental deletion, incorrect approval, malicious submission, corrupted data, and bad updates. Recovery relies on Git history and the audit trail.

## Recovery Scenarios

### 1. Accidental Deletion

**How to identify:** A record that previously existed is no longer found in `graves/` or `cemeteries/`.

**How to restore:**
1. Check the audit trail: `GET /api/admin/audit/:entityId`
2. Find the DELETE event and its `previousState`
3. Use admin restore: `POST /api/admin/restore/:id`
4. Or restore from Git history:
   ```bash
   cd graveatlas-data
   git log --oneline -- graves/<id>.json
   git show <commit>:graves/<id>.json > graves/<id>.json
   git commit -m "restore: recover deleted record <id>"
   ```

**How to verify:** Check the record exists and is valid: `node scripts/data-quality-check.js`

**How to prevent:** Soft delete (ARCHIVED/REMOVED) prevents accidental permanent deletion.

### 2. Incorrect Approval

**How to identify:** A bad submission was approved and published.

**How to restore:**
1. Find the approval in the audit trail: `GET /api/admin/audit/:entityId`
2. The audit event's `previousState` shows the state before approval
3. Archive the bad record: set `lifecycleStatus` to `ARCHIVED`
4. If a previous version existed, restore it from Git:
   ```bash
   git log --oneline -- graves/<id>.json
   git show <previous-commit>:graves/<id>.json > graves/<id>.json
   git commit -m "revert: undo incorrect approval of <id>"
   ```

**How to verify:** Run data quality check: `node scripts/data-quality-check.js`

**How to prevent:** All approvals require admin review. Status transitions are server-enforced.

### 3. Malicious Submission

**How to identify:** A submission contains inappropriate, fake, or harmful content.

**How to restore:**
1. If still pending: reject with reason `INAPPROPRIATE_CONTENT`
2. If published: archive the record and report the contributor
3. Check the contributor's other submissions for similar issues
4. Remove all malicious records via admin archive

**How to verify:** Data quality check + manual review of contributor's submissions

**How to prevent:** Rate limiting, input validation, admin review, contributor tracking.

### 4. Corrupted Data

**How to identify:** JSON parse errors in data quality check output.

**How to restore:**
1. Identify the corrupted file from the data quality check
2. Restore from Git history:
   ```bash
   git log --oneline -- <path-to-corrupted-file>
   git show <commit>:<path> > <path>
   git commit -m "fix: restore corrupted file from <commit>"
   ```

**How to verify:** `node scripts/data-quality-check.js` shows no errors

**How to prevent:** CI validates JSON syntax on every push.

### 5. Bad Update (Correction Applied Incorrectly)

**How to identify:** A correction was applied that made the data worse.

**How to restore:**
1. Find the correction's audit event: `GET /api/admin/audit/:entityId`
2. The audit event's `previousState` contains the original values
3. Submit a new correction to restore the original values
4. Or restore from Git:
   ```bash
   git log --oneline -- graves/<id>.json
   git show <previous-commit>:graves/<id>.json > graves/<id>.json
   git commit -m "revert: undo bad correction on <id>"
   ```

**How to verify:** Compare current record against audit trail `previousState`

**How to prevent:** Corrections preserve `previousValues` in the correction record. Audit trail always records the previous state.

### 6. Accidental Overwrite

**How to identify:** A record's content was overwritten with different data.

**How to restore:** Same as "Bad Update" — use Git history or audit trail `previousState`.

**How to verify:** Data quality check + manual comparison.

**How to prevent:** All writes go through the Cloudflare Worker, which enforces validation. Direct GitHub writes are blocked (only the GitHub App can write, and only the Worker uses the GitHub App).

## Git Recovery

Git is the primary backup mechanism. Every change creates a commit with a descriptive message.

### Find When a Change Was Made
```bash
git log --oneline -- graves/<id>.json
```

### See What Changed
```bash
git log -p -- graves/<id>.json | head -100
```

### Restore a Previous Version
```bash
git show <commit-hash>:graves/<id>.json > graves/<id>.json
git add graves/<id>.json
git commit -m "restore: recover <id> from <commit-hash>"
git push
```

## No Paid Backup Service

GraveAtlas uses Git history as its backup mechanism. No paid backup service is used. Git provides:
- Full history of every change
- Ability to restore any previous version
- Diff between any two versions
- Free, reliable, and auditable
