import mongoose from 'mongoose';

const FrameworkSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    category: {
      type: String,
      enum: ['frontend', 'backend', 'database', 'build-tool', 'testing', 'utility', 'other'],
      default: 'other',
    },
    version: { type: String, default: null },
    confidence: {
      type: String,
      enum: ['manifest-verified', 'code-inferred'],
      default: 'manifest-verified',
    },
    evidence: { type: String, required: true },
  },
  { _id: false }
);

const EntryPointSchema = new mongoose.Schema(
  {
    path: { type: String, required: true },
    type: {
      type: String,
      enum: ['application-server', 'frontend-mount', 'root-component', 'configuration', 'cli', 'script', 'docker'],
      default: 'configuration',
    },
    description: { type: String, required: true },
    command: { type: String, default: null },
    evidence: { type: String, default: null },
    startLine: { type: Number, default: 1 },
    endLine: { type: Number, default: 1 },
  },
  { _id: false }
);

const SymbolSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    type: {
      type: String,
      enum: ['function', 'arrow-function', 'class', 'method', 'variable', 'export'],
      required: true,
    },
    file: { type: String, required: true },
    startLine: { type: Number, required: true },
    endLine: { type: Number, required: true },
    isExported: { type: Boolean, default: false },
    isAsync: { type: Boolean, default: false },
    methodType: { type: String, default: null }, // 'get', 'set', 'constructor', 'method'
    parentClass: { type: String, default: null },
    params: [{ type: String }],
    detectionMethod: {
      type: String,
      enum: ['ast-verified', 'heuristic'],
      default: 'ast-verified',
    },
  },
  { _id: false }
);

const ApiEndpointSchema = new mongoose.Schema(
  {
    method: {
      type: String,
      enum: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS', 'HEAD', 'USE', 'ALL'],
      required: true,
    },
    path: { type: String, required: true },
    file: { type: String, required: true },
    startLine: { type: Number, required: true },
    endLine: { type: Number, required: true },
    handlerName: { type: String, default: 'anonymous' },
    middlewares: [{ type: String }],
    routerPrefix: { type: String, default: '' },
    confidence: {
      type: String,
      enum: ['ast-verified', 'regex-inferred'],
      default: 'ast-verified',
    },
  },
  { _id: false }
);

const DatabaseInteractionSchema = new mongoose.Schema(
  {
    technology: { type: String, required: true }, // e.g., 'MongoDB / Mongoose', 'Sequelize', 'Prisma'
    modelName: { type: String, required: true },
    operationType: {
      type: String,
      enum: ['define-schema', 'define-model', 'query', 'create', 'update', 'delete', 'aggregate', 'raw-query'],
      required: true,
    },
    file: { type: String, required: true },
    startLine: { type: Number, required: true },
    endLine: { type: Number, required: true },
    evidence: { type: String, required: true },
    confidence: {
      type: String,
      enum: ['ast-verified', 'regex-inferred'],
      default: 'ast-verified',
    },
  },
  { _id: false }
);

const AnalysisWarningSchema = new mongoose.Schema(
  {
    file: { type: String, required: true },
    message: { type: String, required: true },
    type: { type: String, default: 'parse-warning' },
  },
  { _id: false }
);

const AnalysisResultSchema = new mongoose.Schema(
  {
    repositoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Repository',
      required: true,
      unique: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['pending', 'processing', 'completed', 'failed'],
      default: 'pending',
    },
    version: {
      type: String,
      default: '1.0.0',
    },
    metrics: {
      totalFilesAnalyzed: { type: Number, default: 0 },
      totalLOC: { type: Number, default: 0 },
      symbolsCount: { type: Number, default: 0 },
      apiEndpointsCount: { type: Number, default: 0 },
      databaseModelsCount: { type: Number, default: 0 },
      relationshipsCount: { type: Number, default: 0 },
    },
    languages: [
      {
        language: String,
        fileCount: Number,
        loc: Number,
        percentage: Number,
        isSourceCode: Boolean,
      },
    ],
    frameworks: [FrameworkSchema],
    entryPoints: [EntryPointSchema],
    symbols: [SymbolSchema],
    dependencies: {
      declared: [
        {
          name: String,
          version: String,
          isDev: Boolean,
          usageCount: { type: Number, default: 0 },
        },
      ],
      internalImports: [
        {
          sourceFile: String,
          targetFile: String,
          importedSymbols: [String],
          startLine: Number,
        },
      ],
      externalImports: [
        {
          sourceFile: String,
          packageName: String,
          importedSymbols: [String],
          startLine: Number,
        },
      ],
      unresolvedImports: [
        {
          sourceFile: String,
          rawPath: String,
          startLine: Number,
        },
      ],
      circularDependencies: [
        {
          cycle: [String],
        },
      ],
    },
    apiEndpoints: [ApiEndpointSchema],
    databaseInteractions: [DatabaseInteractionSchema],
    relationshipGraph: {
      nodes: [
        {
          id: String,
          label: String,
          type: { type: String, default: 'file' },
          language: String,
          symbolsCount: Number,
        },
      ],
      edges: [
        {
          from: String,
          to: String,
          type: { type: String, default: 'imports' },
          symbols: [String],
        },
      ],
    },
    warnings: [AnalysisWarningSchema],
    startedAt: { type: Date, default: Date.now },
    completedAt: { type: Date, default: null },
    errorMessage: { type: String, default: null },
  },
  {
    timestamps: true,
  }
);

export const AnalysisResult = mongoose.model('AnalysisResult', AnalysisResultSchema);
export default AnalysisResult;
