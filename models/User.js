const mongoose = require('mongoose');
const userSchema = new mongoose.Schema({
    id: { type: String, required: true, unique: true },
    firstName: { type: String },
    messengerId: { type: String}
});

module.exports = mongoose.model('User', userSchema);
