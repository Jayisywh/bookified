import { createVoiceSession } from "@/lib/actions/session.action";
import { auth } from "@clerk/nextjs/server";

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    const body = await req.json();

    if (!userId) {
      return Response.json({
        success: false,
        error: "Unauthorized",
      });
    }

    // allow the client to send its perceived plan as a hint; this helps when
    // the subscription metadata hasn't propagated yet or the server is
    // still seeing the free plan by mistake.
    const clientPlan =
      typeof body.clientPlan === "string" ? body.clientPlan : undefined;

    const result = await createVoiceSession(userId, body.bookId, clientPlan);

    return Response.json(result);
  } catch (error) {
    console.error("API error:", error);

    return Response.json(
      {
        success: false,
        error: "Server error",
      },
      { status: 500 },
    );
  }
}
