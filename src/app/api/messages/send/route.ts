import { NextRequest, NextResponse } from "next/server";
import twilio from "twilio";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const client = twilio(
    process.env.TWILIO_ACCOUNT_SID!,
    process.env.TWILIO_AUTH_TOKEN!
);

const sendSchema = z.object({
    contactId: z.string(),
    body: z.string().min(1),
    channel: z.enum(["sms", "whatsapp"]).optional(),
});

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { contactId, body: messageBody, channel: overrideChannel } = sendSchema.parse(body);

        const contact = await prisma.contact.findUnique({
            where: { id: contactId },
        });

        if (!contact) {
            return NextResponse.json({ error: "Contact not found" }, { status: 404 });
        }

        const channel = overrideChannel || contact.channel || "sms";

        let thread = await prisma.thread.findFirst({
            where: { contactId },
        });

        if (!thread) {
            thread = await prisma.thread.create({
                data: {
                    contactId,
                    id: `${contactId}_${channel}`,
                },
            });
        }

        let twilioMsg;

        if (channel === "whatsapp") {
            twilioMsg = await client.messages.create({
                from: "whatsapp:" + process.env.WHATSAPP_TWILIO_PHONE_NUMBER!,
                to: "whatsapp:" + contact.phone,
                body: messageBody,
            });
        } else {
            twilioMsg = await client.messages.create({
                from: process.env.TWILIO_PHONE_NUMBER!,
                to: contact.phone,
                body: messageBody,
            });
        }

        const message = await prisma.message.create({
            data: {
                threadId: thread.id,
                body: messageBody,
                direction: "OUTBOUND",
                twilioSid: twilioMsg.sid,
            },
        });

        return NextResponse.json({ success: true, message });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json(
                { error: "Validation failed", details: error.issues },
                { status: 400 }
            );
        }
        console.error("Send error:", error);
        return NextResponse.json({ error: "Failed to send" }, { status: 500 });
    }
}
