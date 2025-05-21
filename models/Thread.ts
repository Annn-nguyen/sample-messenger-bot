import mongoose, { Document, Schema} from "mongoose";

export interface IThread extends Document {
    topic? : String;
    userId? : String;
    psid? : String;
    status: String;
    startTime? : Date;
    messages? : mongoose.Types.ObjectId[];
};

const threadSchema = new Schema<IThread>({
    topic: {type: String},
    userId: {type: String},
    psid: {type: String},
    status: {type: String, enum : ["open", "close"], required: true, default: "open"},
    startTime:{type: Date, default: Date.now  },
    messages: [{type: mongoose.Types.ObjectId, ref: 'Message'}]
});

export default mongoose.model<IThread>('Thread', threadSchema);