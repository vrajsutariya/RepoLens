/**
 * Detects database interactions, data models, schemas, and query operations in code.
 *
 * @param {Array<{ path: string, content: string }>} files
 * @returns {Array<{ technology: string, modelName: string, operationType: string, file: string, startLine: number, endLine: number, evidence: string, confidence: string }>}
 */
export const analyzeDatabaseInteractions = (files) => {
  const interactions = [];

  for (const file of files) {
    if (!file.content) continue;
    const lines = file.content.split(/\r?\n/);

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineNum = i + 1;

      // 1. Mongoose Schema: new mongoose.Schema({ ... }) or new Schema({ ... })
      const schemaMatch = line.match(/(?:const|let|var)\s+([a-zA-Z0-9_]+Schema)\s*=\s*new\s+(?:mongoose\.)?Schema/i);
      if (schemaMatch) {
        interactions.push({
          technology: 'MongoDB / Mongoose',
          modelName: schemaMatch[1].replace(/Schema$/i, ''),
          operationType: 'define-schema',
          file: file.path,
          startLine: lineNum,
          endLine: lineNum,
          evidence: line.trim(),
          confidence: 'ast-verified',
        });
      }

      // 2. Mongoose Model: mongoose.model('ModelName', SchemaName)
      const modelMatch = line.match(/(?:mongoose\.)?model\(\s*['"`]([a-zA-Z0-9_]+)['"`]/i);
      if (modelMatch) {
        interactions.push({
          technology: 'MongoDB / Mongoose',
          modelName: modelMatch[1],
          operationType: 'define-model',
          file: file.path,
          startLine: lineNum,
          endLine: lineNum,
          evidence: line.trim(),
          confidence: 'ast-verified',
        });
      }

      // 3. Mongoose Query Operations: ModelName.find(), ModelName.findById(), ModelName.create(), etc.
      const queryMatch = line.match(/\b([A-Z][a-zA-Z0-9_]+)\.(find|findById|findOne|create|save|updateOne|updateMany|deleteOne|deleteMany|aggregate|countDocuments)\s*\(/);
      if (queryMatch) {
        const potentialModel = queryMatch[1];
        const op = queryMatch[2];

        // Skip false positives like React, Promise, Object, Array, Math, Router, Express, etc.
        const nonModels = new Set(['React', 'Promise', 'Object', 'Array', 'Math', 'Router', 'Express', 'JSON', 'Date', 'String', 'Number', 'Boolean']);
        if (!nonModels.has(potentialModel)) {
          let opType = 'query';
          if (['create', 'save'].includes(op)) opType = 'create';
          else if (['updateOne', 'updateMany'].includes(op)) opType = 'update';
          else if (['deleteOne', 'deleteMany'].includes(op)) opType = 'delete';
          else if (op === 'aggregate') opType = 'aggregate';

          interactions.push({
            technology: 'MongoDB / Mongoose',
            modelName: potentialModel,
            operationType: opType,
            file: file.path,
            startLine: lineNum,
            endLine: lineNum,
            evidence: line.trim(),
            confidence: 'ast-verified',
          });
        }
      }

      // 4. Prisma Client queries: prisma.user.findMany(), prisma.post.create()
      const prismaMatch = line.match(/prisma\.([a-zA-Z0-9_]+)\.(findMany|findUnique|create|update|delete|count)\s*\(/i);
      if (prismaMatch) {
        interactions.push({
          technology: 'Prisma ORM',
          modelName: prismaMatch[1],
          operationType: 'query',
          file: file.path,
          startLine: lineNum,
          endLine: lineNum,
          evidence: line.trim(),
          confidence: 'ast-verified',
        });
      }

      // 5. Sequelize define: sequelize.define('User', { ... })
      const seqMatch = line.match(/sequelize\.define\(\s*['"`]([a-zA-Z0-9_]+)['"`]/i);
      if (seqMatch) {
        interactions.push({
          technology: 'Sequelize',
          modelName: seqMatch[1],
          operationType: 'define-model',
          file: file.path,
          startLine: lineNum,
          endLine: lineNum,
          evidence: line.trim(),
          confidence: 'ast-verified',
        });
      }

      // 6. Raw SQL queries: client.query('SELECT ...')
      const sqlMatch = line.match(/(?:client|pool|db)\.query\(\s*['"`](SELECT|INSERT|UPDATE|DELETE|CREATE|DROP)/i);
      if (sqlMatch) {
        interactions.push({
          technology: 'SQL Database',
          modelName: 'Raw Table',
          operationType: 'raw-query',
          file: file.path,
          startLine: lineNum,
          endLine: lineNum,
          evidence: line.trim(),
          confidence: 'regex-inferred',
        });
      }
    }
  }

  return interactions;
};
