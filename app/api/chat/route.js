import { GoogleGenerativeAI } from "@google/generative-ai";
import { dbAuth } from "@/lib/db";

export async function POST(req) {
  try {
    const { message, history, userProfile, customApiKey } = await req.json();

    // 1. Get current logged-in user
    const user = await dbAuth.getCurrentUser();
    if (!user) {
      return new Response(
        JSON.stringify({ error: "未授权的会话，请先登录。" }), 
        {
          status: 401,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // 2. Identify if user is guest
    const isGuest = user.id.startsWith("guest-") || user.email === "guest@example.com" || !user.email;

    // 3. Validation Logic
    if (isGuest) {
      // If guest does not have customApiKey, we enforce 3 times limit
      if (!customApiKey || customApiKey.trim() === "") {
        const chatCount = await dbAuth.getGuestChatCount(user.id);
        if (chatCount >= 3) {
          return new Response(
            JSON.stringify({ 
              error: "LIMIT_REACHED",
              message: "访客模式体验额度已达上限（3次）。为了继续使用，请注册/登录，并在个人配置中绑定您自己的 Gemini API 密钥。" 
            }), 
            {
              status: 403,
              headers: { "Content-Type": "application/json" },
            }
          );
        }
        // Increment chat count for the guest
        await dbAuth.incrementGuestChatCount(user.id);
      }
    } else {
      // For registered users, we enforce customApiKey (they cannot use server key to prevent abuse)
      if (!customApiKey || customApiKey.trim() === "") {
        return new Response(
          JSON.stringify({ 
            error: "BIND_KEY_REQUIRED",
            message: "当前为注册账户模式，请在【个人配置】中绑定并使用您自己的 Gemini API 密钥以继续使用。" 
          }), 
          {
            status: 403,
            headers: { "Content-Type": "application/json" },
          }
        );
      }
    }

    const apiKey = customApiKey || process.env.GEMINI_API_KEY;
    
    if (!apiKey || apiKey === "your_gemini_api_key_here") {
      return new Response(
        JSON.stringify({ 
          error: "Gemini API key is not configured on the server. Please add your key in the personal settings panel." 
        }), 
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const genAI = new GoogleGenerativeAI(apiKey);

    // Dynamic System Prompt based on user profile
    const systemInstruction = `你现在是一位资深的职业发展导师与简历优化专家。你的任务是帮助用户深入挖掘他们每天的工作细节，并使用 STAR 原则（Situation 情境、Task 任务、Action 行动、Result 结果）提炼出高质量的简历话术。

用户的当前画像：
- 当前行业：${userProfile?.industry || "通用行业"}
- 当前岗位/角色：${userProfile?.currentRole || "职场新人"}
- 目标投递岗位：${userProfile?.targetRole || "待定"}

你的工作逻辑是：
1. 引导用户通过 2-3 轮对话，深入挖掘他们今天工作/项目中遇到的挑战、协同的团队、采取的具体行动（使用了什么工具/方法/工艺/算法等）以及取得的量化成果或业务影响。
2. 提炼的简历话术需要根据用户的“目标岗位”进行润色，体现出目标岗位所要求的专业技能和强动词（例如：主导、协同、排查、重构、提升等）。
3. 你的每次回复必须包含两个清晰的部分：
   - 第一部分：与用户的聊天回复。用亲切、专业、鼓励的导师口吻，指出他今天工作的价值，并抛出 1-2 个具体且专业的追问，引导他补充细节。
   - 第二部分：在回复的末尾，必须用 [STAR_RESUME] 和 [/STAR_RESUME] 标签包裹你根据当前对话提炼出的“STAR原则简历话术”（以第一人称，使用强动词，并尽可能量化成果）。随着对话的深入和细节的补充，你应该实时更新和完善这个标签里的内容，使其更加丰满和量化。

示例格式如下：
你今天主动去车间跟进冰箱侧板冲压工艺非常棒，能注意到定位偏差是优秀产品经理的特质。你提到协同了车间工艺员，那你们具体是怎么调整定位销的？调整后冲压的良率有提升吗？
[STAR_RESUME]
参与冰箱供应链轮岗，跟进冷藏室门板冲压工序。针对试制中板材良率偏低问题，主动排查定位销磨损瓶颈，协同车间技术员提出改用耐磨合金定位销的改进方案，使板材成型良率由 92% 提升至 98%，有效保障了新产品试制节点。
[/STAR_RESUME]`;

    // We will use gemini-2.5-flash as the highly performant and stable model.
    // Standard practice for system instructions is to pass them inside getGenerativeModel config.
    const model = genAI.getGenerativeModel({ 
      model: "gemini-2.5-flash",
      systemInstruction: systemInstruction
    });

    // Format history for Gemini SDK
    // Gemini expects structure: { role: 'user' | 'model', parts: [{ text: '...' }] }
    const formattedHistory = [];
    
    // Ensure history starts with a 'user' message, as Gemini SDK throws an error if it starts with 'model'
    const firstUserIndex = (history || []).findIndex(h => h.role === "user");
    const cleanHistory = firstUserIndex !== -1 ? history.slice(firstUserIndex) : [];

    if (cleanHistory.length > 0) {
      cleanHistory.forEach((h) => {
        formattedHistory.push({
          role: h.role === "user" ? "user" : "model",
          parts: [{ text: h.content }],
        });
      });
    }

    // We start a chat session with history (systemInstruction is already configured on the model level)
    const chat = model.startChat({
      history: formattedHistory,
    });

    const result = await chat.sendMessageStream(message);

    // Stream the response to client
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of result.stream) {
            const text = chunk.text();
            controller.enqueue(encoder.encode(text));
          }
          controller.close();
        } catch (err) {
          controller.error(err);
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Transfer-Encoding": "chunked",
      },
    });

  } catch (error) {
    console.error("Error in chat API:", error);
    return new Response(
      JSON.stringify({ error: error.message || "An error occurred during API processing." }), 
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}
