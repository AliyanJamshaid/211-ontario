import { NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongodb';
import Service from '@/lib/models/Service';

export async function GET(request: Request) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || '';
    const location = searchParams.get('location') || '';

    // Build query
    const query: Record<string, unknown> = {};

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { subtitle: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }

    if (location && location !== 'all') {
      query.locations = location;
    }

    // Get total count for pagination
    const totalServices = await Service.countDocuments(query);

    // Get paginated services
    const services = await Service.find(query)
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    // Get stats
    const totalUniqueServices = await Service.countDocuments();
    const servicesInBothLocations = await Service.countDocuments({
      locations: { $all: ['Halton', 'Mississauga'] },
    });
    const servicesOnlyInHalton = await Service.countDocuments({
      locations: 'Halton',
      $nor: [{ locations: 'Mississauga' }],
    });
    const servicesOnlyInMississauga = await Service.countDocuments({
      locations: 'Mississauga',
      $nor: [{ locations: 'Halton' }],
    });

    return NextResponse.json({
      services,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalServices / limit),
        totalServices,
        limit,
      },
      stats: {
        totalUniqueServices,
        servicesInBothLocations,
        servicesOnlyInHalton,
        servicesOnlyInMississauga,
      },
      locations: ['Halton', 'Mississauga'],
    });
  } catch (error) {
    console.error('Error fetching services from MongoDB:', error);
    return NextResponse.json(
      { error: 'Failed to load services data' },
      { status: 500 }
    );
  }
}
