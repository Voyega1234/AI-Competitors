'use client';

import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2, AlertTriangle, MessageSquare } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';

type Feedback = {
  id: string;
  idea_title: string;
  idea_description: string;
  concept_ideas: string;
  comment: string;
  vote: string;
  client_name: string;
  created_at: string;
};

export default function FeedbackManager() {
  const [feedback, setFeedback] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [clientName, setClientName] = useState('');
  const [editingFeedback, setEditingFeedback] = useState<Feedback | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [feedbackToDelete, setFeedbackToDelete] = useState<string | null>(null);
  const [selectedFeedback, setSelectedFeedback] = useState<Set<string>>(new Set());
  const [availableClients, setAvailableClients] = useState<string[]>([]);
  const [loadingClients, setLoadingClients] = useState(false);
  // Using the Supabase client initialized at the top of the file
  const router = useRouter();
  const { toast } = useToast();

  const searchParams = useSearchParams();

  useEffect(() => {
    // Get client name from URL params or localStorage, but respect the current state if it's been explicitly cleared
    const client = clientName || searchParams.get('client') || localStorage.getItem('selectedClient') || '';
    
    console.log('=== FEEDBACK PAGE INITIALIZATION ===');
    console.log('URL client param:', searchParams.get('client'));
    console.log('localStorage client:', localStorage.getItem('selectedClient'));
    console.log('Final client value:', client);
    console.log('Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);
    console.log('Supabase key available:', !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
    
    // Fetch available clients regardless
    fetchAvailableClients();
    
    if (!client) {
      console.log('No client name found, skipping feedback fetch');
      setLoading(false);
      return;
    }
    
    setClientName(client);
    console.log('Setting client name and fetching feedback for:', client);
    fetchFeedback(client);
  }, [searchParams]);
  
  const fetchAvailableClients = async () => {
    try {
      console.log('Fetching available clients...');
      setLoadingClients(true);
      const { data, error } = await supabase
        .from('idea_feedback')
        .select('client_name')
        .order('client_name');
        
      console.log('Available clients raw response:', { data, error });
        
      if (error) {
        console.error('Error in fetchAvailableClients:', error);
        throw error;
      }
      
      // Extract unique client names
      const uniqueClients = Array.from(new Set(data.map(item => item.client_name)));
      console.log('Unique client names:', uniqueClients);
      setAvailableClients(uniqueClients);
    } catch (error) {
      console.error('Error fetching clients:', error);
      toast({
        title: 'Error',
        description: 'Failed to load client list',
        variant: 'destructive',
      });
    } finally {
      setLoadingClients(false);
    }
  };

  const fetchFeedback = async (client: string) => {
    try {
      setLoading(true);
      setClientName(client);
      localStorage.setItem('selectedClient', client);
      
      console.log('Fetching feedback for client:', client);
      
      // Try using the Supabase client first     
      // Log the query we're about to make
      console.log(`SELECT * FROM idea_feedback WHERE client_name ILIKE '${client}'`);
      
      // Try direct query first with Supabase client
      console.log('Attempting direct query with exact client name...');
      const directQuery = await supabase
        .from('idea_feedback')
        .select('*')
        .eq('client_name', client);
        
      console.log('Direct query result:', directQuery);
      
      // Try case-insensitive query with Supabase client
      console.log('Attempting case-insensitive query...');
      const { data, error } = await supabase
        .from('idea_feedback')
        .select('*')
        .ilike('client_name', client) // Use case-insensitive matching
        .order('created_at', { ascending: false });
        
      console.log('Case-insensitive query result:', { data, error });

      // If both failed, try direct REST API call
      if (!data || data.length === 0) {
        console.log('Trying direct REST API call as fallback...');
        
        // Make a direct REST API call using environment variables
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/idea_feedback?client_name=ilike.${encodeURIComponent('%'+client+'%')}`,
          {
            headers: {
              'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
              'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''}`,
              'Content-Type': 'application/json'
            }
          }
        );
        
        if (!response.ok) {
          throw new Error(`REST API call failed: ${response.status}`);
        }
        
        const restData = await response.json();
        console.log('REST API direct call result:', restData);
        
        if (restData && restData.length > 0) {
          setFeedback(restData);
          console.log('Using REST API data instead');
        } else {
          setFeedback([]);
        }
      } else if (error) {
        console.error('Supabase error:', error);
        throw error;
      } else {
        console.log('Feedback data received:', data);
        console.log('Number of feedback items:', data ? data.length : 0);
        setFeedback(data || []);
      }
      
      // Save client name to localStorage for future use
      localStorage.setItem('selectedClient', client);
      console.log('Client name saved to localStorage');
      
      // Try a raw query to see all feedback
      console.log('Fetching ALL feedback for debugging...');
      const allFeedbackResponse = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/idea_feedback?select=client_name,id&limit=10`,
        {
          headers: {
            'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
            'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      const allFeedback = await allFeedbackResponse.json();
      console.log('All feedback (limited to 10) via REST API:', allFeedback);
      
    } catch (error) {
      console.error('Error fetching feedback:', error);
      toast({
        title: 'Error',
        description: 'Failed to load feedback',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClick = (id: string) => {
    setFeedbackToDelete(id);
    setDeleteDialogOpen(true);
  };

  const handleSelectFeedback = (id: string, isSelected: boolean) => {
    setSelectedFeedback(prev => {
      const newSet = new Set(prev);
      if (isSelected) {
        newSet.add(id);
      } else {
        newSet.delete(id);
      }
      return newSet;
    });
  };

  const handleDeleteSelected = () => {
    setFeedbackToDelete(null); // Use null to indicate multiple items
    setDeleteDialogOpen(true);
  };

  const handleSelectAll = (isSelected: boolean) => {
    if (isSelected) {
      const allIds = feedback.map(item => item.id);
      setSelectedFeedback(new Set(allIds));
    } else {
      setSelectedFeedback(new Set());
    }
  };

  const handleEdit = (item: Feedback) => {
    setEditingFeedback({...item});
  };

  const handleDelete = async () => {
    try {
      if (feedbackToDelete) {
        // Single item delete
        const { error } = await supabase
          .from('idea_feedback')
          .delete()
          .eq('id', feedbackToDelete);

        if (error) throw error;
        
        setFeedback(feedback.filter(item => item.id !== feedbackToDelete));
        toast({
          title: 'Success',
          description: 'Feedback deleted successfully',
        });
      } else if (selectedFeedback.size > 0) {
        // Multiple items delete
        const selectedIds = Array.from(selectedFeedback);
        
        // Supabase doesn't support deleting multiple items with different IDs in one call
        // So we need to make multiple delete calls
        let successCount = 0;
        let errorCount = 0;
        
        for (const id of selectedIds) {
          const { error } = await supabase
            .from('idea_feedback')
            .delete()
            .eq('id', id);
            
          if (error) {
            errorCount++;
            console.error(`Error deleting feedback ${id}:`, error);
          } else {
            successCount++;
          }
        }
        
        // Update the local state to remove deleted items
        setFeedback(feedback.filter(item => !selectedFeedback.has(item.id)));
        
        // Show appropriate toast message
        if (errorCount === 0) {
          toast({
            title: 'Success',
            description: `${successCount} feedback items deleted successfully`,
          });
        } else {
          toast({
            title: 'Partial Success',
            description: `${successCount} deleted, ${errorCount} failed`,
            variant: 'destructive',
          });
        }
        
        // Clear selection
        setSelectedFeedback(new Set());
      }
      
      setDeleteDialogOpen(false);
      setFeedbackToDelete(null);
    } catch (error) {
      console.error('Error deleting feedback:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete feedback',
        variant: 'destructive',
      });
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingFeedback) return;

    try {
      const { error } = await supabase
        .from('idea_feedback')
        .update({
          idea_title: editingFeedback.idea_title,
          idea_description: editingFeedback.idea_description,
          concept_ideas: editingFeedback.concept_ideas,
          comment: editingFeedback.comment,
          vote: editingFeedback.vote,
        })
        .eq('id', editingFeedback.id);

      if (error) throw error;

      setFeedback(feedback.map(item => 
        item.id === editingFeedback.id ? { ...editingFeedback } : item
      ));

      setEditingFeedback(null);
      toast({
        title: 'Success',
        description: 'Feedback updated successfully',
      });
    } catch (error) {
      console.error('Error updating feedback:', error);
      toast({
        title: 'Error',
        description: 'Failed to update feedback',
        variant: 'destructive',
      });
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="flex flex-col items-center space-y-4">
            <Loader2 className="h-8 w-8 animate-spin" />
            <p>Loading feedback...</p>
          </div>
        </div>
      </div>
    );
  }

  // If no client name is provided, show a form to select one
  if (!clientName) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex flex-col items-center justify-center h-64 space-y-4">
          <h2 className="text-xl font-semibold">Select Client</h2>
          <p className="text-muted-foreground text-center">
            Please select a client to view their feedback.
          </p>
          
          {loadingClients ? (
            <div className="flex items-center space-x-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Loading clients...</span>
            </div>
          ) : availableClients.length > 0 ? (
            <div className="flex flex-col w-full max-w-sm space-y-4">
              <Select
                onValueChange={(value) => setClientName(value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a client" />
                </SelectTrigger>
                <SelectContent>
                  {availableClients.map((client) => (
                    <SelectItem key={client} value={client}>
                      {client}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Button 
                onClick={() => {
                  if (clientName) {
                    fetchFeedback(clientName);
                  }
                }}
              >
                View Feedback
              </Button>
            </div>
          ) : (
            <div className="text-center">
              <p>No clients found in the database.</p>
            </div>
          )}
          
          <Button variant="outline" onClick={() => router.back()}>
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center space-x-4">
          <Button variant="outline" size="icon" onClick={() => router.back()}>
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
              <path d="m15 18-6-6 6-6"/>
            </svg>
            <span className="sr-only">Back</span>
          </Button>
          <h1 className="text-2xl font-bold">Feedback for {clientName}</h1>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => {
              // Clear client name, feedback data, and selection
              setClientName('');
              setFeedback([]);
              setSelectedFeedback(new Set());
              localStorage.removeItem('selectedClient');
            }}
          >
            Change Client
          </Button>
        </div>
        
        {selectedFeedback.size > 0 && (
          <div className="flex items-center space-x-2">
            <span className="text-sm text-muted-foreground">{selectedFeedback.size} selected</span>
            <Button 
              variant="destructive" 
              size="sm"
              onClick={handleDeleteSelected}
            >
              Delete Selected
            </Button>
          </div>
        )}
      </div>
      
      {/* Debug information removed */}

      {feedback.length > 0 ? (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px]">
                  <div className="flex items-center">
                    <input 
                      type="checkbox" 
                      className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                      checked={selectedFeedback.size === feedback.length && feedback.length > 0}
                      onChange={(e) => handleSelectAll(e.target.checked)}
                    />
                  </div>
                </TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Concept</TableHead>
                <TableHead>Comment</TableHead>
                <TableHead>Vote</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {feedback.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>
                    <input 
                      type="checkbox" 
                      className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                      checked={selectedFeedback.has(item.id)}
                      onChange={(e) => handleSelectFeedback(item.id, e.target.checked)}
                    />
                  </TableCell>
                  <TableCell className="font-medium">{item.idea_title}</TableCell>
                  <TableCell>{item.concept_ideas}</TableCell>
                  <TableCell>{item.comment}</TableCell>
                  <TableCell>{item.vote}</TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(item)}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDeleteClick(item.id)}
                      >
                        Delete
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center p-12 border rounded-md bg-gray-50">
          <MessageSquare className="h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium mb-2">No feedback found</h3>
          <p className="text-muted-foreground text-center mb-4">
            There is no feedback data for client "{clientName}" yet.
          </p>
          <div className="flex flex-col gap-2 mt-4">
            <Button
              variant="outline"
              onClick={() => router.push('/competitor-research')}
            >
              Go Back
            </Button>
            <Button
              variant="default"
              onClick={() => {
                // Call fetchFeedback with the current client name to manually trigger a query
                if (clientName) {
                  fetchFeedback(clientName);
                  toast({
                    title: 'Debug Query',
                    description: 'Manually refreshing feedback data...',
                  });
                } else {
                  toast({
                    title: 'Error',
                    description: 'No client name selected',
                    variant: 'destructive',
                  });
                }
              }}
            >
              Debug Query
            </Button>
          </div>
        </div>
      )}

      {/* Edit Dialog */}
      {editingFeedback && (
        <Dialog open={!!editingFeedback} onOpenChange={(open) => !open && setEditingFeedback(null)}>
          <DialogContent className="max-w-2xl">
            <form onSubmit={handleUpdate}>
              <DialogHeader>
                <DialogTitle>Edit Feedback</DialogTitle>
                <DialogDescription>
                  Update the feedback details below.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <label htmlFor="idea_title" className="text-right">
                    Title
                  </label>
                  <Input
                    id="idea_title"
                    value={editingFeedback.idea_title || ''}
                    onChange={(e) =>
                      setEditingFeedback({ ...editingFeedback, idea_title: e.target.value })
                    }
                    className="col-span-3"
                  />
                </div>
                <div className="grid grid-cols-4 items-start gap-4">
                  <label htmlFor="concept_ideas" className="text-right pt-2">
                    Concept
                  </label>
                  <Textarea
                    id="concept_ideas"
                    value={editingFeedback.concept_ideas || ''}
                    onChange={(e) =>
                      setEditingFeedback({ ...editingFeedback, concept_ideas: e.target.value })
                    }
                    className="col-span-3"
                    rows={3}
                  />
                </div>
                <div className="grid grid-cols-4 items-start gap-4">
                  <label htmlFor="idea_description" className="text-right pt-2">
                    Description
                  </label>
                  <Textarea
                    id="idea_description"
                    value={editingFeedback.idea_description || ''}
                    onChange={(e) =>
                      setEditingFeedback({ ...editingFeedback, idea_description: e.target.value })
                    }
                    className="col-span-3"
                    rows={3}
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <label htmlFor="vote" className="text-right">
                    Vote
                  </label>
                  <Select
                    value={editingFeedback.vote || 'good'}
                    onValueChange={(value) =>
                      setEditingFeedback({ ...editingFeedback, vote: value as any })
                    }
                  >
                    <SelectTrigger className="col-span-3">
                      <SelectValue placeholder="Select vote" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="good">Good</SelectItem>
                      <SelectItem value="bad">Bad</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-4 items-start gap-4">
                  <label htmlFor="comment" className="text-right pt-2">
                    Comment
                  </label>
                  <Textarea
                    id="comment"
                    value={editingFeedback.comment || ''}
                    onChange={(e) =>
                      setEditingFeedback({ ...editingFeedback, comment: e.target.value })
                    }
                    className="col-span-3"
                    rows={2}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setEditingFeedback(null)}>
                  Cancel
                </Button>
                <Button type="submit">Save changes</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Are you sure?</DialogTitle>
            <DialogDescription>
              {feedbackToDelete ? 
                "This action cannot be undone. This will permanently delete this feedback." :
                `This action cannot be undone. This will permanently delete ${selectedFeedback.size} selected feedback items.`
              }
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={() => handleDelete()}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
