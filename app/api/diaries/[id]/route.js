import { dbAuth, dbDiaries } from "@/lib/db";

export async function PUT(req, { params }) {
  try {
    const user = await dbAuth.getCurrentUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const { id } = await params;
    const body = await req.json();
    
    // Updates
    const updates = {};
    if (body.rawInput !== undefined) updates.raw_input = body.rawInput;
    if (body.refinedBullet !== undefined) updates.refined_bullet = body.refinedBullet;
    if (body.chatHistory !== undefined) updates.chat_history = body.chatHistory;
    if (body.category !== undefined) updates.category = body.category;
    if (body.isPinned !== undefined) updates.is_pinned = body.isPinned;

    const updatedDiary = await dbDiaries.updateDiary(id, updates);

    return new Response(JSON.stringify({ success: true, diary: updatedDiary }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Update diary error:", error);
    return new Response(JSON.stringify({ error: error.message || "Failed to update diary." }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

export async function DELETE(req, { params }) {
  try {
    const user = await dbAuth.getCurrentUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const { id } = await params;
    await dbDiaries.deleteDiary(id);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Delete diary error:", error);
    return new Response(JSON.stringify({ error: error.message || "Failed to delete diary." }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
