import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
    _req: Request,
    { params }: { params: { id: string } }
) {
    const startTime = Date.now();
    const contactId = params.id; // No need to await, params is already resolved

    try {
        console.log(`[Profile] Fetching profile for contact ID: ${contactId}`);

        // Get contact with all related data
        const [contact, messages] = await Promise.all([
            prisma.contact.findUnique({
                where: { id: contactId },
                include: {
                    notes: {
                        orderBy: { createdAt: "desc" },
                    },
                    threads: {
                        orderBy: { lastMessageAt: "desc" },
                    },
                },
            }),
            prisma.message.findMany({
                where: {
                    thread: { contactId: contactId },
                },
                include: {
                    thread: true,
                },
                orderBy: { createdAt: "desc" },
            })
        ]);

        console.log(`[Profile] Found contact:`, contact?.name);
        console.log(`[Profile] Found ${messages.length} messages for contact ${contactId}`);

        if (!contact) {
            console.error(`[Profile] Contact not found with ID: ${contactId}`);
            return NextResponse.json(
                { error: "Contact not found" },
                { status: 404 }
            );
        }

        // Calculate stats
        const channels = new Set(messages.map(msg => msg.channel));
        const lastMessage = messages[0]; // First in array (most recent)
        const firstMessage = messages[messages.length - 1]; // Last in array (oldest)

        // Calculate average response time (for analytics)
        let avgResponseTime = 0;
        let responseCount = 0;

        for (let i = 0; i < messages.length - 1; i++) {
            if (messages[i].direction === 'OUTBOUND' &&
                messages[i + 1].direction === 'INBOUND') {
                const diff = Math.abs(
                    new Date(messages[i].createdAt).getTime() -
                    new Date(messages[i + 1].createdAt).getTime()
                );
                avgResponseTime += diff;
                responseCount++;
            }
        }

        const stats = {
            totalMessages: messages.length,
            lastMessageAt: lastMessage?.createdAt,
            firstMessageAt: firstMessage?.createdAt,
            threadCount: new Set(messages.map(msg => msg.threadId)).size,
            channels: Array.from(channels),
            inboundCount: messages.filter(m => m.direction === 'INBOUND').length,
            outboundCount: messages.filter(m => m.direction === 'OUTBOUND').length,
            avgResponseTimeMinutes: responseCount > 0
                ? Math.round((avgResponseTime / responseCount) / 60000)
                : 0,
        };

        const responseTime = Date.now() - startTime;
        console.log(`[Profile] Completed in ${responseTime}ms`);

        return NextResponse.json({
            ...contact,
            messages,
            stats,
            _meta: {
                fetchedAt: new Date().toISOString(),
                responseTimeMs: responseTime,
            }
        });
    } catch (error) {
        console.error("[Profile] Error fetching contact profile:", error);
        return NextResponse.json(
            {
                error: "Failed to fetch profile",
                details: error instanceof Error ? error.message : 'Unknown error'
            },
            { status: 500 }
        );
    }
}