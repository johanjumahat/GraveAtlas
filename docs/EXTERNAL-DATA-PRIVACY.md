# External Data Privacy

## Overview (Part 21)

Reviews external data for:
- Living persons
- Sensitive personal information
- Private records
- Restricted burial information
- Institutional restrictions

## Living Person Detection

A record is flagged as potentially living if:
- No death date is present
- Birth date is within the last 100 years

```javascript
if (checkLivingPerson(record)) {
  // Flag: "Record may pertain to a living person — do not publish without consent"
}
```

## Sensitive Data Patterns

| Pattern | Type | Action |
|---------|------|--------|
| XXX-XX-XXXX | SSN | Block |
| XX###### | Passport | Block |
| 16 digits | Credit card | Block |
| email | Email | Redact |
| phone | Phone | Redact |

## Redaction

Sensitive data is redacted before display:
```javascript
const redacted = redactSensitiveData(record);
// Replaces emails/phones with [REDACTED]
```

## Rules

- Do NOT expose or redistribute restricted information
- Privacy review runs on every external record
- Records failing privacy review are blocked from display

## Implementation

File: `backend/src/external-connectors/privacy-security.js`
