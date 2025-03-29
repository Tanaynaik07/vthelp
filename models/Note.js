const noteSchema = new mongoose.Schema({
    // ... existing fields ...
    isParts: {
        type: Boolean,
        default: false
    },
    totalParts: {
        type: Number,
        default: 1
    }
}); 