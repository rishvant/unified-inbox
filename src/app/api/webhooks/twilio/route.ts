import { NextRequest, NextResponse } from "next/server";
import twilio from "twilio";
import { prisma } from "@/lib/prisma";

const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN!;

// Helper to clean phone numbers
const cleanPhoneNumber = (phone: string): string => {
  // Remove 'whatsapp:' prefix if present
  return phone.replace(/^whatsapp:/i, '');
};

export async function POST(req: NextRequest) {
  try {
    const signature = req.headers.get("x-twilio-signature") || "";
    const params = Object.fromEntries(await req.formData());

    // if (!twilio.validateRequest(TWILIO_AUTH_TOKEN, signature, req.url, params)) {
    //   console.warn("Invalid Twilio signature");
    //   return NextResponse.json({ error: "Invalid signature" }, { status: 403 });
    // }

    const { 
      From: rawFrom, 
      To: rawTo,
      Body, 
      MessageSid,
      SmsMessageSid,
      SmsSid,
      MessageStatus
    } = params as Record<string, string>;

    console.log('Received webhook:', { 
      from: rawFrom, 
      to: rawTo, 
      body: Body,
      messageSid: MessageSid || SmsMessageSid || SmsSid,
      messageStatus: MessageStatus
    });

    // Determine channel and clean phone numbers
    const isWhatsApp = rawFrom.startsWith('whatsapp:') || rawTo?.startsWith('whatsapp:');
    const channel = isWhatsApp ? 'whatsapp' : 'sms';
    const from = cleanPhoneNumber(rawFrom);
    const to = rawTo ? cleanPhoneNumber(rawTo) : '';

    console.log('Processed webhook:', { from, to, channel, body: Body });

    // Find or create contact
    const contact = await prisma.contact.upsert({
      where: { phone: from },
      update: {},
      create: {
        name: from, // Use phone as name initially
        phone: from,
        channel: channel as 'sms' | 'whatsapp'
      },
    });

    console.log('Contact:', contact);

    // Find or create thread for this contact and channel
    let thread = await prisma.thread.findFirst({
      where: { 
        contactId: contact.id,
        channel: channel as 'sms' | 'whatsapp'
      },
    });

    if (!thread) {
      console.log('Creating new thread for contact:', contact.id, 'channel:', channel);
      thread = await prisma.thread.create({
        data: {
          contactId: contact.id,
          channel: channel as 'sms' | 'whatsapp',
          isUnread: true,
          lastMessageAt: new Date(),
        },
      });
      console.log('Created thread:', thread);
    }

    // Save the message
    console.log('Saving message to thread:', thread.id);
    const message = await prisma.message.create({
      data: {
        threadId: thread.id,
        body: Body,
        direction: "INBOUND",
        twilioSid: MessageSid || SmsMessageSid || SmsSid || '',
        channel: channel as 'sms' | 'whatsapp'
      },
    });
    console.log('Saved message:', message);

    // Update thread's last message timestamp
    await prisma.thread.update({
      where: { id: thread.id },
      data: {
        isUnread: true,
        lastMessageAt: new Date(),
      },
    });

    console.log('Thread updated with new message timestamp');

    // Return empty TwiML response
    const twiml = new twilio.twiml.MessagingResponse();
    return new NextResponse(twiml.toString(), {
      headers: { "Content-Type": "text/xml" },
    });
  } catch (error) {
    console.error("Webhook error:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}