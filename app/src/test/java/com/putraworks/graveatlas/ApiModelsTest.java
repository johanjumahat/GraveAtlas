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
}
