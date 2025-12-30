import { GoogleGenerativeAI } from "@google/generative-ai";

export interface Env {
  GEMINI_API_KEY: string;
  APP_PASSWORD: string;
  DAILY_LOG_DB: KVNamespace;
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, X-App-Password",
    };

    if (request.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

    const clientPassword = request.headers.get("X-App-Password");
    if (!clientPassword || clientPassword !== env.APP_PASSWORD) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }

    const url = new URL(request.url);
    const path = url.pathname;

    try {
      if (request.method === "GET" && path.includes("/data")) {
        const data = await env.DAILY_LOG_DB.get("user_all_data");
        return new Response(data || JSON.stringify({ routines: [], logs: [] }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (request.method === "POST" && path.includes("/data")) {
        const body = await request.text();
        await env.DAILY_LOG_DB.put("user_all_data", body);
        return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
      }

      if (request.method === "POST" && path.includes("/gemini")) {
        const { prompt } = await request.json() as { prompt: string };
        const genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
        const result = await model.generateContent(prompt);
        return new Response(JSON.stringify({ text: result.response.text() }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response("Not Found", { status: 404, headers: corsHeaders });
    } catch (error: any) {
      return new Response(JSON.stringify({ error: error.message }), { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      });
    }
  },
};