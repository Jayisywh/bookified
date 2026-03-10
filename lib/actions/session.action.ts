"server only";

import VoiceSession from "@/database/models/voice-session.model";
import { connectToDatabase } from "@/database/mongoose";
import { getCurrentBillingPeriodStart } from "../subscriptions-constants";

export type StartSessionResult = {
  success: boolean;
  sessionId?: string;
  maxDurationMinute?: number;
  error?: string;
};

export const createVoiceSession = async (
  clerkId: string,
  bookId: string,
): Promise<StartSessionResult> => {
  try {
    await connectToDatabase();
    const session = await VoiceSession.create({
      clerkId,
      bookId,
      startedAt: new Date(),
      createdAt: new Date(),
      billingPeriodStart: getCurrentBillingPeriodStart(),
      durationSeconds: 0,
    });
    return {
      success: true,
      sessionId: session._id.toString(),
    };
  } catch (e) {
    console.error("Error occured", e);
    return { success: false, error: "Failed to start voice session" };
  }
};

export const endVoiceSession = async (
  sessionId: string,
  durationSeconds: number,
): Promise<StartSessionResult> => {
  try {
    await connectToDatabase();
    const result = await VoiceSession.findByIdAndUpdate(
      sessionId,
      {
        endedAt: new Date(),
        durationSeconds,
      },
      { new: true },
    );

    if (!result) {
      return { success: false, error: "Voice session not found" };
    }

    return { success: true };
  } catch (e) {
    console.error("Error ending voice session", e);
    return { success: false };
  }
};
