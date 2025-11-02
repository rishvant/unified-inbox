import { NextRequest, NextResponse } from "next/server";
import twilio from "twilio";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

const client = twilio(
    process.env.TWILIO_ACCOUNT_SID!,
    process.env.TWILIO_AUTH_TOKEN!
);

const sendSchema = z.object({
    contactId: z.string(),
    body: z.string().min(1),
    channel: z.enum(["sms", "whatsapp"]).default("sms"),
});

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { contactId, body: messageBody, channel } = sendSchema.parse(body);

        const contact = await prisma.contact.findUnique({
            where: { id: contactId },
        });

        if (!contact) {
            return NextResponse.json({ error: "Contact not found" }, { status: 404 });
        }

        // Find or create thread for this contact and channel
        // Try to find existing thread first using the unique constraint
        let thread = await prisma.thread.findFirst({
            where: {
                contactId: contactId,
                channel: channel as 'sms' | 'whatsapp'
            },
        });

        // If thread doesn't exist, create it
        if (!thread) {
            try {
                thread = await prisma.thread.create({
                    data: {
                        contactId: contactId,
                        channel: channel as 'sms' | 'whatsapp',
                    },
                });
                console.log('Created new thread:', thread);
            } catch (error) {
                console.error('Error creating thread:', error);
                // Thread might have been created by another request, try to fetch it again
                thread = await prisma.thread.findFirst({
                    where: {
                        contactId: contactId,
                        channel: channel as 'sms' | 'whatsapp'
                    },
                });
                
                if (!thread) {
                    throw new Error('Failed to create or find thread');
                }
            }
        }
        
        // Update threadId to the actual ID from the database
        const finalThreadId = thread.id;

        // Clean and format phone numbers
        const cleanPhone = (phone: string) => {
            // Remove any non-digit characters except leading +
            let cleaned = phone.replace(/[^\d+]/g, '');
            // Ensure it starts with a + followed by country code
            if (!cleaned.startsWith('+')) {
                // If no country code, assume +91 (India) for this example
                // In production, you might want to handle this differently
                cleaned = `+91${cleaned}`;
            }
            return cleaned;
        };

        // Format the 'to' number based on channel
        const toNumber = channel === 'whatsapp'
            ? `whatsapp:${cleanPhone(contact.phone)}`
            : cleanPhone(contact.phone);

        // Format the 'from' number based on channel
        const fromNumber = channel === 'whatsapp'
            ? `whatsapp:${process.env.WHATSAPP_TWILIO_PHONE_NUMBER}`
            : process.env.TWILIO_PHONE_NUMBER;

        console.log('Sending message:', {
            from: fromNumber,
            to: toNumber,
            body: messageBody,
            channel
        });

        // Send message via Twilio
        const twilioMsg = await client.messages.create({
            from: fromNumber,
            to: toNumber,
            body: messageBody,
        });

        const message = await prisma.message.create({
            data: {
                threadId: thread.id, // Use the actual thread ID from the database
                body: messageBody,
                direction: "OUTBOUND",
                twilioSid: twilioMsg.sid,
                channel: channel as 'sms' | 'whatsapp' // Ensure channel is saved with the message
            },
        });
        
        // Update the thread's last message timestamp
        await prisma.thread.update({
            where: { id: thread.id },
            data: {
                lastMessageAt: new Date(),
                isUnread: false
            }
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
