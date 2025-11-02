import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const contactId = searchParams.get('contactId');
    const channel = searchParams.get('channel') || 'sms';

    if (!contactId) {
      return NextResponse.json(
        { error: 'Contact ID is required' },
        { status: 400 }
      );
    }

    if (channel !== 'sms' && channel !== 'whatsapp') {
      return NextResponse.json(
        { error: 'Invalid channel. Must be either "sms" or "whatsapp"' },
        { status: 400 }
      );
    }

    console.log('Fetching thread for:', { contactId, channel });

    // Find or create a thread for the contact and channel
    let thread = await prisma.thread.findFirst({
      where: { 
        contactId,
        channel: channel as 'sms' | 'whatsapp'
      },
    });

    if (!thread) {
      console.log('Thread not found, creating new one...');
      try {
        thread = await prisma.thread.create({
          data: {
            contactId,
            channel: channel as 'sms' | 'whatsapp',
          },
        });
        console.log('Created new thread:', thread);
      } catch (error) {
        console.error('Error creating thread:', error);
        // Thread might have been created by another request, try to fetch it again
        thread = await prisma.thread.findFirst({
          where: { 
            contactId,
            channel: channel as 'sms' | 'whatsapp'
          },
        });
        
        if (!thread) {
          throw new Error('Failed to create or find thread');
        }
      }
    }

    console.log('Returning thread:', thread);
    return NextResponse.json(thread);
  } catch (error) {
    console.error('Error in threads API:', error);
    return NextResponse.json(
      { error: 'Failed to fetch thread', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
