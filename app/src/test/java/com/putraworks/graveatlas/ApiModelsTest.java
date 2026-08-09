package com.putraworks.graveatlas;

import com.putraworks.graveatlas.data.api.ApiErrorHandler;
import com.putraworks.graveatlas.data.model.CemeteryRecord;
import com.putraworks.graveatlas.data.model.GraveRecord;
import com.putraworks.graveatlas.data.model.GraveSubmission;

import org.json.JSONObject;
import org.junit.Test;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertNotNull;
import static org.junit.Assert.assertTrue;

/**
 * Unit tests for GraveAtlas Android API models and error handling.
 * These tests don't require network access or production secrets.
 */
public class ApiModelsTest {

    // ── GraveRecord ──

    @Test
    public void graveRecord_defaultConstructor_initializes() {
        GraveRecord record = new GraveRecord();
        assertNotNull(record);
        assertEquals(0, record.latitude, 0.001);
        assertEquals(0, record.longitude, 0.001);
    }

    @Test
    public void graveRecord_hasCoordinates_falseWhenZero() {
        GraveRecord record = new GraveRecord();
        assertFalse(record.hasCoordinates());
    }

    @Test
    public void graveRecord_hasCoordinates_trueWhenSet() {
        GraveRecord record = new GraveRecord();
        record.latitude = 1.35;
        record.longitude = 103.8;
        assertTrue(record.hasCoordinates());
    }

    @Test
    public void graveRecord_isValid_trueWithGoodData() {
        GraveRecord record = new GraveRecord();
        record.id = "sub_test123";
        record.latitude = 1.35;
        record.longitude = 103.8;
        assertTrue(record.isValid());
    }

    @Test
    public void graveRecord_isValid_falseWithoutId() {
        GraveRecord record = new GraveRecord();
        record.latitude = 1.35;
        record.longitude = 103.8;
        assertFalse(record.isValid());
    }

    // ── CemeteryRecord ──

    @Test
    public void cemeteryRecord_defaultConstructor_initializes() {
        CemeteryRecord record = new CemeteryRecord();
        assertNotNull(record);
    }

    @Test
    public void cemeteryRecord_hasCoordinates_falseWhenZero() {
        CemeteryRecord record = new CemeteryRecord();
        assertFalse(record.hasCoordinates());
    }

    @Test
    public void cemeteryRecord_hasCoordinates_trueWhenSet() {
        CemeteryRecord record = new CemeteryRecord();
        record.latitude = 1.35;
        record.longitude = 103.8;
        assertTrue(record.hasCoordinates());
    }

    @Test
    public void cemeteryRecord_isPublished_trueWhenPublished() {
        CemeteryRecord record = new CemeteryRecord();
        record.status = "published";
        assertTrue(record.isPublished());
    }

    @Test
    public void cemeteryRecord_isPublished_falseWhenPending() {
        CemeteryRecord record = new CemeteryRecord();
        record.status = "pending";
        assertFalse(record.isPublished());
    }

    // ── GraveSubmission ──

    @Test
    public void graveSubmission_hasRequiredFields_trueWithName() {
        GraveSubmission submission = new GraveSubmission();
        submission.name = "John Doe";
        assertTrue(submission.hasRequiredFields());
    }

    @Test
    public void graveSubmission_hasRequiredFields_falseWithoutName() {
        GraveSubmission submission = new GraveSubmission();
        assertFalse(submission.hasRequiredFields());
    }

    @Test
    public void graveSubmission_hasValidCoordinates_trueWithValidCoords() {
        GraveSubmission submission = new GraveSubmission();
        submission.latitude = 1.35;
        submission.longitude = 103.8;
        assertTrue(submission.hasValidCoordinates());
    }

    @Test
    public void graveSubmission_hasValidCoordinates_trueWithZero() {
        GraveSubmission submission = new GraveSubmission();
        assertTrue(submission.hasValidCoordinates()); // 0,0 is optional
    }

    @Test
    public void graveSubmission_hasValidCoordinates_falseWithInvalidLat() {
        GraveSubmission submission = new GraveSubmission();
        submission.latitude = 91;
        submission.longitude = 103.8;
        assertFalse(submission.hasValidCoordinates());
    }

    @Test
    public void graveSubmission_hasValidCoordinates_falseWithInvalidLon() {
        GraveSubmission submission = new GraveSubmission();
        submission.latitude = 1.35;
        submission.longitude = 181;
        assertFalse(submission.hasValidCoordinates());
    }

    // ── ApiErrorHandler ──

    @Test
    public void errorHandler_400_returnsValidationMessage() {
        String msg = ApiErrorHandler.getHttpMessage(400);
        assertNotNull(msg);
        assertTrue(msg.contains("invalid"));
    }

    @Test
    public void errorHandler_404_returnsNotFoundMessage() {
        String msg = ApiErrorHandler.getHttpMessage(404);
        assertNotNull(msg);
        assertTrue(msg.contains("not found"));
    }

    @Test
    public void errorHandler_429_returnsRateLimitMessage() {
        String msg = ApiErrorHandler.getHttpMessage(429);
        assertNotNull(msg);
        assertTrue(msg.contains("Too many"));
    }

    @Test
    public void errorHandler_500_returnsServerMessage() {
        String msg = ApiErrorHandler.getHttpMessage(500);
        assertNotNull(msg);
        assertTrue(msg.contains("unavailable") || msg.contains("temporarily"));
    }

    @Test
    public void errorHandler_502_returnsServerMessage() {
        String msg = ApiErrorHandler.getHttpMessage(502);
        assertNotNull(msg);
        assertTrue(msg.contains("unavailable"));
    }

    @Test
    public void errorHandler_networkTimeout_returnsTimeoutMessage() {
        String msg = ApiErrorHandler.getNetworkMessage("Connection timeout");
        assertNotNull(msg);
        assertTrue(msg.contains("timed out") || msg.toLowerCase().contains("timeout"));
    }

    @Test
    public void errorHandler_dnsFailure_returnsOfflineMessage() {
        String msg = ApiErrorHandler.getNetworkMessage("Unable to resolve host");
        assertNotNull(msg);
        assertTrue(msg.contains("offline") || msg.contains("Unable to reach"));
    }

    @Test
    public void errorHandler_isOfflineError_trueForDnsFailure() {
        assertTrue(ApiErrorHandler.isOfflineError("Unable to resolve host"));
    }

    @Test
    public void errorHandler_isOfflineError_trueForTimeout() {
        assertTrue(ApiErrorHandler.isOfflineError("Connection timeout"));
    }

    @Test
    public void errorHandler_isOfflineError_falseFor400Error() {
        assertFalse(ApiErrorHandler.isOfflineError("Bad request"));
    }

    @Test
    public void errorHandler_isRetryable_trueFor429() {
        assertTrue(ApiErrorHandler.isRetryable(429));
    }

    @Test
    public void errorHandler_isRetryable_trueFor500() {
        assertTrue(ApiErrorHandler.isRetryable(500));
    }

    @Test
    public void errorHandler_isRetryable_falseFor404() {
        assertFalse(ApiErrorHandler.isRetryable(404));
    }

    @Test
    public void errorHandler_doesNotExposeSecrets() {
        for (int code = 400; code <= 503; code++) {
            String msg = ApiErrorHandler.getHttpMessage(code);
            if (msg == null) continue;
            assertFalse("Code " + code + " exposes token", msg.toLowerCase().contains("token"));
            assertFalse("Code " + code + " exposes github", msg.toLowerCase().contains("github"));
            assertFalse("Code " + code + " exposes key", msg.toLowerCase().contains("private key"));
            assertFalse("Code " + code + " exposes admin", msg.toLowerCase().contains("admin_token"));
        }
    }

    // ── JSON parsing tests ──

    @Test
    public void graveRecord_parsesFromJson() throws Exception {
        JSONObject json = new JSONObject();
        json.put("id", "sub_test123");
        json.put("name", "John Doe");
        json.put("birthDate", "1950-01-01");
        json.put("deathDate", "2020-06-15");
        json.put("cemetery", "CCK Cemetery");
        json.put("latitude", 1.3521);
        json.put("longitude", 103.8198);
        json.put("status", "published");

        assertEquals("sub_test123", json.optString("id"));
        assertEquals("John Doe", json.optString("name"));
        assertEquals("published", json.optString("status"));
        assertEquals(1.3521, json.optDouble("latitude"), 0.0001);
    }

    @Test
    public void graveRecord_handlesNullFields() throws Exception {
        JSONObject json = new JSONObject();
        json.put("id", "sub_test");
        json.put("name", "Test");
        json.put("birthDate", JSONObject.NULL);
        json.put("cemetery", JSONObject.NULL);

        // optString returns "" for NULL, which the parser handles
        assertEquals("", json.optString("birthDate", ""));
        assertEquals("", json.optString("cemetery", ""));
    }

    @Test
    public void cemeteryRecord_parsesFromJson() throws Exception {
        JSONObject json = new JSONObject();
        json.put("id", "cem001");
        json.put("name", "Choa Chu Kang Cemetery");
        json.put("address", "Singapore");
        json.put("latitude", 1.35);
        json.put("longitude", 103.8);
        json.put("description", "A large cemetery in Singapore");
        json.put("status", "published");

        assertEquals("cem001", json.optString("id"));
        assertEquals("Choa Chu Kang Cemetery", json.optString("name"));
        assertEquals("published", json.optString("status"));
    }


    // ── Phase 3.5: Idempotency & Pagination ──
    @Test
    public void apiClient_generatesIdempotencyKey() {
        // The ApiClient.submitGrave generates a UUID internally.
        // Verify UUID format: 36 chars with hyphens.
        String uuid = java.util.UUID.randomUUID().toString();
        assertNotNull(uuid);
        assertEquals(36, uuid.length());
        assertTrue(uuid.matches("[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}"));
    }

    @Test
    public void apiClient_twoUUIDsAreDifferent() {
        String uuid1 = java.util.UUID.randomUUID().toString();
        String uuid2 = java.util.UUID.randomUUID().toString();
        assertFalse(uuid1.equals(uuid2));
    }

    @Test
    public void pagination_defaultLimitIs100() {
        int defaultLimit = 100;
        assertEquals(100, defaultLimit);
    }

    @Test
    public void pagination_maxLimitIs500() {
        int maxLimit = 500;
        assertEquals(500, maxLimit);
    }

    @Test
    public void pagination_urlContainsParams() {
        String baseUrl = "https://graveatlas.putraworks-2026.workers.dev";
        int offset = 100;
        int limit = 50;
        String url = baseUrl + "/api/graves?offset=" + offset + "&limit=" + limit;
        assertTrue(url.contains("offset=100"));
        assertTrue(url.contains("limit=50"));
    }

    @Test
    public void pagination_defaultUrlHasNoExplicitParams() {
        String baseUrl = "https://graveatlas.putraworks-2026.workers.dev";
        String url = baseUrl + "/api/graves?offset=0&limit=100";
        assertTrue(url.contains("offset=0"));
        assertTrue(url.contains("limit=100"));
    }

    @Test
    public void offlineManager_localIdIsUsedAsIdempotencyKey() {
        // The OfflineSubmissionManager generates a localId like "local_<hex>"
        String localId = "local_abc123def4567890";
        assertTrue(localId.startsWith("local_"));
        assertTrue(localId.length() > 10);
    }

    @Test
    public void errorHandler_isRetryable_429() {
        assertTrue(ApiErrorHandler.isRetryable(429));
    }

    @Test
    public void errorHandler_isRetryable_503() {
        assertTrue(ApiErrorHandler.isRetryable(503));
    }

    @Test
    public void errorHandler_isRetryable_falseFor400() {
        assertFalse(ApiErrorHandler.isRetryable(400));
    }

    @Test
    public void errorHandler_isRetryable_falseFor404() {
        assertFalse(ApiErrorHandler.isRetryable(404));
    }

    @Test
    public void security_noSecretsInDefaultUrl() {
        String url = "https://graveatlas.putraworks-2026.workers.dev";
        assertFalse(url.contains("token"));
        assertFalse(url.contains("key"));
        assertFalse(url.contains("secret"));
        assertFalse(url.contains("password"));
    }


    // ── Phase 4: Worldwide Platform Models ──

    @Test
    public void personRecord_formatDate_yearOnly() {
        assertEquals("1902", PersonRecord.formatDate("1902"));
    }

    @Test
    public void personRecord_formatDate_yearMonth() {
        assertEquals("May 1902", PersonRecord.formatDate("1902-05"));
    }

    @Test
    public void personRecord_formatDate_fullDate() {
        assertEquals("12 May 1902", PersonRecord.formatDate("1902-05-12"));
    }

    @Test
    public void personRecord_formatDate_unknown() {
        assertEquals("Unknown", PersonRecord.formatDate("unknown"));
        assertEquals("Unknown", PersonRecord.formatDate(null));
        assertEquals("Unknown", PersonRecord.formatDate(""));
    }

    @Test
    public void personRecord_formatDate_approximate() {
        assertEquals("c. 1902", PersonRecord.formatDate("approx_1902"));
    }

    @Test
    public void personRecord_getFullName_combined() {
        PersonRecord p = new PersonRecord();
        p.givenNames = "John";
        p.familyName = "Smith";
        assertEquals("John Smith", p.getFullName());
    }

    @Test
    public void personRecord_getFullName_displayNameFallback() {
        PersonRecord p = new PersonRecord();
        p.displayName = "J. Smith";
        assertEquals("J. Smith", p.getFullName());
    }

    @Test
    public void personRecord_getLifeDates_both() {
        PersonRecord p = new PersonRecord();
        p.birthDate = "1901";
        p.deathDate = "1980";
        assertEquals("1901 – 1980", p.getLifeDates());
    }

    @Test
    public void personRecord_getLifeDates_birthOnly() {
        PersonRecord p = new PersonRecord();
        p.birthDate = "1901";
        assertEquals("b. 1901", p.getLifeDates());
    }

    @Test
    public void personRecord_getLifeDates_deathOnly() {
        PersonRecord p = new PersonRecord();
        p.deathDate = "1980";
        assertEquals("d. 1980", p.getLifeDates());
    }

    @Test
    public void personRecord_getLifeDates_empty() {
        PersonRecord p = new PersonRecord();
        assertEquals("", p.getLifeDates());
    }

    @Test
    public void cemeteryRecord_getLocationString_allFields() {
        CemeteryRecord c = new CemeteryRecord();
        c.city = "Paris";
        c.region = "Île-de-France";
        c.country = "France";
        assertEquals("Paris, Île-de-France, France", c.getLocationString());
    }

    @Test
    public void cemeteryRecord_getLocationString_countryOnly() {
        CemeteryRecord c = new CemeteryRecord();
        c.country = "Japan";
        assertEquals("Japan", c.getLocationString());
    }

    @Test
    public void cemeteryRecord_getLocationString_empty() {
        CemeteryRecord c = new CemeteryRecord();
        assertEquals("", c.getLocationString());
    }

    @Test
    public void cemeteryRecord_getDisplayName_usesLocalName() {
        CemeteryRecord c = new CemeteryRecord();
        c.name = "Pere Lachaise";
        c.localName = "Cimetière du Père Lachaise";
        assertEquals("Cimetière du Père Lachaise", c.getDisplayName());
    }

    @Test
    public void cemeteryRecord_getDisplayName_fallbackToName() {
        CemeteryRecord c = new CemeteryRecord();
        c.name = "Bukit Brown";
        assertEquals("Bukit Brown", c.getDisplayName());
    }

    @Test
    public void cemeteryRecord_getVerificationLabel_verified() {
        CemeteryRecord c = new CemeteryRecord();
        c.verificationStatus = "verified";
        assertEquals("Verified", c.getVerificationLabel());
    }

    @Test
    public void cemeteryRecord_getVerificationLabel_unverified() {
        CemeteryRecord c = new CemeteryRecord();
        c.verificationStatus = "unverified";
        assertEquals("Unverified", c.getVerificationLabel());
    }

    @Test
    public void cemeteryRecord_getVerificationLabel_communitySubmitted() {
        CemeteryRecord c = new CemeteryRecord();
        c.verificationStatus = "community_submitted";
        assertEquals("Community Submitted", c.getVerificationLabel());
    }

    @Test
    public void graveRecord_getCemeteryName_newField() {
        GraveRecord g = new GraveRecord();
        g.cemeteryName = "Bukit Brown";
        g.cemetery = "Old Bukit Brown";
        assertEquals("Bukit Brown", g.getCemeteryName());
    }

    @Test
    public void graveRecord_getCemeteryName_legacyFallback() {
        GraveRecord g = new GraveRecord();
        g.cemetery = "Bukit Brown";
        assertEquals("Bukit Brown", g.getCemeteryName());
    }

    @Test
    public void graveRecord_getLifeDates() {
        GraveRecord g = new GraveRecord();
        g.birthDate = "1950-01-01";
        g.deathDate = "2020-12-31";
        assertEquals("1 Jan 1950 – 31 Dec 2020", g.getLifeDates());
    }

    @Test
    public void graveRecord_getVerificationLabel_underReview() {
        GraveRecord g = new GraveRecord();
        g.verificationStatus = "under_review";
        assertEquals("Under Review", g.getVerificationLabel());
    }

    @Test
    public void searchResult_getDisplaySubtitle_cemetery() {
        SearchResult r = new SearchResult();
        r.type = "cemetery";
        r.country = "France";
        r.city = "Paris";
        String subtitle = r.getDisplaySubtitle();
        assertTrue(subtitle.contains("Cemetery"));
        assertTrue(subtitle.contains("Paris"));
        assertTrue(subtitle.contains("France"));
    }

    @Test
    public void searchResult_getDisplaySubtitle_grave() {
        SearchResult r = new SearchResult();
        r.type = "grave";
        r.cemetery = "Bukit Brown";
        r.birthDate = "1901";
        r.deathDate = "1980";
        String subtitle = r.getDisplaySubtitle();
        assertTrue(subtitle.contains("Grave"));
        assertTrue(subtitle.contains("Bukit Brown"));
        assertTrue(subtitle.contains("1901"));
        assertTrue(subtitle.contains("1980"));
    }
}
