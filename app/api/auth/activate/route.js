import { dbAuth } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(req) {
  try {
    const user = await dbAuth.getCurrentUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "请先登录后再进行激活。" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const { code } = await req.json();
    if (!code) {
      return new Response(JSON.stringify({ error: "请输入激活码。" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const trimmedCode = code.trim();
    const updatedUser = await dbAuth.activateUser(user.id, trimmedCode);

    return new Response(JSON.stringify({ 
      success: true, 
      message: "激活成功！", 
      user: {
        ...user,
        ...updatedUser,
        is_activated: true
      }
    }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("CDKey Activation Route Error:", error);
    return new Response(JSON.stringify({ error: error.message || "激活失败，请重试。" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }
}
