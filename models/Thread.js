const mongoose = require('mongoose');
const threadSchema = new mongoose.Schema({
    id: { type: String, required: true, unique: true },
    topic: { type: String },
    userId: { type: String },
    startTime: { type: Date, default: Date.now },
    status: { type: String, enum : [ "open", "closed"], default: "open" },
    messages: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Message'
    }]
});

module.exports = mongoose.model ('Thread', threadSchema);