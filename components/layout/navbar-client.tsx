'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Menu, X, Dumbbell, Apple } from 'lucide-react'
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { User } from '@supabase/supabase-js'

interface NavbarClientProps {
  user: User | null
  userMenuComponent: React.ReactNode
}

export function NavbarClient({ user, userMenuComponent }: NavbarClientProps) {
  const [isOpen, setIsOpen] = useState(false)
  const pathname = usePathname()

  const navItems = [
    { href: '/chat-history', label: 'History' },
    { href: '/dashboard', label: 'Dashboard' },
    { href: '/ingredients', label: 'Pantry' },
    { href: '/recipes', label: 'Recipes' },
    { href: '/nutrition', label: 'Nutrition' },
    { href: '/workouts', label: 'Workouts' },
  ]

  const isActive = (path: string) => pathname === path

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-border/40 glass-strong transition-smooth">
      <div className="container flex h-16 items-center px-4">
        {/* Logo */}
        <Link href="/" className="flex items-center space-x-2 mr-8 group">
          <motion.div
            className="flex items-center space-x-2"
            whileHover={{ scale: 1.05 }}
            transition={{ type: "spring", stiffness: 400 }}
          >
            <div className="flex items-center gap-1">
              <Apple className="h-5 w-5 text-primary" />
              <Dumbbell className="h-5 w-5 text-primary" />
            </div>
            <span className="font-bold text-lg text-foreground">
              Food & Fitness AI
            </span>
          </motion.div>
        </Link>

        {/* Desktop Navigation */}
        {user && (
          <nav className="hidden md:flex items-center space-x-1 flex-1">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="relative px-3 py-2 text-sm font-medium transition-smooth group"
              >
                <span className={`relative z-10 ${
                  isActive(item.href)
                    ? 'text-primary'
                    : 'text-muted-foreground hover:text-foreground'
                }`}>
                  {item.label}
                </span>
                {isActive(item.href) && (
                  <motion.div
                    layoutId="navbar-active"
                    className="absolute inset-0 bg-primary/10 rounded-md"
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  />
                )}
              </Link>
            ))}
          </nav>
        )}

        {/* Right Side Actions */}
        <div className="flex flex-1 md:flex-initial items-center justify-end space-x-2">
          {user ? (
            <>
              {/* Mobile Menu Button */}
              <button
                onClick={() => setIsOpen(!isOpen)}
                className="md:hidden p-2 rounded-md hover:bg-accent transition-smooth"
              >
                {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
              {userMenuComponent}
            </>
          ) : (
            <div className="flex items-center space-x-2">
              <Button variant="ghost" asChild className="transition-smooth glow-hover">
                <Link href="/login">Sign In</Link>
              </Button>
              <Button asChild className="bg-gradient-primary transition-smooth glow-hover">
                <Link href="/signup">Sign Up</Link>
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isOpen && user && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="md:hidden border-t border-border/40"
          >
            <div className="container py-4 px-4 space-y-2">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsOpen(false)}
                  className={`block px-4 py-2 rounded-md text-sm font-medium transition-smooth ${
                    isActive(item.href)
                      ? 'bg-primary/10 text-primary'
                      : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                  }`}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  )
}
