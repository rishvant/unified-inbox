import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const noteSchema = z.object({
    contactId: z.string(),
    content: z.string().min(1, "Note content required"),
    isPrivate: z.boolean().optional().default(false),
});

// GET: Fetch all notes for a contact
export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const contactId = searchParams.get("contactId");

        if (!contactId) {
            return NextResponse.json(
                { error: "contactId required" },
                { status: 400 }
            );
        }

        const notes = await prisma.note.findMany({
            where: { contactId },
            orderBy: { createdAt: "desc" },
        });

        return NextResponse.json(notes);
    } catch (error) {
        console.error("Error fetching notes:", error);
        return NextResponse.json(
            { error: "Failed to fetch notes" },
            { status: 500 }
        );
    }
}

// POST: Create a new note
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { contactId, content, isPrivate } = noteSchema.parse(body);

        const contact = await prisma.contact.findUnique({
            where: { id: contactId },
        });

        if (!contact) {
            return NextResponse.json(
                { error: "Contact not found" },
                { status: 404 }
            );
        }

        const note = await prisma.note.create({
            data: {
                contactId,
                content,
                isPrivate: isPrivate ?? false,
            },
        });

        return NextResponse.json(note, { status: 201 });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json(
                { error: "Invalid data", details: error.errors },
                { status: 400 }
            );
        }
        console.error("Error creating note:", error);
        return NextResponse.json(
            { error: "Failed to create note" },
            { status: 500 }
        );
    }
}
