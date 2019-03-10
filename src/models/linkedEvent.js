const mongoose = require('mongoose');

// define model for links between related events
const linkedEventSchema = new mongoose.Schema({
  displayName: { type: String, required: true, unique: true },
  // if auto-populating from ORIS, use Data.Name for top level event
  includes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'oevent' }],
}, { timestamps: true });

// create model class
const ModelClass = mongoose.model('linkedevent', linkedEventSchema);

// export model
module.exports = ModelClass;
