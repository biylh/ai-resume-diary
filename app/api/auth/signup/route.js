import { dbAuth } from "@/lib/db";

export async function POST(req) {
  try {
    const { email, password, displayName, industry, currentRole, targetRole } = await req.json();
    if (!email || !password) {
      return new Response(JSON.stringify({ error: "Email and password are required." }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const data = await dbAuth.signup(email, password, displayName, industry, currentRole, targetRole);
    return new Response(JSON.stringify({ success: true, user: data.user }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Signup API error:", error);
    return new Response(JSON.stringify({ error: error.message || "Registration failed." }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }
}
