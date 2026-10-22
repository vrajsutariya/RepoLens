import AnalysisResult from '../../models/AnalysisResult.js';
import Repository from '../../models/Repository.js';

/**
 * Dynamically generates intelligent suggested questions based strictly on actual detected repository features.
 *
 * @param {string} repositoryId - MongoDB ObjectId
 * @returns {Promise<Array<string>>} List of suggested question strings
 */
export const generateSuggestedQuestions = async (repositoryId) => {
  const repository = await Repository.findById(repositoryId, 'name fileList totalFiles detectedLanguages');
  if (!repository) return [];

  const analysis = await AnalysisResult.findOne({ repositoryId });
  if (!analysis || analysis.status !== 'completed') {
    return [
      'How many files and what is the project structure of this repository?',
      'Which major technologies and frameworks are used in this codebase?',
      'What is the starting point or main entry point of this project?',
    ];
  }

  const suggestions = [
    'How many files and what is the project structure of this repository?',
    'Which major technologies and frameworks are used in this codebase?',
    'What is the starting point or main entry point of this project?',
  ];

  // 1. Entry Point Specific Suggestion
  if (analysis.entryPoints && analysis.entryPoints.length > 0) {
    const mainEntry = analysis.entryPoints.find((e) => e.type === 'application-server') || analysis.entryPoints[0];
    suggestions.push(`How does the application boot and initialize from \`${mainEntry.path}\`?`);
  }

  // 2. Discovered API Endpoints
  if (analysis.apiEndpoints && analysis.apiEndpoints.length > 0) {
    const businessEndpoint =
      analysis.apiEndpoints.find((ep) => !ep.path.includes('health') && ep.path !== '/') ||
      analysis.apiEndpoints[0];

    suggestions.push(
      `What happens when \`${businessEndpoint.method} ${businessEndpoint.path}\` is requested?`
    );
  } else if (analysis.dependencies?.declared?.length > 0) {
    suggestions.push('What package dependencies does this project rely on?');
  }

  // 3. Discovered Database Models & Queries
  if (analysis.databaseInteractions && analysis.databaseInteractions.length > 0) {
    const primaryModel = analysis.databaseInteractions[0].modelName;
    suggestions.push(`Where is the \`${primaryModel}\` database model defined and queried?`);
  }

  // 4. Authentication Check
  const hasAuth =
    (analysis.symbols || []).some((s) => {
      const n = s.name.toLowerCase();
      return n.includes('auth') || n.includes('login') || n.includes('user') || n.includes('token');
    }) ||
    (analysis.dependencies?.declared || []).some((d) => {
      const n = d.name.toLowerCase();
      return n.includes('bcrypt') || n.includes('jwt') || n.includes('passport') || n.includes('auth');
    });

  if (hasAuth) {
    suggestions.push('Where is user authentication and session management handled?');
  }

  // 5. Environment & Configuration Check
  const hasEnvOrConfig =
    (repository.fileList || []).some((f) => {
      const p = f.path.toLowerCase();
      return p.includes('.env') || p.includes('config') || p.includes('settings');
    }) ||
    (analysis.entryPoints || []).some((e) => e.type === 'configuration');

  if (hasEnvOrConfig && suggestions.length < 6) {
    suggestions.push('What environment variables and configurations are required to run this project?');
  }

  // Return at most 6 distinct questions
  return Array.from(new Set(suggestions)).slice(0, 6);
};

export default {
  generateSuggestedQuestions,
};
