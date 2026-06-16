import { dbAuth, isSupabaseConfigured } from "@/lib/db";

// Direct cache control to avoid Next.js static rendering caching of cookie-dependent session route
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await dbAuth.getCurrentUser();
    return new Response(JSON.stringify({ 
      authenticated: !!user, 
      user,
      supabaseConfigured: isSupabaseConfigured()
    }), {
      status: 200,
      headers: { 
        "Content-Type": "application/json",
        "Cache-Control": "no-store, max-age=0"
      },
    });
  } catch (error) {
    console.error("Session API error:", error);
    return new Response(JSON.stringify({ authenticated: false, error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
