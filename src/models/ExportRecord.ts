import { Schema, model } from 'mongoose';

const exportRecordSchema = new Schema({
  format: { type: String, enum: ['XLSX', 'PDF'], required: true },
  status: { type: String, enum: ['PENDING', 'COMPLETED', 'FAILED'], default: 'COMPLETED', index: true },
  filters: { type: Schema.Types.Mixed, default: {} },
  recordCount: { type: Number, default: 0 },
  fileName: { type: String },
  filePath: { type: String },
  errorMessage: { type: String },
  completedAt: { type: Date },
}, { timestamps: true });

export const ExportRecord = model('ExportRecord', exportRecordSchema);
