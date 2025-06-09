"use client"

import { useState } from "react"
// @ts-ignore - Ignore missing type declarations for @hello-pangea/dnd
import { DragDropContext, Draggable, Droppable } from "@hello-pangea/dnd"
import { Edit2, Grip, Plus, Save, Trash2, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { appFunnelStages, ecommerceFunnelStages, setFunnelStages } from "../data/funnel-stages"

interface FunnelStageManagerProps {
  funnelType: "app" | "ecommerce"
  onStagesChange: (stages: string[]) => void
}

export function FunnelStageManager({ funnelType, onStagesChange }: FunnelStageManagerProps) {
  const [open, setOpen] = useState(false)
  const [stages, setStages] = useState<string[]>(funnelType === "app" ? appFunnelStages : ecommerceFunnelStages)
  const [editingStage, setEditingStage] = useState<{ index: number; value: string } | null>(null)
  const [newStage, setNewStage] = useState("")

  const handleSave = () => {
    // Save stages to the data store
    setFunnelStages(funnelType, stages)
    // Notify parent component
    onStagesChange(stages)
    setOpen(false)
  }

  const handleAddStage = () => {
    if (newStage.trim()) {
      setStages([...stages, newStage.trim()])
      setNewStage("")
    }
  }

  const handleDeleteStage = (index: number) => {
    const updatedStages = [...stages]
    updatedStages.splice(index, 1)
    setStages(updatedStages)
  }

  const handleEditStage = (index: number) => {
    setEditingStage({ index, value: stages[index] })
  }

  const handleSaveEdit = () => {
    if (editingStage && editingStage.value.trim()) {
      const updatedStages = [...stages]
      updatedStages[editingStage.index] = editingStage.value.trim()
      setStages(updatedStages)
      setEditingStage(null)
    }
  }

  const handleCancelEdit = () => {
    setEditingStage(null)
  }

  const handleDragEnd = (result: { destination?: { index: number }, source: { index: number } }) => {
    if (!result.destination) return

    const items = Array.from(stages)
    const [reorderedItem] = items.splice(result.source.index, 1)
    items.splice(result.destination.index, 0, reorderedItem)

    setStages(items)
  }

  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>
        Manage Funnel Stages
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Manage Funnel Stages</DialogTitle>
            <DialogDescription>
              Add, edit, or reorder funnel stages for your {funnelType === "app" ? "App" : "Ecommerce"} funnel. Drag and
              drop to reorder stages.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <DragDropContext onDragEnd={handleDragEnd}>
              <Droppable droppableId="funnel-stages">
                {(provided: { droppableProps: any; innerRef: any; placeholder: React.ReactNode }) => (
                  <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-2">
                    {stages.map((stage, index) => (
                      <Draggable key={stage} draggableId={stage} index={index}>
                        {(provided: { innerRef: any; draggableProps: any; dragHandleProps: any }) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            className="flex items-center gap-2 rounded-md border bg-card p-2"
                          >
                            <div {...provided.dragHandleProps} className="cursor-grab">
                              <Grip className="h-4 w-4 text-muted-foreground" />
                            </div>

                            {editingStage && editingStage.index === index ? (
                              <div className="flex flex-1 items-center gap-2">
                                <Input
                                  value={editingStage.value}
                                  onChange={(e) => setEditingStage({ ...editingStage, value: e.target.value })}
                                  className="h-8"
                                />
                                <Button size="sm" variant="ghost" onClick={handleSaveEdit}>
                                  <Save className="h-4 w-4" />
                                </Button>
                                <Button size="sm" variant="ghost" onClick={handleCancelEdit}>
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                            ) : (
                              <>
                                <span className="flex-1">{stage}</span>
                                <Button size="sm" variant="ghost" onClick={() => handleEditStage(index)}>
                                  <Edit2 className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleDeleteStage(index)}
                                  disabled={stages.length <= 1}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </>
                            )}
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </DragDropContext>

            <div className="flex items-center gap-2">
              <Input
                placeholder="New stage name"
                value={newStage}
                onChange={(e) => setNewStage(e.target.value)}
                className="flex-1"
              />
              <Button onClick={handleAddStage} disabled={!newStage.trim()}>
                <Plus className="h-4 w-4 mr-2" />
                Add Stage
              </Button>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
