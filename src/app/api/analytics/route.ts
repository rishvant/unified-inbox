import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type ResponseTimeResult = Array<{
  avg_response_time_seconds: number | null;
}>;

export async function GET() {
  try {
    // Total message counts
    const totalMessages = await prisma.message.count();
    const inboundCount = await prisma.message.count({
      where: { direction: "INBOUND" },
    });
    const outboundCount = await prisma.message.count({
      where: { direction: "OUTBOUND" },
    });

    // Contact counts
    const contactsCount = await prisma.contact.count();

    // Channel breakdown
    const messagesByChannel = await prisma.message.groupBy({
      by: ["channel"],
      _count: { id: true },
    });

    // Messages by day (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const messagesByDay = await prisma.$queryRaw`
      SELECT 
        DATE("createdAt") as date,
        COUNT(*) as count,
        channel
      FROM messages
      WHERE "createdAt" >= ${sevenDaysAgo}
      GROUP BY DATE("createdAt"), channel
      ORDER BY date ASC
    `;

    // Response time calculation (time between inbound and next outbound)
    const responseTimesRaw = await prisma.$queryRaw<ResponseTimeResult>`
      SELECT 
        AVG(
          EXTRACT(EPOCH FROM (
            SELECT MIN(m2."createdAt")
            FROM messages m2
            WHERE m2."threadId" = m1."threadId"
            AND m2.direction = 'OUTBOUND'
            AND m2."createdAt" > m1."createdAt"
          ) - m1."createdAt")
        ) as avg_response_time_seconds
      FROM messages m1
      WHERE m1.direction = 'INBOUND'
    `;

    // Convert all numeric values to regular numbers to handle BigInt serialization
    const responseData = {
      totalMessages: Number(totalMessages),
      inboundCount: Number(inboundCount),
      outboundCount: Number(outboundCount),
      contactsCount: Number(contactsCount),
      avgResponseTime: responseTimesRaw[0]?.avg_response_time_seconds 
        ? Number(responseTimesRaw[0].avg_response_time_seconds)
        : 0,
      messagesByDay: Array.isArray(messagesByDay) 
        ? messagesByDay.map(item => ({
            ...item,
            count: Number(item.count)
          }))
        : [],
      messagesByChannel: messagesByChannel.map(item => ({
        channel: item.channel,
        count: Number(item._count.id),
      })),
    };

    return NextResponse.json({
      ...responseData,
      avgResponseTimeMinutes: Math.round(responseData.avgResponseTime / 60),
    });
  } catch (error) {
    console.error("Analytics error:", error);
    return NextResponse.json(
      { error: "Failed to fetch analytics" },
      { status: 500 }
    );
  }
}