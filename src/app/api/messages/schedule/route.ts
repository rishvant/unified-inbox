import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const scheduleSchema = z.object({
    contactId: z.string(),
    body: z.string().min(1),
    channel: z.enum(["sms", "whatsapp"]),
    scheduledFor: z.string().datetime(),
});

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { contactId, body: messageBody, channel, scheduledFor } =
            scheduleSchema.parse(body);

        // Get or create thread
        let thread = await prisma.thread.findFirst({
            where: { contactId, channel },
        });

        if (!thread) {
            thread = await prisma.thread.create({
                data: { contactId, channel },
            });
        }

        // Create scheduled message
        const message = await prisma.message.create({
            data: {
                threadId: thread.id,
                body: messageBody,
                direction: "OUTBOUND",
                channel,
                scheduledFor: new Date(scheduledFor),
                status: "scheduled",
            },
        });

        return NextResponse.json(message, { status: 201 });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json(
                { error: "Invalid data", details: error.errors },
                { status: 400 }
            );
        }
        console.error("Error scheduling message:", error);
        return NextResponse.json(
            { error: "Failed to schedule message" },
            { status: 500 }
        );
    }
}

// Get scheduled messages
export async function GET() {
    try {
        const scheduled = await prisma.message.findMany({
            where: {
                status: "scheduled",
                scheduledFor: { lte: new Date() },
            },
            include: { thread: { include: { contact: true } } },
        });

        return NextResponse.json(scheduled);
    } catch (error) {
        console.error("Error fetching scheduled messages:", error);
        return NextResponse.json(
            { error: "Failed to fetch scheduled messages" },
            { status: 500 }
        );
    }
}
