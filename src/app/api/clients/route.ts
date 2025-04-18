import { NextResponse } from 'next/server';
// IMPORTANT: Adjust this import if your Prisma Client is located elsewhere!
// Corrected import path based on schema.prisma output
import { PrismaClient, AnalysisRun } from '../../../generated/prisma'; // Assuming this path is correct

const prisma = new PrismaClient();

// Define the expected shape after the select statement
type AnalysisRunClientName = Pick<AnalysisRun, 'clientName'>;

export async function GET() {
  console.log("Attempting to handle GET /api/clients"); // Add log
  try {
    // Explicitly type the result of findMany based on the select
    const analysisRuns: AnalysisRunClientName[] = await prisma.analysisRun.findMany({
      distinct: ['clientName'],
      select: {
        clientName: true,
      },
      orderBy: {
        clientName: 'asc',
      },
    });

    // Add type to the 'run' parameter
    const clientNames = analysisRuns.map((run: AnalysisRunClientName) => run.clientName);
    console.log("Found client names:", clientNames); // Add log

    // Ensure null/empty names are handled if necessary, though distinct should prevent null unless explicitly in DB
    // Add type to the 'name' parameter
    const validClientNames = clientNames.filter((name: string | null) => name != null && name.trim() !== '');

    return NextResponse.json({ clients: validClientNames });

  } catch (error) {
    console.error("Error in GET /api/clients:", error); // Log the actual error
    return new NextResponse(
      JSON.stringify({ error: 'Failed to fetch client names' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  } finally {
     // Optional: If you initialize prisma here, consider disconnecting
     // await prisma.$disconnect();
  }
} 