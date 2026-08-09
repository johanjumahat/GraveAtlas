# GraveAtlas Reports

## Overview

Users can report problems with public data. Reports do NOT automatically delete or modify content. All reports go through admin review.

## Report Types

| Type | Description |
|------|-------------|
| `INCORRECT_INFORMATION` | Name, dates, or other details are wrong |
| `DUPLICATE` | Record is a duplicate of another |
| `WRONG_LOCATION` | Coordinates or cemetery assignment is wrong |
| `PRIVACY_CONCERN` | Privacy issue with the record |
| `INAPPROPRIATE_PHOTO` | Photo is inappropriate |
| `WRONG_CEMETERY` | Grave assigned to wrong cemetery |
| `CEMETERY_STATUS` | Cemetery is closed/abandoned but marked active |
| `OTHER` | Catch-all for other issues |

## Report Statuses

| Status | Description |
|--------|-------------|
| `OPEN` | Report submitted, awaiting review |
| `UNDER_REVIEW` | Admin is reviewing the report |
| `RESOLVED` | Admin resolved the report (action taken) |
| `REJECTED` | Admin rejected the report (no action needed) |

### Status Transitions (server-enforced)

| From | Allowed Transitions |
|------|-------------------|
| `OPEN` | → `UNDER_REVIEW`, → `RESOLVED`, → `REJECTED` |
| `UNDER_REVIEW` | → `RESOLVED`, → `REJECTED` |
| `RESOLVED` | (terminal) |
| `REJECTED` | (terminal) |

## Report Lifecycle

```
User reports a record
     ↓
Report OPEN (stored in pending/report_<id>.json)
     ↓
Admin reviews report
     ↓
RESOLVED → Action taken (e.g., correction submitted)
REJECTED → No action needed (invalid report)
```

## API

### Submit a Report

```
POST /api/graves/:id/report
Content-Type: application/json

{
  "report": "Description of the problem",
  "reportType": "INCORRECT_INFORMATION"
}
```

Rate limited: 10 requests/minute/IP.

### Admin: List Reports

```
GET /api/admin/reports
Authorization: Bearer <ADMIN_TOKEN>
```

### Admin: Resolve a Report

```
POST /api/admin/reports/:id/resolve
Authorization: Bearer <ADMIN_TOKEN>

{
  "resolution": "Correction submitted for wrong name",
  "action": "correction_submitted"
}
```

### Admin: Reject a Report

```
POST /api/admin/reports/:id/reject
Authorization: Bearer <ADMIN_TOKEN>

{
  "reason": "Report is invalid — information is correct"
}
```

## Privacy Protection

- Reporter identity is not exposed in public data
- Reports do not contain delete instructions
- Reports cannot directly modify or delete records
- Reporter's IP address is not stored in the report record
- Only admins can see report details

## What Reports Do NOT Do

- Reports do NOT auto-delete content
- Reports do NOT auto-modify records
- Reports do NOT block public access to records
- Reports do NOT expose the reporter's identity to the public

## Contributor Impact

When a report is resolved (useful), the reporter's contributor stats are updated (`usefulReports++`). When rejected, stats show `invalidReports++`. This helps identify reliable reporters without exposing their identity publicly.
