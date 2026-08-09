# Recovery Procedures

**Last updated:** 2026-08-09

## Recovery from Common Issues

### Bad Commit

**Scenario:** A commit introduced incorrect or corrupted data.

**Recovery:**
1. Identify the commit using `git log` in the data repository
2. Use `git revert <commit>` to create a reverting commit
3. Verify the revert with data quality checks
4. Do NOT force-push (preserves history)

### Accidental Deletion

**Scenario:** A record was accidentally deleted.

**Recovery:**
1. Use `git log --all -- <file_path>` to find the last commit containing the file
2. Use `git checkout <commit>^ -- <file_path>` to restore the file
3. Commit the restored file
4. Alternatively, use the admin restore endpoint: `POST /api/admin/restore/:id`

### Corrupted Dataset

**Scenario:** Data files are malformed or corrupted.

**Recovery:**
1. Run data quality check: `GET /api/admin/data-quality`
2. Identify affected files from the error report
3. Restore from git history or re-import from source
4. Verify with data quality check after recovery

### Bad Import

**Scenario:** An import introduced incorrect or unwanted records.

**Recovery:**
1. Identify the import by `import_id`
2. Find all records with that import_id (records are tagged)
3. Remove only the affected records
4. Use the audit trail to verify what was changed
5. Do NOT use global destructive operations

**Rollback test data only.** Never perform destructive rollback on production data without explicit approval.

### Malicious Submission

**Scenario:** A submission contained harmful content.

**Recovery:**
1. Reject the submission in moderation queue
2. If already published, archive the record
3. Use the report system to flag the record
4. Remove via admin restore/rollback
5. Review audit trail for the actor

### Incorrect Merge

**Scenario:** A duplicate merge was performed incorrectly.

**Recovery:**
1. Use git history to find the pre-merge state
2. Restore the original records
3. Re-evaluate the merge decision
4. Document the correction in the audit trail

## Recovery Infrastructure

| Resource | Available | Notes |
|----------|-----------|-------|
| Git history | ✅ | Full history in both repositories |
| Import IDs | ✅ | All imported records tagged |
| Audit trail | ✅ | All admin actions logged |
| Rollback instructions | ✅ | Documented in docs/IMPORT-RECOVERY.md |
| Data quality checks | ✅ | /api/admin/data-quality endpoint |
| Record restore | ✅ | /api/admin/restore/:id endpoint |

## Recovery Owner

The repository owner (putraworks2026) is responsible for recovery operations. Admin actions require the ADMIN_TOKEN.

## Important Rules

1. Never use `git push --force` on the data repository
2. Never perform global destructive operations
3. Always verify recovery with data quality checks
4. Always document recovery actions in the audit trail
5. Do not perform destructive recovery on production data without explicit approval
