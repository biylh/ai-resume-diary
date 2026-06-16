import { dbAuth } from "@/lib/db";

export async function POST(req) {
  try {
    const { email, password } = await req.json();
    if (!email || !password) {
      return new Response(JSON.stringify({ error: "Email and password are required." }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const data = await dbAuth.login(email, password);
    return new Response(JSON.stringify({ success: true, user: data.user }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Login API error:", error);
    return new Response(JSON.stringify({ error: error.message || "Login failed." }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }
}
