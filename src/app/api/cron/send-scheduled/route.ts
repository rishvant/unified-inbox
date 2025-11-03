import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import twilio from "twilio";

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID!,
  process.env.TWILIO_AUTH_TOKEN!
);

export async function GET() {
  try {
    // Find messages scheduled to send now or in the past
    const scheduledMessages = await prisma.message.findMany({
      where: {
        status: "scheduled",
        scheduledFor: { lte: new Date() },
      },
      include: {
        thread: {
          include: { contact: true },
        },
      },
    });

    const results = [];

    for (const message of scheduledMessages) {
      try {
        const contact = message.thread.contact;

        // Send via Twilio
        let twilioMsg;
        if (message.channel === "whatsapp") {
          twilioMsg = await client.messages.create({
            from: "whatsapp:" + process.env.TWILIO_WHATSAPP_NUMBER!,
            to: "whatsapp:" + contact.phone,
            body: message.body,
          });
        } else {
          twilioMsg = await client.messages.create({
            from: process.env.TWILIO_PHONE_NUMBER!,
            to: contact.phone,
            body: message.body,
          });
        }

        // Update message status
        await prisma.message.update({
          where: { id: message.id },
          data: {
            status: "sent",
            twilioSid: twilioMsg.sid,
          },
        });

        results.push({ id: message.id, status: "sent" });
      } catch (error) {
        console.error(`Failed to send scheduled message ${message.id}:`, error);

        // Mark as failed
        await prisma.message.update({
          where: { id: message.id },
          data: { status: "failed" },
        });

        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        results.push({ id: message.id, status: "failed", error: errorMessage });
      }
    }

    return NextResponse.json({
      processed: results.length,
      results,
    });
  } catch (error) {
    console.error("Error processing scheduled messages:", error);
    return NextResponse.json(
      { error: "Failed to process scheduled messages" },
      { status: 500 }
    );
  }
}