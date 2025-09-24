import { NextResponse } from "next/server";

export async function GET(request: Request) {
  console.log('🔍 [API] /realtime-session called - STACK TRACE:');
  console.trace();
  console.log('🔍 [API] Request details:', {
    url: request.url,
    headers: Object.fromEntries(request.headers.entries()),
    timestamp: Date.now()
  });

  try {
    const sessionConfig = {
      session: {
        type: "realtime",
        model: "gpt-4o-realtime-preview-2025-06-03",
        audio: {
          output: {
            voice: "alloy",
          },
        },
      },
    };

    const response = await fetch(
      "https://api.openai.com/v1/realtime/client_secrets",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(sessionConfig),
      }
    );

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    console.log('✅ [API] Created ephemeral token:', data.value ? 'YES' : 'NO');
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error in /realtime-session:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
