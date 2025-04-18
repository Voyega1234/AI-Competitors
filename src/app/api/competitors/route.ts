import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '../../../generated/prisma'; // Adjust path if needed

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const runId = searchParams.get('runId');

  console.log(`Attempting to handle GET /api/competitors for runId: ${runId}`);

  if (!runId) {
    return new NextResponse(
      JSON.stringify({ error: 'runId query parameter is required' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  try {
    // Fetch competitors associated with the given analysisRunId
    const competitors = await prisma.competitor.findMany({
      where: {
        analysisRunId: runId,
      },
      // Optional: Order competitors if needed, e.g., by name
      orderBy: {
        name: 'asc',
      }
    });

    console.log(`Found ${competitors.length} competitors for runId: ${runId}`);

    // The frontend expects the data in a specific format: { competitors: [...] }
    return NextResponse.json({ competitors: competitors });

  } catch (error) {
    console.error(`Error in GET /api/competitors for runId ${runId}:`, error);
    return new NextResponse(
      JSON.stringify({ error: `Failed to fetch competitors for run ${runId}` }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  } finally {
    // Optional: Disconnect Prisma
    // await prisma.$disconnect();
  }
} 