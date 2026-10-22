import mongoose from 'mongoose';

const TechnologyItemSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    category: { type: String, default: 'other' },
    version: { type: String, default: null },
    confidence: { type: String, default: 'manifest-verified' },
    purpose: { type: String, default: '' },
  },
  { _id: false }
);

const EntryPointGuideSchema = new mongoose.Schema(
  {
    path: { type: String, required: true },
    type: { type: String, default: 'application-server' },
    description: { type: String, default: '' },
    startLine: { type: Number, default: 1 },
    endLine: { type: Number, default: 1 },
  },
  { _id: false }
);

const KeyModuleSchema = new mongoose.Schema(
  {
    path: { type: String, required: true },
    responsibility: { type: String, default: '' },
    keySymbols: [{ type: String }],
  },
  { _id: false }
);

const SetupCommandSchema = new mongoose.Schema(
  {
    command: { type: String, required: true },
    description: { type: String, default: '' },
    isVerified: { type: Boolean, default: false },
    warning: { type: String, default: null },
  },
  { _id: false }
);

const RequiredServiceSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    description: { type: String, default: '' },
    isVerified: { type: Boolean, default: false },
  },
  { _id: false }
);

const ExpectedUrlSchema = new mongoose.Schema(
  {
    label: { type: String, required: true },
    url: { type: String, required: true },
    description: { type: String, default: '' },
  },
  { _id: false }
);

const EnvironmentVariableSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    description: { type: String, default: '' },
    required: { type: Boolean, default: true },
    placeholder: { type: String, default: '' },
    usedBy: { type: String, default: '' },
    isVerified: { type: Boolean, default: false },
  },
  { _id: false }
);

const RecommendedFileSchema = new mongoose.Schema(
  {
    order: { type: Number, required: true },
    filePath: { type: String, required: true },
    purpose: { type: String, default: '' },
    whyItMatters: { type: String, default: '' },
    keySymbols: [{ type: String }],
    startLine: { type: Number, default: 1 },
    endLine: { type: Number, default: 1 },
    nextFile: { type: String, default: null },
  },
  { _id: false }
);

const RequestFlowStepSchema = new mongoose.Schema(
  {
    step: { type: Number, required: true },
    component: { type: String, required: true },
    action: { type: String, required: true },
    filePath: { type: String, default: null },
    startLine: { type: Number, default: null },
    endLine: { type: Number, default: null },
    isVerified: { type: Boolean, default: false },
    confidence: { type: String, default: 'code-inferred' },
  },
  { _id: false }
);

const TroubleshootingItemSchema = new mongoose.Schema(
  {
    issue: { type: String, required: true },
    possibleCause: { type: String, default: '' },
    suggestedFix: { type: String, default: '' },
    isVerified: { type: Boolean, default: false },
  },
  { _id: false }
);

const EvidenceSnippetSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    filePath: { type: String, required: true },
    startLine: { type: Number, required: true },
    endLine: { type: Number, required: true },
    evidenceType: { type: String, default: 'code_snippet' },
    snippet: { type: String, required: true },
  },
  { _id: false }
);

const OnboardingGuideSchema = new mongoose.Schema(
  {
    repositoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Repository',
      required: true,
      unique: true,
      index: true,
    },
    analysisId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AnalysisResult',
      required: true,
    },
    analysisCompletedAt: {
      type: Date,
      default: Date.now,
    },
    isStale: {
      type: Boolean,
      default: false,
    },
    status: {
      type: String,
      enum: ['ready', 'generating', 'failed'],
      default: 'ready',
    },
    errorMessage: {
      type: String,
      default: null,
    },
    overview: {
      purpose: { type: String, default: '' },
      features: [{ type: String }],
      technologies: [TechnologyItemSchema],
      missingInfo: [{ type: String }],
    },
    architecture: {
      frontend: { type: String, default: '' },
      backend: { type: String, default: '' },
      entryPoints: [EntryPointGuideSchema],
      keyModules: [KeyModuleSchema],
      relationships: { type: String, default: '' },
      recommendedGraph: { type: String, default: 'modules' },
    },
    setup: {
      prerequisites: [{ type: String }],
      installCommands: [SetupCommandSchema],
      devCommands: [SetupCommandSchema],
      prodCommands: [SetupCommandSchema],
      requiredServices: [RequiredServiceSchema],
      expectedUrls: [ExpectedUrlSchema],
    },
    environment: {
      hasExampleFile: { type: Boolean, default: false },
      exampleFilePath: { type: String, default: null },
      setupInstructions: { type: String, default: '' },
      variables: [EnvironmentVariableSchema],
    },
    readingOrder: [RecommendedFileSchema],
    requestFlow: {
      summary: { type: String, default: '' },
      steps: [RequestFlowStepSchema],
      limitations: [{ type: String }],
    },
    testingAndTroubleshooting: {
      hasTests: { type: Boolean, default: false },
      testCommands: [SetupCommandSchema],
      testDirectories: [{ type: String }],
      troubleshooting: [TroubleshootingItemSchema],
    },
    evidence: [EvidenceSnippetSchema],
    metadata: {
      generatedAt: { type: Date, default: Date.now },
      modelUsed: { type: String, default: 'gemini-3.8-flash' },
      generationDurationMs: { type: Number, default: 0 },
    },
  },
  {
    timestamps: true,
  }
);

export const OnboardingGuide = mongoose.model('OnboardingGuide', OnboardingGuideSchema);
export default OnboardingGuide;
