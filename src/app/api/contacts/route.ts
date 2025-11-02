import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const contactSchema = z.object({
  name: z.string(),
  phone: z.string().regex(/^\+?[1-9]\d{1,14}$/),
  channel: z.enum(["sms", "whatsapp"]).default("sms"),
});

export async function GET() {
  try {
    const contacts = await prisma.contact.findMany({
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(contacts);
  } catch (error) {
    console.error("Error fetching contacts:", error);
    return NextResponse.json(
      { error: "Failed to fetch contacts" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, phone, channel } = contactSchema.parse(body);

    // Check if a contact with this phone number already exists
    const existingContact = await prisma.contact.findUnique({
      where: { phone },
    });

    if (existingContact) {
      return NextResponse.json(
        { error: 'A contact with this phone number already exists' },
        { status: 400 }
      );
    }

    const contact = await prisma.contact.create({
      data: { name, phone, channel },
    });

    return NextResponse.json(contact, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid data", details: error.issues },
        { status: 400 }
      );
    }
    console.error("Error creating contact:", error);
    return NextResponse.json(
      { error: "Failed to create contact" },
      { status: 500 }
    );
  }
}