"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "@/components/ui/use-toast"
import { Card, CardContent } from "@/components/ui/card"
import { Loader2 } from "lucide-react"

const formSchema = z.object({
  clientName: z.string().min(2, {
    message: "Client name must be at least 2 characters.",
  }),
  facebookUrl: z.string().url({
    message: "Please enter a valid Facebook URL.",
  }).or(z.literal("")).optional(),
  websiteUrl: z.string().url({
    message: "Please enter a valid website URL.",
  }).or(z.literal("")).optional(),
  market: z.string({
    required_error: "Please select a market.",
  }),
  productFocus: z.string().optional(),
  additionalInfo: z.string().optional(),
})

// Export the inferred type
export type NewAnalysisFormData = z.infer<typeof formSchema>;

interface NewAnalysisFormProps {
  onSubmitAnalysis: (formData: NewAnalysisFormData) => Promise<void>;
  isLoading: boolean;
}

export function NewAnalysisForm({ onSubmitAnalysis, isLoading }: NewAnalysisFormProps) {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      clientName: "",
      facebookUrl: "",
      websiteUrl: "",
      market: "thailand",
      productFocus: "",
      additionalInfo: "",
    },
  })

  return (
    <Card>
      <CardContent className="pt-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmitAnalysis)} className="space-y-8">
            <FormField
              control={form.control}
              name="clientName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Client Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Thai Food Delivery App" {...field} />
                  </FormControl>
                  <FormDescription>Enter your client's business name.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <FormField
                control={form.control}
                name="facebookUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Facebook Page URL</FormLabel>
                    <FormControl>
                      <Input placeholder="https://facebook.com/clientpage" {...field} />
                    </FormControl>
                    <FormDescription>Your client's Facebook page URL.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="websiteUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Website URL</FormLabel>
                    <FormControl>
                      <Input placeholder="https://clientwebsite.com" {...field} />
                    </FormControl>
                    <FormDescription>Your client's website URL.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="market"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Target Market</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a market" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="global">Global</SelectItem>
                      <SelectItem value="thailand">Thailand</SelectItem>
                      <SelectItem value="bangkok">Bangkok</SelectItem>
                      <SelectItem value="chiang_mai">Chiang Mai</SelectItem>
                      <SelectItem value="phuket">Phuket</SelectItem>
                      <SelectItem value="pattaya">Pattaya</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription>Select the target market for your analysis.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="productFocus"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Product/Service Focus (Optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Gold Investment, Food Delivery, Robo-advisor" {...field} />
                  </FormControl>
                  <FormDescription>Specify the main product/service for competitor comparison.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="additionalInfo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Additional Information</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Any specific competitors or areas to focus on..."
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Optional: Add any specific information that might help with the analysis.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" disabled={isLoading}>
              {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Start Analysis"}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}
