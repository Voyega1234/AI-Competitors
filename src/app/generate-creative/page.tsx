'use client'

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Loader2, ArrowLeft } from 'lucide-react';

// Define the expected structure of the passed data
interface SelectedRecommendationData {
    title: string;
    concept: string;
    description: string;
    // Add other fields if they were passed
}

export default function GenerateCreativePage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [selectedData, setSelectedData] = useState<SelectedRecommendationData[]>([]);
    const [parsingError, setParsingError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(true); // Start loading until data is parsed
    const [creativeInstructions, setCreativeInstructions] = useState<string>('');
    // Add state for creative results, loading, errors later

    useEffect(() => {
        const selectedParam = searchParams.get('selected');
        if (selectedParam) {
            try {
                const decodedData = decodeURIComponent(selectedParam);
                const parsedData = JSON.parse(decodedData) as SelectedRecommendationData[];
                setSelectedData(parsedData);
                setParsingError(null);
            } catch (error) {
                console.error("Error parsing selected data:", error);
                setParsingError("Failed to load selected recommendation data from URL.");
                setSelectedData([]);
            }
        } else {
            setParsingError("No selected recommendation data found in URL.");
            setSelectedData([]);
        }
        setIsLoading(false);
    }, [searchParams]);

    const handleGenerateCreative = () => {
        // TODO: Implement logic to call a new API endpoint
        // Pass selectedData and creativeInstructions
        console.log("Generate creative content based on:", selectedData);
        console.log("Additional Instructions:", creativeInstructions);
        alert("Creative generation logic not yet implemented.");
    };

    return (
        <div className="container mx-auto p-4 md:p-6 lg:p-8">
            <Button 
                variant="outline" 
                size="sm" 
                className="mb-4" 
                onClick={() => router.back()}
            >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Recommendations
            </Button>

            <h1 className="text-3xl font-bold mb-4">Generate Creative Content</h1>
            <p className="text-muted-foreground mb-6">
                Generate specific ad copy, visuals, or other creative assets based on the selected recommendation ideas.
            </p>

            {isLoading && (
                <div className="flex justify-center items-center p-8">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
            )}

            {parsingError && !isLoading && (
                <Alert variant="destructive">
                    <AlertTitle>Error Loading Data</AlertTitle>
                    <AlertDescription>{parsingError}</AlertDescription>
                </Alert>
            )}

            {!isLoading && !parsingError && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Column 1: Selected Ideas */}
                    <div className="lg:col-span-1 space-y-4">
                        <h2 className="text-xl font-semibold">Selected Ideas ({selectedData.length})</h2>
                        {selectedData.length > 0 ? (
                            <Card className="max-h-[60vh] overflow-y-auto">
                                <CardContent className="p-4 space-y-3">
                                    {selectedData.map((item, index) => (
                                        <div key={index} className="p-3 border rounded bg-muted/40">
                                            <p className="font-medium text-sm mb-1">{item.title}</p>
                                            <p className="text-xs text-muted-foreground line-clamp-2">{item.description}</p>
                                        </div>
                                    ))}
                                </CardContent>
                            </Card>
                        ) : (
                            <p className="text-sm text-muted-foreground italic">No ideas were selected or passed correctly.</p>
                        )}
                    </div>

                    {/* Column 2: Creative Generation Form */}
                    <div className="lg:col-span-2 space-y-6">
                        <Card>
                            <CardHeader>
                                <CardTitle>Creative Generation Options</CardTitle>
                                <CardDescription>Specify instructions and choose output formats.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid gap-1.5">
                                    <Label htmlFor="creative-instructions">Additional Instructions</Label>
                                    <Textarea
                                        id="creative-instructions"
                                        placeholder="e.g., Focus on a specific angle, generate 3 ad copy variations, suggest image styles..."
                                        value={creativeInstructions}
                                        onChange={(e) => setCreativeInstructions(e.target.value)}
                                        className="min-h-[100px]"
                                    />
                                </div>
                                {/* Placeholder for format selection (e.g., Ad Copy, Image Prompt, Script) */}
                                <div className="text-sm text-muted-foreground italic">
                                    [Placeholder for selecting creative output formats/types]
                                </div>
                                <Button onClick={handleGenerateCreative} disabled={selectedData.length === 0}>
                                    Generate Creative Assets
                                </Button>
                            </CardContent>
                        </Card>

                        {/* Placeholder for Creative Results */}
                        <Card className="min-h-[200px]">
                            <CardHeader>
                                <CardTitle>Generated Creatives</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground italic">[Generated creative content will appear here...]</p>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            )}
        </div>
    );
} 