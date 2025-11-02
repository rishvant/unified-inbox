import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const threadId = searchParams.get("threadId");
    
    console.log('Fetching messages for thread:', threadId);

    if (!threadId) {
      console.error('No threadId provided');
      return NextResponse.json(
        { error: "threadId required" },
        { status: 400 }
      );
    }

    const messages = await prisma.message.findMany({
      where: { threadId },
      orderBy: { createdAt: "asc" },
    });

    console.log(`Found ${messages.length} messages for thread ${threadId}`);
    if (messages.length > 0) {
      console.log('Sample message:', {
        id: messages[0].id,
        threadId: messages[0].threadId,
        body: messages[0].body,
        direction: messages[0].direction,
        channel: (messages[0] as any).channel // Temporary type assertion
      });
    }

    return NextResponse.json(messages);
  } catch (error) {
    console.error("Error fetching messages:", error);
    return NextResponse.json(
      { error: "Failed to fetch messages" },
      { status: 500 }
    );
  }
}
