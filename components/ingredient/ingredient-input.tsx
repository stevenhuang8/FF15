'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { CalendarIcon, Check, ChevronsUpDown } from 'lucide-react'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import {
  COMMON_INGREDIENTS,
  INGREDIENT_UNITS,
  INGREDIENT_CATEGORIES,
  type IngredientInput as IngredientInputType,
} from '@/types/ingredient'

const ingredientSchema = z.object({
  name: z.string().min(1, 'Ingredient name is required').max(100, 'Name is too long'),
  quantity: z.number().min(0.01, 'Quantity must be greater than 0').max(10000, 'Quantity is too large'),
  unit: z.string().min(1, 'Unit is required'),
  category: z.string().optional(),
  expiryDate: z.date().optional().nullable(),
  notes: z.string().max(500, 'Notes are too long').optional(),
})

type IngredientFormValues = z.infer<typeof ingredientSchema>

interface IngredientInputProps {
  onSubmit: (data: IngredientInputType) => Promise<void> | void
  defaultValues?: Partial<IngredientFormValues>
  submitButtonText?: string
  isLoading?: boolean
}

export function IngredientInput({
  onSubmit,
  defaultValues,
  submitButtonText = 'Add Ingredient',
  isLoading = false,
}: IngredientInputProps) {
  const [open, setOpen] = useState(false)

  const form = useForm<IngredientFormValues>({
    resolver: zodResolver(ingredientSchema),
    defaultValues: {
      name: defaultValues?.name || '',
      quantity: defaultValues?.quantity || undefined,
      unit: defaultValues?.unit || 'piece',
      category: defaultValues?.category || undefined,
      expiryDate: defaultValues?.expiryDate || null,
      notes: defaultValues?.notes || '',
    },
  })

  async function handleSubmit(data: IngredientFormValues) {
    await onSubmit(data)
    form.reset()
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        {/* Ingredient Name with Auto-Complete */}
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Ingredient Name</FormLabel>
              <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={open}
                      className={cn(
                        'w-full justify-between',
                        !field.value && 'text-muted-foreground'
                      )}
                    >
                      {field.value || 'Select or type ingredient...'}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0" align="start">
                  <Command>
                    <CommandInput
                      placeholder="Search ingredients..."
                      value={field.value}
                      onValueChange={(value) => {
                        field.onChange(value)
                      }}
                    />
                    <CommandList>
                      <CommandEmpty>
                        <div className="p-2 text-sm">
                          <p className="font-medium">&quot;{field.value}&quot;</p>
                          <p className="text-muted-foreground">
                            Press Enter to use this custom ingredient
                          </p>
                        </div>
                      </CommandEmpty>
                      <CommandGroup>
                        {COMMON_INGREDIENTS.filter((ingredient) =>
                          ingredient.toLowerCase().includes(field.value?.toLowerCase() ?? '')
                        ).map((ingredient) => (
                          <CommandItem
                            key={ingredient}
                            value={ingredient}
                            onSelect={() => {
                              form.setValue('name', ingredient)
                              setOpen(false)
                            }}
                          >
                            <Check
                              className={cn(
                                'mr-2 h-4 w-4',
                                field.value === ingredient ? 'opacity-100' : 'opacity-0'
                              )}
                            />
                            {ingredient}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              <FormDescription>
                Select from common ingredients or type your own
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Quantity and Unit */}
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="quantity"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Quantity</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="Enter quantity"
                    {...field}
                    value={field.value === undefined || isNaN(field.value) ? '' : field.value}
                    onChange={(e) => {
                      const value = e.target.value;
                      // Allow empty string for easier editing
                      if (value === '') {
                        field.onChange(undefined);
                      } else {
                        const num = parseFloat(value);
                        field.onChange(isNaN(num) ? undefined : num);
                      }
                    }}
                    onFocus={(e) => e.target.select()}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="unit"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Unit</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select unit" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {INGREDIENT_UNITS.map((unit) => (
                      <SelectItem key={unit} value={unit}>
                        {unit}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Category */}
        <FormField
          control={form.control}
          name="category"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Category (Optional)</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {INGREDIENT_CATEGORIES.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category.charAt(0).toUpperCase() + category.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormDescription>
                Categorize for easier organization
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Expiry Date */}
        <FormField
          control={form.control}
          name="expiryDate"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Expiry Date (Optional)</FormLabel>
              <Popover>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button
                      variant="outline"
                      className={cn(
                        'w-full pl-3 text-left font-normal',
                        !field.value && 'text-muted-foreground'
                      )}
                    >
                      {field.value ? (
                        format(field.value, 'PPP')
                      ) : (
                        <span>Pick a date</span>
                      )}
                      <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={field.value || undefined}
                    onSelect={field.onChange}
                    disabled={(date) =>
                      date < new Date(new Date().setHours(0, 0, 0, 0))
                    }
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              <FormDescription>
                When does this ingredient expire?
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Notes */}
        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notes (Optional)</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Add any additional notes about this ingredient..."
                  className="resize-none"
                  {...field}
                />
              </FormControl>
              <FormDescription>
                Storage location, preparation notes, etc.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button
          type="submit"
          className="w-full"
          disabled={form.formState.isSubmitting || isLoading}
        >
          {form.formState.isSubmitting || isLoading ? 'Adding...' : submitButtonText}
        </Button>
      </form>
    </Form>
  )
}
