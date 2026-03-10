"server only";

import { searchBookSegments } from "@/lib/actions/book.actions";
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

    const { toolCalls } = body;

    if (!toolCalls || !Array.isArray(toolCalls)) {
      return Response.json({
        success: false,
        error: "Invalid request body",
      });
    }

    const results: string[] = [];

    for (const call of toolCalls) {
      if (call.name === "search book") {
        const { bookId, query } = call.parameters;
        if (!bookId || !query) {
          results.push("Invalid parameters for search book");
          continue;
        }

        const searchResult = await searchBookSegments(bookId, query, 3);

        if (searchResult.success && searchResult.data.length > 0) {
          const combined = searchResult.data
            .map((segment: any) => segment.content)
            .join("\n\n");
          results.push(combined);
        } else {
          results.push("no information found about this topic");
        }
      }
    }

    return Response.json({
      success: true,
      results,
    });
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
