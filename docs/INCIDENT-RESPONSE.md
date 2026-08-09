# Incident Response

**Last updated:** 2026-08-09
**Status:** DRAFT — requires review by project owner

## Overview

This document covers response procedures for security incidents affecting GraveAtlas.

## Incident Types

### 1. Exposed Secret

**Detection:**
- Secret scan alerts (GitHub, Cloudflare, manual)
- Unusual API activity
- Unauthorized commits to data repository

**Containment:**
1. Immediately rotate the exposed secret
2. Revoke old secret in GitHub/Cloudflare
3. Deploy new secret to Worker
4. Audit access logs for misuse

**Investigation:**
- Check git history for when secret was exposed
- Check if any unauthorized operations occurred
- Review all commits during exposure window

**Recovery:**
- Rotate all potentially affected credentials
- Update .env.example if configuration changed
- Document the exposure and remediation

### 2. Malicious Data

**Detection:**
- Data quality check reveals unexpected records
- User reports of inappropriate content
- Audit trail shows unusual admin activity

**Containment:**
1. Archive the affected records
2. Reject pending submissions from the same source
3. Block the contributor if pattern continues

**Investigation:**
- Review audit trail for the actor
- Check for related submissions or reports
- Determine if moderation was bypassed

**Recovery:**
- Remove malicious records
- Restore any corrupted records from git history
- Review and strengthen moderation controls

### 3. Bad Import

**Detection:**
- Import report shows high error rate
- Data quality check reveals new issues
- Users report incorrect information

**Containment:**
1. Stop the import if still running
2. Identify all records from the import_id
3. Mark records as pending review

**Investigation:**
- Review the import report
- Check source and license verification
- Determine root cause (validation gap, source error, etc.)

**Recovery:**
- Rollback the import using import_id
- Verify unrelated records are unaffected
- Fix validation rules if needed
- Document the incident

### 4. Unauthorized Admin Access

**Detection:**
- Unusual admin API activity
- Audit trail shows actions from unknown source
- ADMIN_TOKEN used from unexpected IP

**Containment:**
1. Immediately rotate ADMIN_TOKEN
2. Deploy new token to Worker
3. Review all admin actions in the exposure window

**Investigation:**
- Check audit trail for all admin actions
- Identify what was modified, approved, or rejected
- Check for data exfiltration

**Recovery:**
- Revert any unauthorized changes
- Restore affected records from git history
- Document the incident
- Review admin security measures

### 5. GitHub Compromise

**Detection:**
- Unauthorized commits to data repository
- GitHub security alerts
- Unexpected repository access

**Containment:**
1. Revoke GitHub App installation
2. Rotate GitHub App private key
3. Reinstall GitHub App with new credentials

**Investigation:**
- Review all commits during the compromise
- Check for unauthorized data access
- Review GitHub audit log

**Recovery:**
- Revert unauthorized commits
- Verify data integrity with quality checks
- Deploy new credentials to Worker
- Document the incident

### 6. Worker Compromise

**Detection:**
- Unusual API responses
- Cloudflare alerts
- User reports of unexpected behavior

**Containment:**
1. Roll back Worker deployment to last known good version
2. Rotate all Worker secrets
3. Review Worker code for unauthorized changes

**Investigation:**
- Check Cloudflare access logs
- Review Worker deployment history
- Check for data exfiltration

**Recovery:**
- Deploy clean Worker code
- Verify all endpoints function correctly
- Document the incident

### 7. Corrupted Data

**Detection:**
- Data quality check reveals errors
- API returns malformed data
- GitHub Actions validation fails

**Containment:**
1. Identify the scope of corruption
2. Stop any ongoing imports
3. Mark affected records as pending

**Investigation:**
- Identify the cause (bad commit, bad import, encoding issue)
- Check git history for the corruption point

**Recovery:**
- Restore from git history
- Run data quality checks
- Verify all references are intact
- Document the incident

### 8. Privacy Complaint

**Detection:**
- User submits a privacy/takedown request
- Report endpoint receives a privacy-related report

**Containment:**
1. Acknowledge the request immediately
2. Assess the validity of the claim
3. If valid, archive the affected record

**Investigation:**
- Review the record in question
- Check the source and licensing
- Determine if the information should be public

**Recovery:**
- Remove or redact the affected information
- Document the action taken
- Update privacy procedures if needed

## Post-Incident Review

After any incident:
1. Document the timeline of events
2. Identify root cause
3. Identify what worked and what didn't
4. Update procedures to prevent recurrence
5. Review with project owner

## Contact

- Repository owner: putraworks2026
- Recovery procedures: docs/RECOVERY.md
