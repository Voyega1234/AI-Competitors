import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient, AnalysisRun } from '../../../generated/prisma'; // Adjust path if needed

const prisma = new PrismaClient();

// Define the expected shape after the select statement
type AnalysisRunProductFocus = Pick<AnalysisRun, 'productFocus'>;

export async function GET(request: NextRequest) {
  // Extract clientName from query parameters
  const searchParams = request.nextUrl.searchParams;
  const clientName = searchParams.get('clientName');

  console.log(`Attempting to handle GET /api/products for client: ${clientName}`);

  if (!clientName) {
    return new NextResponse(
      JSON.stringify({ error: 'clientName query parameter is required' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  try {
    const analysisRuns: AnalysisRunProductFocus[] = await prisma.analysisRun.findMany({
      where: {
        clientName: clientName, // Filter by the provided client name
      },
      distinct: ['productFocus'], // Get unique product focuses for this client
      select: {
        productFocus: true,
      },
      orderBy: {
        productFocus: 'asc', // Optional: Order products alphabetically
      },
    });

    // Extract just the product focus strings
    const productFocuses = analysisRuns.map((run: AnalysisRunProductFocus) => run.productFocus);
    console.log(`Found products for ${clientName}:`, productFocuses);

    // Filter out any null or empty values, though distinct should handle nulls
    const validProductFocuses = productFocuses.filter((focus: string | null) => focus != null);

    return NextResponse.json({ products: validProductFocuses });

  } catch (error) {
    console.error(`Error in GET /api/products for ${clientName}:`, error);
    return new NextResponse(
      JSON.stringify({ error: `Failed to fetch products for ${clientName}` }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  } finally {
    // Optional: Disconnect Prisma
    // await prisma.$disconnect();
  }
} 