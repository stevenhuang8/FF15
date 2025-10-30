'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { HelpCircle } from 'lucide-react'
import { FeedbackModal } from './feedback-modal'

export function HelpButton() {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setIsOpen(true)}
        className="transition-smooth glow-hover"
        aria-label="Help and Feedback"
      >
        <HelpCircle className="h-5 w-5" />
      </Button>
      <FeedbackModal open={isOpen} onOpenChange={setIsOpen} />
    </>
  )
}
