import mongoose, { Schema, model } from "mongoose";
import { v4 as uuidv4 } from 'uuid';

export interface IMessage extends Document {
    threadId: String;
    sender : String;
    userId?: String;
    text: String;
    timestamp: Date;
};

const messageSchema = new Schema<IMessage>({
    threadId: {type: String, required: true},
    sender: {type: String, enum: ['user', 'bot'], required: true},
    userId: {type: String},
    text: { type: String, required: true},
    timestamp : { type: Date, required: true, default : Date.now }
});

export default mongoose.model<IMessage>('Message', messageSchema);;