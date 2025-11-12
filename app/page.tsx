'use client'

import Link from "next/link";
import Image from "next/image";
import { MessageSquare, Brain, Database, Wrench, Dumbbell, Apple, TrendingUp } from "lucide-react";
import { motion } from "framer-motion";

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
}

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 }
}

export default function Home() {
  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Background Image with overlay */}
      <div className="absolute inset-0">
        <Image
          src="/imgs/cooking-bg.jpg"
          alt="Cooking background"
          fill
          className="object-cover opacity-20"
          priority
        />
        <div className="absolute inset-0 bg-gradient-dark" />
      </div>

      {/* Animated background gradient */}
      <div className="absolute inset-0 animated-gradient opacity-30" />

      {/* Content */}
      <div className="relative z-10 min-h-screen flex items-center justify-center p-4 md:p-8">
        <motion.div
          className="w-full max-w-6xl mx-auto"
          initial="hidden"
          animate="show"
          variants={container}
        >
          {/* Hero Section */}
          <motion.div className="text-center mb-12" variants={item}>
            <div className="flex items-center justify-center gap-3 mb-4">
              <Apple className="h-10 w-10 text-primary" />
              <Dumbbell className="h-10 w-10 text-primary" />
            </div>
            <h1 className="text-4xl md:text-6xl font-bold mb-4">
              <span className="bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
                Food & Fitness AI
              </span>
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
              Your intelligent companion for cooking mastery and fitness excellence
            </p>
          </motion.div>

          {/* Agent Cards */}
          <motion.div
            className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 mb-12"
            variants={container}
          >
            <motion.div variants={item}>
              <Link
                href="/simple-agent"
                className="group block glass-strong rounded-xl p-6 hover:scale-105 transition-smooth glow-hover h-full border-2 border-primary/50"
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-3 bg-primary/20 rounded-lg group-hover:bg-primary/30 transition-smooth">
                    <Brain className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="text-xl font-semibold">FF Coach</h3>
                </div>
                <p className="text-muted-foreground text-sm">
                  Your complete AI assistant for cooking, nutrition, meal planning, and fitness guidance with personalized recommendations
                </p>
                <div className="mt-3 px-3 py-1 bg-primary/10 rounded-full text-xs text-primary inline-block">
                  Recommended
                </div>
              </Link>
            </motion.div>

            <motion.div variants={item}>
              <Link
                href="/agent-with-mcp-tools"
                className="group block glass-strong rounded-xl p-6 hover:scale-105 transition-smooth glow-hover h-full"
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-3 bg-primary/10 rounded-lg group-hover:bg-primary/20 transition-smooth">
                    <Wrench className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="text-xl font-semibold">Web Research Agent</h3>
                </div>
                <p className="text-muted-foreground text-sm">
                  Specialized agent for deep recipe research and web scraping using Firecrawl integration
                </p>
              </Link>
            </motion.div>
          </motion.div>

          {/* Feature Highlights */}
          <motion.div
            className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-4xl mx-auto"
            variants={container}
          >
            <motion.div variants={item}>
              <Link
                href="/nutrition"
                className="block glass rounded-lg p-4 text-center hover:glass-strong transition-smooth hover:scale-105"
              >
                <Apple className="h-8 w-8 text-primary mx-auto mb-2" />
                <h4 className="font-medium mb-1">Smart Nutrition</h4>
                <p className="text-xs text-muted-foreground">Track calories & macros</p>
              </Link>
            </motion.div>

            <motion.div variants={item}>
              <Link
                href="/workouts"
                className="block glass rounded-lg p-4 text-center hover:glass-strong transition-smooth hover:scale-105"
              >
                <Dumbbell className="h-8 w-8 text-primary mx-auto mb-2" />
                <h4 className="font-medium mb-1">Workout Plans</h4>
                <p className="text-xs text-muted-foreground">Personalized exercises</p>
              </Link>
            </motion.div>

            <motion.div variants={item}>
              <Link
                href="/nutrition"
                className="block glass rounded-lg p-4 text-center hover:glass-strong transition-smooth hover:scale-105"
              >
                <TrendingUp className="h-8 w-8 text-primary mx-auto mb-2" />
                <h4 className="font-medium mb-1">Progress Tracking</h4>
                <p className="text-xs text-muted-foreground">Monitor your journey</p>
              </Link>
            </motion.div>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}
