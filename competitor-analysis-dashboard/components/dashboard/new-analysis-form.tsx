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

const formSchema = z.object({
  clientName: z.string().min(2, {
    message: "Client name must be at least 2 characters.",
  }),
  facebookUrl: z.string().url({
    message: "Please enter a valid Facebook URL.",
  }),
  websiteUrl: z.string().url({
    message: "Please enter a valid website URL.",
  }),
  market: z.string({
    required_error: "Please select a market.",
  }),
  additionalInfo: z.string().optional(),
})

export function NewAnalysisForm() {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      clientName: "",
      facebookUrl: "",
      websiteUrl: "",
      market: "thailand",
      additionalInfo: "",
    },
  })

  function onSubmit(values: z.infer<typeof formSchema>) {
    toast({
      title: "Analysis started",
      description: "Your competitor analysis is now being processed.",
    })
    console.log(values)
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
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
                      <SelectItem value="thailand">Thailand (Default)</SelectItem>
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
            <Button type="submit">Start Analysis</Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}
