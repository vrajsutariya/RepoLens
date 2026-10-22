import mongoose from 'mongoose';

const FileItemSchema = new mongoose.Schema(
  {
    path: { type: String, required: true },
    name: { type: String, required: true },
    size: { type: Number, default: 0 },
    extension: { type: String, default: '' },
    language: { type: String, default: 'Other' },
    isBinary: { type: Boolean, default: false },
  },
  { _id: false }
);

const LanguageBreakdownSchema = new mongoose.Schema(
  {
    language: { type: String, required: true },
    count: { type: Number, required: true },
    percentage: { type: Number, required: true },
  },
  { _id: false }
);

const RepositorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    sourceType: {
      type: String,
      enum: ['zip', 'git'],
      required: true,
    },
    sourceUrl: {
      type: String,
      trim: true,
      default: null,
    },
    status: {
      type: String,
      enum: ['ready', 'processing', 'failed'],
      default: 'ready',
    },
    errorMessage: {
      type: String,
      default: null,
    },
    storageKey: {
      type: String,
      required: true,
      unique: true,
    },
    totalFiles: {
      type: Number,
      default: 0,
    },
    totalSize: {
      type: Number,
      default: 0,
    },
    detectedLanguages: [LanguageBreakdownSchema],
    fileTree: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    fileList: [FileItemSchema],
  },
  {
    timestamps: true,
  }
);

// Optimize queries for listing and status lookup
RepositorySchema.index({ createdAt: -1 });

export const Repository = mongoose.model('Repository', RepositorySchema);
export default Repository;
