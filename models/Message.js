const mongoose = require('mongoose');
const messageSchema = new mongoose.Schema({
    id: { type: String, required: true, unique: true },
    threadId: {type: String, required: true},
    userId: { type: String, required: true },
    text: { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Message', messageSchema);