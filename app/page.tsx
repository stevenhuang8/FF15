'use client'

import Link from "next/link";
import Image from "next/image";
import { ArrowRight, ArrowUpRight, Apple, Dumbbell, TrendingUp } from "lucide-react";
import { motion } from "framer-motion";

const fadeIn = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" as const } }
}

const features = [
  { href: "/nutrition", icon: Apple, title: "Nutrition", description: "Log meals and track calories and macros." },
  { href: "/workouts", icon: Dumbbell, title: "Workouts", description: "Build routines that fit your goals and schedule." },
  { href: "/dashboard", icon: TrendingUp, title: "Progress", description: "See how your habits add up over time." },
]

export default function Home() {
  return (
    <main className="mx-auto w-full max-w-6xl px-4 md:px-8 py-12 md:py-20">
      {/* Hero */}
      <motion.section
        className="grid gap-10 md:grid-cols-2 md:items-center"
        initial="hidden"
        animate="show"
        variants={fadeIn}
      >
        <div>
          <p className="text-sm font-medium text-primary mb-4">Cooking & fitness, in one place</p>
          <h1 className="text-4xl md:text-5xl font-semibold leading-[1.1] mb-5">
            Eat well, train smarter, and keep it simple.
          </h1>
          <p className="text-lg text-muted-foreground max-w-md mb-8">
            Plan meals from what&apos;s in your pantry, get help at the stove, and follow workouts built around you.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/simple-agent"
              className="inline-flex items-center gap-2 rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-smooth hover:bg-primary/90"
            >
              Start with FF Coach
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/recipes"
              className="inline-flex items-center gap-2 rounded-md border border-border px-5 py-2.5 text-sm font-medium transition-smooth hover:bg-accent"
            >
              Browse recipes
            </Link>
          </div>
        </div>

        <div className="relative aspect-[4/3] overflow-hidden rounded-xl border border-border">
          <Image
            src="/imgs/cooking-bg.jpg"
            alt="Ingredients laid out on a kitchen counter"
            fill
            className="object-cover"
            sizes="(min-width: 768px) 50vw, 100vw"
            priority
          />
        </div>
      </motion.section>

      {/* Assistants */}
      <section className="mt-20">
        <h2 className="text-sm font-medium text-muted-foreground mb-4">Assistants</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <Link
            href="/simple-agent"
            className="group rounded-xl border border-border bg-card p-6 transition-smooth hover:border-foreground/20"
          >
            <div className="flex items-start justify-between mb-2">
              <h3 className="text-lg font-semibold">FF Coach</h3>
              <ArrowUpRight className="h-5 w-5 text-muted-foreground transition-smooth group-hover:text-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">
              Cooking, nutrition, meal planning, and fitness guidance with recommendations tailored to you.
            </p>
          </Link>

          <Link
            href="/agent-with-mcp-tools"
            className="group rounded-xl border border-border bg-card p-6 transition-smooth hover:border-foreground/20"
          >
            <div className="flex items-start justify-between mb-2">
              <h3 className="text-lg font-semibold">Recipe Research</h3>
              <ArrowUpRight className="h-5 w-5 text-muted-foreground transition-smooth group-hover:text-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">
              Digs through the web for recipes, techniques, and food history.
            </p>
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="mt-16 grid gap-px overflow-hidden rounded-xl border border-border bg-border md:grid-cols-3">
        {features.map(({ href, icon: Icon, title, description }) => (
          <Link
            key={title}
            href={href}
            className="bg-background p-6 transition-smooth hover:bg-accent/50"
          >
            <Icon className="h-5 w-5 text-primary mb-4" />
            <h3 className="font-medium mb-1">{title}</h3>
            <p className="text-sm text-muted-foreground">{description}</p>
          </Link>
        ))}
      </section>
    </main>
  );
}
