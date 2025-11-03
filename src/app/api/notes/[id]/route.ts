import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// DELETE: Delete a note
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = await params; // Await the params
  try {
    const note = await prisma.note.delete({
      where: { id },
    });

    return NextResponse.json(note);
  } catch (error) {
    console.error("Error deleting note:", error);
    return NextResponse.json(
      { error: "Failed to delete note" },
      { status: 500 }
    );
  }
}

// PATCH: Update note
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = await params; // Await the params
  try {
    const body = await req.json();
    const { content, isPrivate } = body;

    const note = await prisma.note.update({
      where: { id },
      data: {
        ...(content && { content }),
        ...(isPrivate !== undefined && { isPrivate }),
      },
    });

    return NextResponse.json(note);
  } catch (error) {
    console.error("Error updating note:", error);
    return NextResponse.json(
      { error: "Failed to update note" },
      { status: 500 }
    );
  }
}