import mongoose, { Schema, Document, Model } from 'mongoose';

// User schema
export interface IUser extends Document {
  id: string;
  name: string;
  email: string;
  password: string;
  online: boolean;
  lastSeen: Date | null;
}

const UserSchema: Schema<IUser> = new Schema({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  online: { type: Boolean, default: false },
  lastSeen: { type: Date, default: null },
});

export const User: Model<IUser> = mongoose.model<IUser>('User', UserSchema);

// Message schema
export interface IMessage extends Document {
  id: number;
  sender: string;
  receiver: string;
  text: string;
  date: Date;
  status: 'sent' | 'delivered' | 'seen';
}

const MessageSchema: Schema<IMessage> = new Schema({
  id: { type: Number, required: true, unique: true },
  sender: { type: String, required: true },
  receiver: { type: String, required: true },
  text: { type: String, required: true },
  date: { type: Date, required: true },
  status: { type: String, enum: ['sent', 'delivered', 'seen'], default: 'sent' },
});

export const Message: Model<IMessage> = mongoose.model<IMessage>('Message', MessageSchema); 