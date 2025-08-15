import mongoose from "mongoose";

const timerSchema = new mongoose.Schema({
    startTime: { type: Date, default: null },
    isRunning: { type: Boolean, default: false },
    isCheckedOut: { type: Boolean, default: false },
});

const Timer = mongoose.model("Timer", timerSchema);

export { Timer };
