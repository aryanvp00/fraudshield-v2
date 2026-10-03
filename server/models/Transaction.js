const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  // Owner. Every query is filtered by this.
  userId:            { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },

  // Raw input fields (matching dataset)
  type:              { type: String, enum: ['PAYMENT','TRANSFER','CASH_OUT','DEBIT','CASH_IN'], required: true },
  amount:            { type: Number, required: true },
  oldbalanceOrg:     { type: Number, required: true },
  newbalanceOrig:    { type: Number, required: true },
  oldbalanceDest:    { type: Number, default: 0 },
  newbalanceDest:    { type: Number, default: 0 },
  step:              { type: Number, default: 1 },

  // Optional UPI context fields (for display)
  upiApp:            { type: String, default: 'Unknown' },
  senderUPI:         { type: String, default: '' },
  receiverUPI:       { type: String, default: '' },
  note:              { type: String, default: '' },

  // ML Results
  fraudProbability:  { type: Number },
  verdict:           { type: String, enum: ['FRAUD','SUSPICIOUS','SAFE'] },
  confidence:        { type: String, enum: ['HIGH','MEDIUM','LOW'] },
  anomalyScore:      { type: Number },
  reasons:           [{ factor: String, contribution: Number }],

  // Meta
  createdAt:         { type: Date, default: Date.now },
  reviewedBy:        { type: String, default: null },
  isReviewed:        { type: Boolean, default: false }
});

transactionSchema.index({ userId: 1, createdAt: -1 });
transactionSchema.index({ userId: 1, verdict: 1 });
transactionSchema.index({ createdAt: -1 });
transactionSchema.index({ fraudProbability: -1 });

module.exports = mongoose.model('Transaction', transactionSchema);
