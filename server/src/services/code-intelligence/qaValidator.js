import fs from 'fs';
import { assertSafePath } from '../../utils/pathSafety.js';

/**
 * Validates generated Gemini answer claims, citation references, and suggested files
 * against authoritative repository evidence and filesystem state.
 *
 * @param {object} rawOutput - Parsed structured object from Gemini
 * @param {Array<object>} authoritativeEvidence - Array of backend-retrieved evidence items
 * @param {object} repository - Repository Mongoose document
 * @param {string} extractedDir - Root path of extracted repository
 * @returns {Promise<{
 *   answer: string,
 *   summary: string,
 *   claims: Array<object>,
 *   evidence: Array<object>,
 *   inferences: Array<string>,
 *   limitations: Array<string>,
 *   suggestedFiles: Array<string>
 * }>}
 */
export const validateQAResult = async (
  rawOutput,
  authoritativeEvidence = [],
  repository,
  extractedDir
) => {
  const safeData = rawOutput && typeof rawOutput === 'object' ? rawOutput : {};

  // 1. Authoritative Evidence Map
  const evidenceMap = new Map();
  for (const item of authoritativeEvidence) {
    if (item && item.id) {
      evidenceMap.set(item.id, item);
    }
  }

  // Set of valid file paths in repository (normalized)
  const validRepoFiles = new Set(
    (repository?.fileList || []).map((f) => (f.path || '').replace(/\\/g, '/'))
  );

  // 2. Validate Claims and Citations
  const validatedClaims = [];
  const referencedEvidenceIds = new Set();

  const rawClaims = Array.isArray(safeData.claims) ? safeData.claims : [];

  for (const claim of rawClaims) {
    if (!claim || typeof claim.text !== 'string' || !claim.text.trim()) {
      continue;
    }

    const text = claim.text.trim();
    let type = claim.type === 'source_fact' ? 'source_fact' : 'architectural_inference';
    const rawIds = Array.isArray(claim.evidenceIds) ? claim.evidenceIds : [];

    // Filter evidence IDs: ONLY allow IDs that exist in authoritativeEvidence
    const validIds = [];
    for (const id of rawIds) {
      if (typeof id === 'string' && evidenceMap.has(id)) {
        validIds.push(id);
        referencedEvidenceIds.add(id);
      }
    }

    // Guard: A claim cannot be a "source_fact" without at least one verified evidence ID
    if (type === 'source_fact' && validIds.length === 0) {
      type = 'architectural_inference';
    }

    validatedClaims.push({
      text,
      type,
      evidenceIds: Array.from(new Set(validIds)),
    });
  }

  // 3. Authoritative Evidence Verification against Disk
  // Only include evidence that exists in authoritativeEvidence (and was referenced, or top evidence if none explicitly referenced)
  const candidateEvidenceIds =
    referencedEvidenceIds.size > 0
      ? Array.from(referencedEvidenceIds)
      : authoritativeEvidence.slice(0, 3).map((e) => e.id);

  const verifiedEvidenceList = [];

  for (const evId of candidateEvidenceIds) {
    const item = evidenceMap.get(evId);
    if (!item) continue;

    // Verify file path safety and existence
    let isFileValid = false;
    let actualLineCount = 0;

    try {
      const fullPath = assertSafePath(extractedDir, item.filePath);
      if (fs.existsSync(fullPath)) {
        const stats = await fs.promises.stat(fullPath);
        if (!stats.isDirectory()) {
          const content = await fs.promises.readFile(fullPath, 'utf8');
          actualLineCount = content.split(/\r?\n/).length;
          isFileValid = true;
        }
      }
    } catch {
      isFileValid = false;
    }

    if (!isFileValid) {
      // Discard unverified or fabricated file citation
      continue;
    }

    // Validate line bounds: ensure startLine <= actualLineCount
    const boundedStart = Math.max(1, Math.min(item.startLine, actualLineCount));
    const boundedEnd = Math.max(boundedStart, Math.min(item.endLine, actualLineCount));

    verifiedEvidenceList.push({
      id: item.id,
      filePath: item.filePath,
      startLine: boundedStart,
      endLine: boundedEnd,
      evidenceType: item.evidenceType || 'source_excerpt',
      symbolName: item.symbolName || null,
      snippet: item.snippet || '',
      retrievalMethod: item.retrievalMethod || 'verified',
      verification: 'source_verified',
    });
  }

  // Sort evidence by ID
  verifiedEvidenceList.sort((a, b) => {
    const numA = parseInt(a.id.replace(/\D/g, ''), 10) || 0;
    const numB = parseInt(b.id.replace(/\D/g, ''), 10) || 0;
    return numA - numB;
  });

  // 4. Validate Suggested Files
  // Reject any file not in repository.fileList
  const rawSuggested = Array.isArray(safeData.suggestedFiles) ? safeData.suggestedFiles : [];
  const validatedSuggestedFiles = [];

  for (const file of rawSuggested) {
    if (typeof file === 'string') {
      const normPath = file.trim().replace(/\\/g, '/');
      if (validRepoFiles.has(normPath) && !validatedSuggestedFiles.includes(normPath)) {
        validatedSuggestedFiles.push(normPath);
      }
    }
  }

  // 5. Inferences and Limitations
  const inferences = Array.isArray(safeData.inferences)
    ? safeData.inferences.filter((i) => typeof i === 'string' && i.trim().length > 0)
    : [];

  const limitations = Array.isArray(safeData.limitations)
    ? safeData.limitations.filter((l) => typeof l === 'string' && l.trim().length > 0)
    : [];

  // Default answer and summary fallbacks
  const answer =
    typeof safeData.answer === 'string' && safeData.answer.trim()
      ? safeData.answer.trim()
      : 'No verified repository evidence could be matched to answer this question.';

  const summary =
    typeof safeData.summary === 'string' && safeData.summary.trim()
      ? safeData.summary.trim()
      : 'Evidence search completed.';

  return {
    answer,
    summary,
    claims: validatedClaims,
    evidence: verifiedEvidenceList,
    inferences,
    limitations,
    suggestedFiles: validatedSuggestedFiles,
  };
};

export default {
  validateQAResult,
};
