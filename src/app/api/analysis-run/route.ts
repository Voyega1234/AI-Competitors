import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient, Prisma } from '../../../generated/prisma'; // Adjust path if needed

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const clientName = searchParams.get('clientName');
  // productFocus might be null or missing if not provided in the query
  const productFocus = searchParams.get('productFocus');

  console.log(`Attempting to handle GET /api/analysis-run for client: ${clientName}, product: ${productFocus}`);

  if (!clientName) {
    return new NextResponse(
      JSON.stringify({ error: 'clientName query parameter is required' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // Note: We allow productFocus to be null here, as the frontend might send null
  // if the user selected the 'N/A' or equivalent option.

  try {
    // Use findFirst because (clientName, productFocus) is not necessarily unique

    // Define the type for the where clause explicitly
    let whereCondition: Prisma.AnalysisRunWhereInput;

    if (productFocus === null) {
      // If frontend sent null (meaning N/A was selected),
      // search for rows where productFocus is NULL OR an empty string
      whereCondition = {
          clientName: clientName,
          OR: [
              { productFocus: null },
              { productFocus: '' }
          ]
      };
    } else {
      // If frontend sent a specific product focus, search for that exact string
      whereCondition = {
          clientName: clientName,
          productFocus: productFocus
      };
    }

    const analysisRun = await prisma.analysisRun.findFirst({
      where: whereCondition,
      select: {
        id: true, // Select only the ID
      },
    });

    if (!analysisRun) {
      console.log(`No analysis run found for client: ${clientName}, product: ${productFocus}`);
      return new NextResponse(
        JSON.stringify({ error: 'Analysis run not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found analysis run ID: ${analysisRun.id}`);
    return NextResponse.json({ id: analysisRun.id });

  } catch (error) {
    console.error(`Error in GET /api/analysis-run for ${clientName}, ${productFocus}:`, error);
    return new NextResponse(
      JSON.stringify({ error: 'Failed to fetch analysis run ID' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  } finally {
    // Optional: Disconnect Prisma
    // await prisma.$disconnect();
  }
} 