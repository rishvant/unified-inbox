import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
    try {
        const members = await prisma.teamMember.findMany({
            select: {
                id: true,
                name: true,
                email: true,
            },
            orderBy: { name: "asc" },
        });

        return NextResponse.json(members);
    } catch (error) {
        console.error("Error fetching team members:", error);
        return NextResponse.json(
            { error: "Failed to fetch team members" },
            { status: 500 }
        );
    }
}