import mongoose , { Document, Schema } from "mongoose";

export interface IUser extends Document {
    firstName? : String;
    messengerId? : String;
    locale? : String;
};

const userSchema = new Schema<IUser>({
    firstName: { type: String },
    messengerId: { type: String},
    locale: { type: String },
});

export default mongoose.model <IUser>('User', userSchema);