import { dbAuth } from "@/lib/db";

export async function POST() {
  try {
    const data = await dbAuth.loginAsGuest();
    return new Response(JSON.stringify({ success: true, user: data.user }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Guest login API error:", error);
    return new Response(JSON.stringify({ error: error.message || "Guest login failed." }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }
}
