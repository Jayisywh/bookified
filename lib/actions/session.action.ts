"server only";

import VoiceSession from "@/database/models/voice-session.model";
import { connectToDatabase } from "@/database/mongoose";
import { auth } from "@clerk/nextjs/server";
import {
  getCurrentBillingPeriodStart,
  PLAN_LIMITS,
  PlanType,
} from "../subscriptions-constants";
import { getUserLimits } from "../utils/subscription.utils";

export type StartSessionResult = {
  success: boolean;
  sessionId?: string;
  maxDurationMinute?: number;
  error?: string;
};

export const createVoiceSession = async (
  clerkId: string,
  bookId: string,
  clientPlan?: string,
): Promise<StartSessionResult & { plan?: string }> => {
  try {
    await connectToDatabase();
    const { orgId } = await auth();

    // 1. Get current server-side limits
    let userLimits = await getUserLimits(clerkId, orgId);
    const billingPeriodStart = getCurrentBillingPeriodStart();

    // 2. Normalize both plans for a safe comparison
    const serverPlan = userLimits.plan?.toLowerCase() || "free";
    const clientPlanHint = clientPlan?.toLowerCase() || "free";

    console.log(
      `[VoiceSession] ID: ${clerkId} | Server says: ${serverPlan} | Client says: ${clientPlanHint}`,
    );

    // 3. THE "TRUST" HANDSHAKE
    // If the server thinks it's free, but the client (which just paid) says it's Pro/Standard,
    // we prioritize the paid plan to avoid blocking the user.
    let effectivePlan = serverPlan as PlanType;

    if (
      serverPlan === "free" &&
      clientPlanHint !== "free" &&
      PLAN_LIMITS[clientPlanHint as PlanType]
    ) {
      console.warn(
        `[VoiceSession] 🛡️ OVERRIDE: Trusting client plan "${clientPlanHint}" for user ${clerkId}`,
      );
      effectivePlan = clientPlanHint as PlanType;
    }

    // Apply the chosen plan's limits
    userLimits = {
      ...PLAN_LIMITS[effectivePlan],
      plan: effectivePlan,
    };

    // 4. Final Limit Check
    // If maxSessionsPerMonth is -1, the user has unlimited sessions.
    const disableSessionLimits =
      process.env.DISABLE_SESSION_LIMITS === "true" ||
      process.env.NODE_ENV !== "production";

    if (!disableSessionLimits && userLimits.maxSessionsPerMonth !== -1) {
      const sessionCount = await VoiceSession.countDocuments({
        clerkId,
        billingPeriodStart,
      });

      if (sessionCount >= userLimits.maxSessionsPerMonth) {
        return {
          success: false,
          plan: userLimits.plan,
          error: `You've reached your monthly session limit (${userLimits.maxSessionsPerMonth}). Upgrade your plan for more sessions.`,
        };
      }
    }

    // 5. Create and return the session
    const session = await VoiceSession.create({
      clerkId,
      bookId,
      startedAt: new Date(),
      createdAt: new Date(),
      billingPeriodStart,
      durationSeconds: 0,
    });

    return {
      success: true,
      plan: userLimits.plan,
      sessionId: session._id.toString(),
      maxDurationMinute: userLimits.maxSessionDurationMinutes,
    };
  } catch (e) {
    console.error("Critical error in createVoiceSession:", e);
    return { success: false, error: "Internal server error starting session" };
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
