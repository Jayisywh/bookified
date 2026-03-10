import { getUserPlan } from "@/lib/utils/subscription.utils";

export async function GET() {
  try {
    const plan = await getUserPlan();
    return Response.json({ success: true, plan });
  } catch (e) {
    console.error("Error getting plan:", e);
    return Response.json({ success: false, plan: "free" }, { status: 200 });
  }
}

