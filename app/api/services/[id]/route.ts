import { NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongodb';
import Service from '@/lib/models/Service';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    await connectDB();

    const service = await Service.findOne({ id }).lean();

    if (!service) {
      return NextResponse.json(
        { error: 'Service not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(service);
  } catch (error) {
    console.error('Error reading service:', error);
    return NextResponse.json(
      { error: 'Failed to load service data' },
      { status: 500 }
    );
  }
}
