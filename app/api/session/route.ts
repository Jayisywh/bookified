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

    const result = await createVoiceSession(userId, body.bookId);

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
