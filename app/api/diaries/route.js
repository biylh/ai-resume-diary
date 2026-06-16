import { dbAuth, dbDiaries } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await dbAuth.getCurrentUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const diaries = await dbDiaries.getDiaries();
    return new Response(JSON.stringify({ diaries }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Fetch diaries error:", error);
    return new Response(JSON.stringify({ error: error.message || "Failed to fetch diaries." }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

export async function POST(req) {
  try {
    const user = await dbAuth.getCurrentUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const { rawInput, refinedBullet, chatHistory, category } = await req.json();
    
    if (!rawInput) {
      return new Response(JSON.stringify({ error: "rawInput is required." }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const diary = await dbDiaries.addDiary(
      rawInput,
      refinedBullet || "",
      chatHistory || [],
      category || "日常工作"
    );

    return new Response(JSON.stringify({ success: true, diary }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Create diary error:", error);
    return new Response(JSON.stringify({ error: error.message || "Failed to create diary." }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
