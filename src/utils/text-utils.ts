/**
 * Utility functions for text processing
 */

/**
 * Cleans Gemini API responses by removing markdown code blocks
 * and other formatting artifacts to get pure JSON
 */
export function cleanGeminiResponse(text: string): string {
    // Log the original input for debugging
    console.log("Original text before cleaning:", text.substring(0, 100) + (text.length > 100 ? '...' : ''));
    
    // Step 1: Handle case where response is wrapped in markdown code blocks
    if (text.includes('```')) {
        // Extract content between code blocks - handles ```json, ```javascript, etc.
        const codeBlockMatch = text.match(/```(?:json|javascript)?\s*([\s\S]*?)\s*```/);
        if (codeBlockMatch && codeBlockMatch[1]) {
            text = codeBlockMatch[1].trim();
            console.log("Extracted from code block:", text.substring(0, 100) + (text.length > 100 ? '...' : ''));
        } else {
            // If regex didn't match but we have ``` markers, do simple removal
            text = text.replace(/```json\s*/g, '');
            text = text.replace(/```javascript\s*/g, '');
            text = text.replace(/```\s*/g, '');
            console.log("Removed code block markers:", text.substring(0, 100) + (text.length > 100 ? '...' : ''));
        }
    }
    
    // Step 2: Remove leading text before the first JSON structure
    // This helps with outputs that have explanatory text before the JSON
    let processedText = text;
    const jsonStartPatterns = [
        /\{\s*"recommendations"\s*:/,  // Look for {"recommendations": pattern
        /\{\s*"/  // Or any JSON object start
    ];
    
    for (const pattern of jsonStartPatterns) {
        const match = processedText.match(pattern);
        if (match && match.index !== undefined) {
            processedText = processedText.substring(match.index);
            console.log("Trimmed to JSON start:", processedText.substring(0, 100) + (processedText.length > 100 ? '...' : ''));
            break;
        }
    }
    
    // Step 3: Find where the JSON structure ends
    // This helps with outputs that have explanatory text after the JSON
    const lastBrace = processedText.lastIndexOf('}');
    if (lastBrace !== -1) {
        processedText = processedText.substring(0, lastBrace + 1);
        console.log("Trimmed to JSON end:", processedText.substring(0, 100) + (processedText.length > 100 ? '...' : ''));
    }
    
    // Step 4: Fix common JSON syntax issues
    processedText = processedText
        .replace(/[\u0000-\u001F]/g, '') // Remove control characters
        .replace(/\\(?!["\\bfnrt\/])/g, '\\\\') // Escape unescaped backslashes
        .replace(/^\s*\/\/.*/gm, '') // Remove JavaScript comments
        .replace(/\/\*[\s\S]*?\*\//g, '') // Remove multi-line comments
        .replace(/,\s*}/g, '}') // Remove trailing commas in objects
        .replace(/,\s*]/g, ']'); // Remove trailing commas in arrays
    
    // Log the final result
    console.log("Final cleaned JSON:", processedText.substring(0, 100) + (processedText.length > 100 ? '...' : ''));
    
    return processedText.trim();
}
