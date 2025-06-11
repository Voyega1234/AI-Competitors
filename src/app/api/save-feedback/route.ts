import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from 'crypto';
import supabase from '@/lib/supabaseClient';

// Using the supabase client imported from lib/supabaseClient.ts

export async function POST(request: NextRequest) {
  try {
    // Parse the request body
    const data = await request.json();
    const { 
      clientName, 
      productFocus,  
      runId, 
      feedback 
    } = data;

    if (!clientName || !runId || !feedback || typeof feedback !== 'object') {
      return NextResponse.json({ 
        error: "Missing required fields: clientName, runId, or feedback" 
      }, { status: 400 });
    }

    console.log(`[save-feedback] Saving feedback for client: ${clientName}, runId: ${runId}`);
    
    // Prepare feedback entries for database insertion
    const feedbackEntries = Object.entries(feedback).map(([ideaId, feedbackItem]: [string, any]) => ({
      id: randomUUID(),
      idea_id: ideaId,
      run_id: runId,
      vote: feedbackItem.vote,
      comment: feedbackItem.comment,
      client_name: clientName,
      product_focus: productFocus || null,
      created_at: new Date().toISOString(),
      // Include the idea details if they exist
      idea_title: feedbackItem.idea?.title || null,
      idea_description: feedbackItem.idea?.description || null,
      concept_ideas: feedbackItem.idea?.conceptIdeas || null
    }));

    // Insert feedback into the database
    const { data: insertedData, error } = await supabase
      .from('idea_feedback')
      .insert(feedbackEntries);

    if (error) {
      console.error('[save-feedback] Error saving feedback to database:', error);
      return NextResponse.json({ 
        error: `Failed to save feedback: ${error.message}` 
      }, { status: 500 });
    }

    console.log(`[save-feedback] Successfully saved ${feedbackEntries.length} feedback entries to database`);
    
    return NextResponse.json({ 
      success: true,
      message: `Successfully saved ${feedbackEntries.length} feedback entries`,
      data: insertedData
    });
    
  } catch (err) {
    console.error('[save-feedback] Error processing feedback:', err);
    return NextResponse.json({ 
      error: `Error processing feedback: ${err instanceof Error ? err.message : String(err)}` 
    }, { status: 500 });
  }
}
