import { dbAuth } from "@/lib/db";

export async function POST() {
  try {
    await dbAuth.logout();
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Logout API error:", error);
    return new Response(JSON.stringify({ error: error.message || "Logout failed." }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
