# GraveAtlas User Support

## Support Channels

### In-App Reporting
Users can report issues directly from any record:
```
POST /api/reports
{
  "recordId": "grave_xxx",
  "reason": "incorrect_information",
  "details": "The death date is wrong — should be 1945 not 1955."
}
```

Reports go to the moderation queue and are reviewed by moderators.

### Correction Submission
Users can submit corrections to any record:
```
POST /api/corrections
{
  "recordId": "grave_xxx",
  "fields": { "deathDate": "1945-03-15" },
  "reason": "Corrected death date based on cemetery records"
}
```

### Account Issues
For account-related issues (deletion, deactivation, profile changes):
- Users can update their profile via `PUT /api/user/profile`
- Account deletion requests are handled by admins

## FAQ

### How do I add a new cemetery?
1. Open the Contribute tab
2. Select "Add Cemetery"
3. Fill in the name, location, and type
4. Submit for review

### How do I correct an error?
1. Open the record with the error
2. Tap "Report" or submit a correction via the Contribute tab
3. A moderator will review your correction

### Why is my contribution pending?
All contributions go through moderator review before publication. This ensures data quality. Most submissions are reviewed within 48 hours.

### Can I contribute without an account?
No. You need to register via `POST /api/user/register` to contribute. This ensures accountability and allows moderators to contact you if needed.

### Is my personal information public?
Only your display name is public. Your user ID is internal and never exposed in public data.

### How do I delete my account?
Contact support via the reporting system. An admin will deactivate your account. Your published contributions remain as public records but are disassociated from your profile.

## Moderator Support

### How do I become a moderator?
Moderators are assigned by admins. Contact an admin to request moderator role.

### Moderator Guidelines
1. Review submissions within 48 hours when possible
2. Use moderation notes to document your review process
3. Verify coordinates against known sources when possible
4. Request changes for minor issues rather than rejecting
5. Reject only for policy violations or inaccurate data
6. All moderation actions are logged in the audit trail
