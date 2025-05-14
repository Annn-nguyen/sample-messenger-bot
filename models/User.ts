import mongoose , { Document, Schema } from "mongoose";

export interface IUser extends Document {
    firstName? : String;
    messengerId? : String;
};

const userSchema = new Schema<IUser>({
    id: { type: String, required: true, unique: true },
    firstName: { type: String },
    messengerId: { type: String}
});

export default mongoose.model <IUser>('User', userSchema);