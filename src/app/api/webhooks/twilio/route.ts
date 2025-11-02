import { NextRequest, NextResponse } from "next/server";
import twilio from "twilio";
import { prisma } from "@/lib/prisma";

const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN!;

export async function POST(req: NextRequest) {
  try {
    const signature = req.headers.get("x-twilio-signature") || "";
    const params = Object.fromEntries(await req.formData());

    // if (!twilio.validateRequest(TWILIO_AUTH_TOKEN, signature, req.url, params)) {
    //   console.warn("Invalid Twilio signature");
    //   return NextResponse.json({ error: "Invalid signature" }, { status: 403 });
    // }

    const { From, Body, MessageSid } = params as {
      From: string;
      Body: string;
      MessageSid: string;
    };

    const contact = await prisma.contact.upsert({
      where: { phone: From },
      update: {},
      create: {
        name: From,
        phone: From,
      },
    });

    let thread = await prisma.thread.findFirst({
      where: { contactId: contact.id },
    });

    if (!thread) {
      thread = await prisma.thread.create({
        data: {
          id: `${contact.id}_sms`,
          contactId: contact.id,
        },
      });
    }

    await prisma.thread.update({
      where: { id: thread.id },
      data: {
        isUnread: true,
        lastMessageAt: new Date(),
      },
    });

    await prisma.message.create({
      data: {
        threadId: thread.id,
        body: Body,
        direction: "INBOUND",
        twilioSid: MessageSid,
      },
    });

    const twiml = new twilio.twiml.MessagingResponse();

    return new NextResponse(twiml.toString(), {
      headers: { "Content-Type": "text/xml" },
    });
  } catch (error) {
    console.error("Webhook error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}