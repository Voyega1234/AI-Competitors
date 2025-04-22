import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

// Define the path to the book summaries directory relative to the project root
// IMPORTANT: Adjust this path if your directory structure is different
const booksDirectory = path.join(process.cwd(), 'src', 'app', 'api', 'generate-recommendations', 'books_prompts');

export async function GET() {
    console.log(`Attempting to list book summaries from: ${booksDirectory}`);
    try {
        // Read directory contents
        const dirents = await fs.readdir(booksDirectory, { withFileTypes: true });

        // Filter for files (e.g., .txt or .md) and map to filenames
        const bookFiles = dirents
            .filter(dirent => dirent.isFile() && (dirent.name.endsWith('.txt') || dirent.name.endsWith('.md')))
            .map(dirent => dirent.name);

        console.log(`Found book files: ${bookFiles.join(', ')}`);
        return NextResponse.json({ books: bookFiles });

    } catch (error: any) {
        // Handle potential errors like directory not found (ENOENT)
        if (error.code === 'ENOENT') {
            console.error(`Book summaries directory not found: ${booksDirectory}`);
            return new NextResponse(
                JSON.stringify({ error: 'Book summaries directory not found on server.' }),
                { status: 404, headers: { 'Content-Type': 'application/json' } }
            );
        } 
        // Handle other errors (e.g., permission errors)
        console.error("Error reading book summaries directory:", error);
        return new NextResponse(
            JSON.stringify({ error: 'Failed to list book summaries.' }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
    }
} 