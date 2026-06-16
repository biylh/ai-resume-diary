import { dbAuth } from "@/lib/db";

export async function PUT(req) {
  try {
    const user = await dbAuth.getCurrentUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const { displayName, industry, currentRole, targetRole } = await req.json();
    
    // Updates object
    const updates = {};
    if (displayName !== undefined) updates.display_name = displayName;
    if (industry !== undefined) updates.industry = industry;
    if (currentRole !== undefined) updates.current_role = currentRole;
    if (targetRole !== undefined) updates.target_role = targetRole;

    const updatedProfile = await dbAuth.updateProfile(updates);

    return new Response(JSON.stringify({ success: true, profile: updatedProfile }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Profile update error:", error);
    return new Response(JSON.stringify({ error: error.message || "Failed to update profile." }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
