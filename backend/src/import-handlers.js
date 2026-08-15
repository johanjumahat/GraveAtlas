/**
 * Admin Import API Handlers
 *
 * Endpoints for triggering, reviewing, approving, and rejecting
 * data imports from official sources (NEA Singapore, OpenStreetMap).
 *
 * All endpoints are admin-authenticated (Bearer token).
 *
 * Import lifecycle (AI auto-moderation — no human admin required):
 *   1. Trigger import → fetch + process → AI auto-moderation reviews report
 *   2. AI approves → records published to data repo (cemeteries/, graves/)
 *   3. AI rejects → import marked rejected, records not published
 *   4. All decisions logged to audit trail with reasoning
 *
 * Endpoints:
 *   POST /api/admin/imports/trigger          — Trigger import + AI auto-moderation
 *   GET  /api/admin/imports                   — List all import jobs
 *   GET  /api/admin/imports/:importId         — Get import job details (incl. AI decision)
 *   POST /api/admin/imports/:importId/approve — Manual override: force-approve (re-publish)
 *   POST /api/admin/imports/:importId/reject  — Manual override: force-reject
 *   GET  /api/admin/imports/sources            — List available import sources
 *   GET  /api/admin/imports/moderation/config  — Get AI moderation config
 *
 * Security:
 * - All endpoints require admin authentication (Bearer token)
 * - AI moderation never bypasses the state machine
 * - All AI decisions are auditable with full reasoning
 * - Manual override endpoints available for edge cases
 * - Decisions are reversible via rollback
 */

import { writeFile, readFile, listFiles, sanitizePathSegment } from './github.js';
import {
  validateTransition,
  generateImportReport,
  validateImportFile,
  MAX_IMPORT_SIZE,
  MAX_RECORDS
} from './import-framework.js';
import {
  reviewImport,
  validateModerationDecision,
  buildAuditEntry,
  MODERATION_CONFIG,
  RECOGNIZED_LICENSES
} from './ai-moderation.js';

// ── Available Import Sources ──

const IMPORT_SOURCES = {
  'nea-singapore': {
    name: 'Singapore NEA — Active Cemeteries',
    description: '9 active cemeteries in Singapore from data.gov.sg (GeoJSON)',
    license: 'Singapore Open Data Licence',
    attribution: 'National Environment Agency. (2020). Active Cemeteries (GEOJSON) [Dataset]. data.gov.sg.',
    country: 'Singapore',
    recordType: 'cemetery',
    requiresOptions: false
  },
  'osm-overpass': {
    name: 'OpenStreetMap — Cemeteries (Overpass API)',
    description: 'Worldwide cemetery data from OpenStreetMap contributors (ODbL)',
    license: 'ODbL',
    attribution: '© OpenStreetMap contributors (ODbL)',
    country: null, // worldwide or filtered by area
    recordType: 'cemetery',
    requiresOptions: true, // area (country code), includeHistoric, etc.
    options: {
      area: { type: 'string', required: false, description: 'ISO 3166-1 alpha-2 country code (e.g., SG, US, GB). Omit for worldwide.' },
      includeHistoric: { type: 'boolean', required: false, default: true, description: 'Include historic=cemetery' },
      includeGraveYard: { type: 'boolean', required: false, default: true, description: 'Include amenity=grave_yard' },
      includeGraves: { type: 'boolean', required: false, default: false, description: 'Include cemetery=grave individual markers' }
    }
  }
};

// ── Handler: List Available Sources ──

export async function handleListImportSources(env, cors) {
  const sources = Object.entries(IMPORT_SOURCES).map(([id, info]) => ({
    id,
    name: info.name,
    description: info.description,
    license: info.license,
    attribution: info.attribution,
    country: info.country,
    recordType: info.recordType,
    requiresOptions: info.requiresOptions,
    options: info.options || null
  }));

  return jsonResponse({
    success: true,
    sources,
    count: sources.length
  }, 200, cors);
}


// ── Handler: Get AI Moderation Config ──

export async function handleGetModerationConfig(env, cors) {
  return jsonResponse({
    success: true,
    config: MODERATION_CONFIG,
    recognizedLicenses: RECOGNIZED_LICENSES,
    description: 'AI auto-moderation configuration. All imports are automatically reviewed and approved/rejected based on these criteria.'
  }, 200, cors);
}

// ── Handler: Trigger Import ──

export async function handleTriggerImport(request, env, cors) {
  if (!env.GITHUB_APP_ID) {
    return jsonResponse({
      success: false,
      error: 'GitHub not configured. Cannot store import data.'
    }, 503, cors);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ success: false, error: 'Invalid JSON body' }, 400, cors);
  }

  const { source: sourceId, options = {} } = body;

  if (!sourceId || !IMPORT_SOURCES[sourceId]) {
    return jsonResponse({
      success: false,
      error: `Unknown source. Available: ${Object.keys(IMPORT_SOURCES).join(', ')}`
    }, 400, cors);
  }

  const sourceInfo = IMPORT_SOURCES[sourceId];
  const importId = `${sourceId}-${new Date().toISOString().split('T')[0]}-${Date.now()}`;

  try {
    // Fetch and process the import
    let report;

    if (sourceId === 'nea-singapore') {
      // Dynamic import — the NEA importer uses ES module syntax
      // In a Cloudflare Worker, we'd import it at the top of index.js
      // For now, we store the trigger and process it
      const { importNEACemeteries } = await import('./importers/nea-singapore.js');
      report = await importNEACemeteries([]);
    } else if (sourceId === 'osm-overpass') {
      const { importOSMCemeteries } = await import('./importers/osm-overpass.js');
      // Validate options
      if (options.area && !/^[A-Z]{2}$/.test(options.area)) {
        return jsonResponse({
          success: false,
          error: 'Invalid area code. Use ISO 3166-1 alpha-2 (e.g., SG, US, GB).'
        }, 400, cors);
      }
      report = await importOSMCemeteries(options, []);
    } else {
      return jsonResponse({ success: false, error: 'Source not implemented' }, 501, cors);
    }

    // Store the import report in pending/imports/
    const importPath = `pending/imports/${importId}.json`;
    const importContent = JSON.stringify(report, null, 2);

    // Validate size
    if (importContent.length > MAX_IMPORT_SIZE) {
      return jsonResponse({
        success: false,
        error: `Import report too large: ${importContent.length} bytes`
      }, 413, cors);
    }

    await writeFile(
      importPath,
      importContent,
      env,
      `import: ${sourceId} — ${report.validRecords} records [PENDING_APPROVAL]`
    );

    // Write audit log
    await writeAuditLog(env, {
      action: 'IMPORT_TRIGGERED',
      importId,
      source: sourceId,
      recordCount: report.validRecords,
      status: 'PENDING_APPROVAL',
      timestamp: new Date().toISOString()
    });

    // ── AI Auto-Moderation ──
    // No human admin — AI reviews and decides automatically
    const moderationResult = reviewImport(report);

    // Validate state transition is legal
    const transitionCheck = validateModerationDecision('PENDING_APPROVAL', moderationResult.decision);
    if (!transitionCheck.valid) {
      // Should never happen, but guard anyway
      return jsonResponse({
        success: false,
        error: `Moderation decision invalid: ${transitionCheck.error}`,
        importId
      }, 500, cors);
    }

    // Update report status based on AI decision
    report.status = moderationResult.decision === 'APPROVED' ? 'APPROVED' : 'REJECTED';
    report.moderatedBy = 'ai-auto-moderator';
    report.moderatedAt = new Date().toISOString();
    report.moderationReason = moderationResult.reason;
    report.moderationDetails = moderationResult.details;

    // If approved, publish records immediately
    let publishedCount = 0;
    let publishErrors = [];

    if (moderationResult.decision === 'APPROVED' && report.records && report.records.length > 0) {
      for (const record of report.records) {
        try {
          let targetDir;
          if (record.cemeteryType || record.osmType || record.neaObjectId) {
            targetDir = 'cemeteries';
          } else {
            targetDir = 'graves';
          }
          const recordPath = `${targetDir}/${record.id}.json`;
          await writeFile(
            recordPath,
            JSON.stringify(record, null, 2),
            env,
            `import: publish ${record.id} from ${importId} [AI-APPROVED]`
          );
          publishedCount++;
        } catch (err) {
          publishErrors.push({ recordId: record.id, error: err.message });
        }
      }
      report.status = publishedCount === report.records.length ? 'COMPLETED' : 'PARTIAL';
      report.publishedCount = publishedCount;
      report.publishErrors = publishErrors;
    }

    // Save the updated report (with moderation decision + publish results)
    await writeFile(
      importPath,
      JSON.stringify(report, null, 2),
      env,
      `import: ${importId} ${report.status} — AI auto-moderation`
    );

    // Write audit log
    const auditEntry = buildAuditEntry(moderationResult, report, importId);
    await writeAuditLog(env, auditEntry);

    return jsonResponse({
      success: true,
      importId,
      source: sourceId,
      sourceName: sourceInfo.name,
      status: report.status,
      moderatedBy: 'ai-auto-moderator',
      moderation: {
        decision: moderationResult.decision,
        reason: moderationResult.reason,
        checksPassed: moderationResult.summary.checksPassed,
        totalChecks: moderationResult.summary.totalChecks,
        qualityScore: report.qualityScore,
        config: moderationResult.summary.config
      },
      summary: {
        totalRecords: report.totalRecords || report.validRecords,
        validRecords: report.validRecords,
        invalidRecords: report.invalidRecords,
        duplicates: report.duplicates,
        qualityScore: report.qualityScore,
        attribution: report.attribution,
        license: report.license,
        published: publishedCount,
        publishErrors: publishErrors.length
      },
      message: moderationResult.decision === 'APPROVED'
        ? `Import AI-approved and published: ${publishedCount} records.`
        : `Import AI-rejected: ${moderationResult.reason}`
    }, 200, cors);

  } catch (err) {
    // Write audit log for failed import
    await writeAuditLog(env, {
      action: 'IMPORT_FAILED',
      importId,
      source: sourceId,
      error: err.message,
      timestamp: new Date().toISOString()
    }).catch(() => {});

    return jsonResponse({
      success: false,
      error: `Import failed: ${err.message}`,
      importId
    }, 500, cors);
  }
}

// ── Handler: List All Imports ──

export async function handleListImports(env, cors) {
  if (!env.GITHUB_APP_ID) {
    return jsonResponse({
      success: true,
      imports: [],
      count: 0,
      message: 'GitHub not configured.'
    }, 200, cors);
  }

  try {
    const files = await listFiles('pending/imports', env);
    const imports = files
      .filter(f => f.endsWith('.json'))
      .map(f => {
        const importId = f.replace('.json', '');
        const parts = importId.split('-');
        const source = parts.slice(0, parts.length - 2).join('-');
        const date = parts[parts.length - 2];
        return {
          importId,
          source,
          date,
          filename: f
        };
      })
      .sort((a, b) => b.importId.localeCompare(a.importId));

    return jsonResponse({
      success: true,
      imports,
      count: imports.length
    }, 200, cors);
  } catch (err) {
    return jsonResponse({
      success: false,
      error: `Failed to list imports: ${err.message}`
    }, 500, cors);
  }
}

// ── Handler: Get Import Details ──

export async function handleGetImport(importId, env, cors) {
  if (!env.GITHUB_APP_ID) {
    return jsonResponse({ success: false, error: 'GitHub not configured.' }, 503, cors);
  }

  const safeId = sanitizePathSegment(importId);
  if (!safeId) {
    return jsonResponse({ success: false, error: 'Invalid import ID' }, 400, cors);
  }

  try {
    const content = await readFile(`pending/imports/${safeId}.json`, env);
    if (!content) {
      return jsonResponse({ success: false, error: 'Import not found' }, 404, cors);
    }

    const report = JSON.parse(content);
    return jsonResponse({
      success: true,
      importId,
      report
    }, 200, cors);
  } catch (err) {
    return jsonResponse({
      success: false,
      error: `Failed to read import: ${err.message}`
    }, 500, cors);
  }
}

// ── Handler: Approve Import ──

export async function handleApproveImport(importId, request, env, cors) {
  if (!env.GITHUB_APP_ID) {
    return jsonResponse({ success: false, error: 'GitHub not configured.' }, 503, cors);
  }

  const safeId = sanitizePathSegment(importId);
  if (!safeId) {
    return jsonResponse({ success: false, error: 'Invalid import ID' }, 400, cors);
  }

  try {
    // Read the import report
    const importPath = `pending/imports/${safeId}.json`;
    const content = await readFile(importPath, env);
    if (!content) {
      return jsonResponse({ success: false, error: 'Import not found' }, 404, cors);
    }

    const report = JSON.parse(content);

    // Validate state transition
    const transition = validateTransition(report.status || 'PENDING_APPROVAL', 'APPROVED');
    if (!transition.valid) {
      return jsonResponse({
        success: false,
        error: `Cannot approve import in status "${report.status}": ${transition.error || 'Invalid transition'}`
      }, 409, cors);
    }

    // Check there are records to publish
    if (!report.records || report.records.length === 0) {
      return jsonResponse({
        success: false,
        error: 'No valid records to publish'
      }, 400, cors);
    }

    // Parse approval notes from request body (optional)
    let notes = '';
    try {
      const body = await request.json();
      notes = body.notes || '';
    } catch { /* no body or invalid JSON — that's OK, notes are optional */ }

    // Publish each record to the data repo
    let published = 0;
    let publishErrors = [];

    for (const record of report.records) {
      try {
        // Determine target directory based on record type
        let targetDir;
        let recordFileName;

        if (record.cemeteryType || record.osmType || record.neaObjectId) {
          // Cemetery record
          targetDir = 'cemeteries';
          recordFileName = `${record.id}.json`;
        } else {
          // Grave record
          targetDir = 'graves';
          recordFileName = `${record.id}.json`;
        }

        const recordPath = `${targetDir}/${recordFileName}`;
        const recordContent = JSON.stringify(record, null, 2);

        await writeFile(
          recordPath,
          recordContent,
          env,
          `import: publish ${record.id} from ${safeId} [APPROVED]`
        );
        published++;
      } catch (err) {
        publishErrors.push({
          recordId: record.id,
          error: err.message
        });
      }
    }

    // Update import status
    report.status = published === report.records.length ? 'COMPLETED' : 'PARTIAL';
    report.approvedAt = new Date().toISOString();
    report.approvedBy = 'admin';
    report.publishedCount = published;
    report.publishErrors = publishErrors;

    await writeFile(
      importPath,
      JSON.stringify(report, null, 2),
      env,
      `import: ${safeId} ${report.status.toLowerCase()} — ${published}/${report.records.length} published`
    );

    // Write audit log
    await writeAuditLog(env, {
      action: 'IMPORT_APPROVED',
      importId: safeId,
      source: report.source?.sourceName || 'unknown',
      recordCount: report.records.length,
      publishedCount: published,
      errors: publishErrors.length,
      notes: notes,
      status: report.status,
      timestamp: new Date().toISOString()
    });

    return jsonResponse({
      success: true,
      importId: safeId,
      status: report.status,
      published,
      totalRecords: report.records.length,
      errors: publishErrors.length,
      errorDetails: publishErrors.length > 0 ? publishErrors : undefined,
      message: report.status === 'COMPLETED'
        ? `Import approved. ${published} records published.`
        : `Import partially approved. ${published}/${report.records.length} records published.`
    }, 200, cors);

  } catch (err) {
    return jsonResponse({
      success: false,
      error: `Approval failed: ${err.message}`
    }, 500, cors);
  }
}

// ── Handler: Reject Import ──

export async function handleRejectImport(importId, request, env, cors) {
  if (!env.GITHUB_APP_ID) {
    return jsonResponse({ success: false, error: 'GitHub not configured.' }, 503, cors);
  }

  const safeId = sanitizePathSegment(importId);
  if (!safeId) {
    return jsonResponse({ success: false, error: 'Invalid import ID' }, 400, cors);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ success: false, error: 'Invalid JSON body. Reason is required.' }, 400, cors);
  }

  const reason = body.reason;
  if (!reason || typeof reason !== 'string' || reason.trim().length === 0) {
    return jsonResponse({ success: false, error: 'Rejection reason is required' }, 400, cors);
  }

  try {
    const importPath = `pending/imports/${safeId}.json`;
    const content = await readFile(importPath, env);
    if (!content) {
      return jsonResponse({ success: false, error: 'Import not found' }, 404, cors);
    }

    const report = JSON.parse(content);

    // Validate state transition
    const transition = validateTransition(report.status || 'PENDING_APPROVAL', 'REJECTED');
    if (!transition.valid) {
      return jsonResponse({
        success: false,
        error: `Cannot reject import in status "${report.status}": ${transition.error || 'Invalid transition'}`
      }, 409, cors);
    }

    // Update import status
    report.status = 'REJECTED';
    report.rejectedAt = new Date().toISOString();
    report.rejectedBy = 'admin';
    report.rejectionReason = reason;

    await writeFile(
      importPath,
      JSON.stringify(report, null, 2),
      env,
      `import: ${safeId} REJECTED — ${reason.substring(0, 50)}`
    );

    // Write audit log
    await writeAuditLog(env, {
      action: 'IMPORT_REJECTED',
      importId: safeId,
      source: report.source?.sourceName || 'unknown',
      recordCount: report.validRecords || 0,
      reason: reason,
      status: 'REJECTED',
      timestamp: new Date().toISOString()
    });

    return jsonResponse({
      success: true,
      importId: safeId,
      status: 'REJECTED',
      message: 'Import rejected. Records not published.'
    }, 200, cors);

  } catch (err) {
    return jsonResponse({
      success: false,
      error: `Rejection failed: ${err.message}`
    }, 500, cors);
  }
}

// ── Audit Log Helper ──

async function writeAuditLog(env, entry) {
  if (!env.GITHUB_APP_ID) return;

  const logId = `audit-import-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
  const logPath = `audit/${logId}.json`;

  try {
    await writeFile(
      logPath,
      JSON.stringify(entry, null, 2),
      env,
      `audit: ${entry.action} — ${entry.importId}`
    );
  } catch (err) {
    console.error(`[Audit Log] Failed to write: ${err.message}`);
  }
}

// ── Utils (these should be imported from the main module, but are duplicated here for module isolation) ──

function jsonResponse(data, status, cors = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...cors,
  };
  return new Response(JSON.stringify(data), {
    status: status,
    headers: headers,
  });
}
