# FF Coach - AI-Powered Cooking & Fitness Assistant

A comprehensive AI platform for cooking, nutrition tracking, meal planning, and fitness coaching. Built with Next.js 15, AI SDK 5, and a multi-agent architecture featuring 8 specialized AI subagents and 23 tools.

## Features

- **AI Conversational Interface**: Multi-agent orchestration with 8 specialized subagents, streaming responses, RAG integration, conversation persistence, and **GPT-4 Vision** for analyzing meal and ingredient photos
- **Recipe Management**: AI-assisted recipe creation, extraction from chat, library with filtering, nutrition breakdown, pantry-based generation, and ingredient substitutions
- **Nutrition Tracking**: Meal logging with USDA database, AI nutrition estimation, **image-based meal logging** (send a photo, AI identifies food and logs it), daily calorie/macro tracking, customizable targets, and analytics dashboard
- **Fitness & Workout Tracking**: AI workout planning, exercise database (100+), workout logging, progress analytics, and streak tracking
- **Pantry Management**: Ingredient inventory, expiration tracking, **AI-powered ingredient extraction** from photos (receipts, packaging, ingredient photos), and AI recipe suggestions based on available items
- **User Profile**: Authentication, dietary restrictions, allergies, fitness goals, health metrics logging

## Tech Stack

**Frontend**: Next.js 15, TypeScript 5, shadcn/ui, Tailwind CSS v4, React Hook Form, Framer Motion, Recharts, AI Elements

**Backend**: Next.js API Routes, OpenAI GPT-5 (AI SDK 5), GPT-4 Vision for image analysis, Supabase Auth & PostgreSQL, Vectorize RAG, USDA Food Database, MCP Integration

**Key Technologies**: AI SDK `streamText()` and `generateObject()`, multi-step tool execution with `stopWhen(stepCountIs(15))`, vision-powered meal logging and ingredient extraction, Row Level Security (RLS), JSONB for dynamic data

## Multi-Agent Architecture

The main orchestrator coordinates 8 specialized subagents with 23 AI tools:

**Subagents:**
1. **cooking-assistant** - Real-time cooking guidance and techniques
2. **recipe-researcher** - Recipe history and culinary research
3. **ingredient-specialist** - Ingredient substitutions and alternatives
4. **nutrition-analyst** - Nutritional calculations and analysis
5. **meal-planner** - Weekly meal planning and prep
6. **pantry-manager** - Pantry-based recipe suggestions
7. **workout-planner** - Personalized fitness routines
8. **profile-manager** - User preferences and goals management

**AI Tools (23 Total):**
- **Data Retrieval**: `retrieveKnowledgeBase`, `searchFoodNutrition`, `getUserContext`, `getDashboardSummary`, `getHealthMetrics`, `getFitnessGoals`, `getWorkoutStreak`
- **Data Logging** (Preview + Confirm): Meal, workout, health metrics, pantry items
- **Profile Management** (Preview + Confirm): Dietary preferences, allergies, fitness goals
- **Generation**: `recommendWorkout`, `generateRecipeFromIngredients`, `suggestSubstitution`, `createFitnessGoal`

## AI-Powered Image Extraction

FF Coach leverages **GPT-4 Vision** for intelligent image analysis in two key workflows:

### Meal Logging from Photos
**How it works:**
1. User sends a photo of their meal to the AI agent
2. Agent analyzes the image to identify food items, portion sizes, and meal type
3. Agent uses `logMealPreview` tool with extracted data to calculate nutrition
4. User confirms and the meal is logged with full nutritional breakdown

**Example:** User sends a breakfast photo → Agent: "I can see scrambled eggs, toast, and bacon. Let me calculate the nutrition... [displays preview] Should I log this for breakfast?"

### Ingredient Extraction from Receipts/Packaging
**How it works:**
1. User uploads an image (receipt, food packaging, ingredient photo)
2. Dedicated `/api/extract-ingredients` endpoint uses GPT-4o to parse the image
3. AI extracts ingredient names, quantities, units, and confidence scores
4. Structured data returned with image type detection and warnings

**Features:**
- Automatic unit normalization (e.g., "tomatoe" → "tomato")
- Confidence scoring per ingredient (0-1 scale)
- HEIC to JPEG conversion support
- Graceful degradation (extraction failure doesn't break upload)

**Implementation:**
- API: `/app/api/extract-ingredients/route.ts` using AI SDK `generateObject()`
- Component: `IngredientUpload` in `/components/ingredient/ingredient-upload.tsx`
- Storage: Supabase Storage with automatic signed URLs

## Setup

**Prerequisites**: Node.js 19+, pnpm, Supabase account, OpenAI API key

**Installation:**

```bash
# Clone and install
git clone <repository-url>
cd FF15
pnpm install

# Set up Supabase
# 1. Create project at supabase.com
# 2. Run SQL files in Supabase SQL Editor:
#    - supabase-schema.sql
#    - supabase-exercises-enhancement.sql
#    - supabase-substitutions-seed.sql
```

**Environment Variables** (`.env.local`):

```bash
# Required
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_key
OPENAI_API_KEY=your_openai_key

# Optional
VECTORIZE_ACCESS_TOKEN=your_vectorize_token
VECTORIZE_ORG_ID=your_org_id
VECTORIZE_PIPELINE_ID=your_pipeline_id
FIRECRAWL_API_KEY=your_firecrawl_key
```

**Development:**

```bash
pnpm dev              # Start dev server
pnpm build            # Build for production
pnpm start            # Start production server
pnpm tsc --noEmit     # Type checking
```

Open [http://localhost:3000](http://localhost:3000)

## Architecture

```text
Browser (Client)
  ├── Chat Interface (AI Elements, useChat, Streaming)
  └── Feature Pages (Recipes, Workouts, Nutrition)
        ↓
Next.js API Routes
  └── Main Orchestrator (/app/api/chat/route.ts)
      ├── Validate auth (Supabase)
      ├── streamText() with 8 subagents
      ├── 23 specialized tools
      └── Return streaming response
            ↓
      8 Subagents (cooking, nutrition, workout, etc.)
            ↓
      ┌──────────────┬──────────────┐
      Tools          Database       External Services
      (23)           (Supabase)     (OpenAI, Vectorize, USDA)
```

**Key Patterns:**
- **Multi-Agent Orchestration**: Automatic delegation to specialized subagents with isolated contexts
- **Preview-and-Confirm**: Two-step process for data-modifying tools
- **Streaming**: Token-by-token responses with tool results in message parts array
- **Message Structure**: `parts: []` array (not simple `content` string) with types: text, tool, source-url, reasoning
- **Security**: JWT sessions, RLS on all tables, timezone-aware operations

## Database

PostgreSQL via Supabase with 15+ tables:

**Core**: user_profiles, conversations, messages (with tool calls/sources)
**Content**: saved_recipes, ingredients, ingredient_substitutions, user_substitution_preferences
**Fitness**: exercises (100+), workout_logs, workout_plans, meal_logs, calorie_tracking, health_metrics, fitness_goals, progress_snapshots

**Features**: Row Level Security (RLS), JSONB columns, cascade deletes, automatic timestamps

## Routes

| Route | Purpose | Auth |
|-------|---------|------|
| `/` | Home | No |
| `/simple-agent` | Main FF Coach AI | No |
| `/dashboard` | Health & fitness overview | Yes |
| `/recipes`, `/workouts`, `/nutrition` | Feature pages | Yes |
| `/ingredients`, `/profile` | Management | Yes |
| `/login`, `/signup` | Authentication | No |

## Project Structure

```
app/
├── api/chat/              # Main orchestrator
├── api/nutrition/         # Nutrition endpoints
└── [pages]/               # Feature pages

components/
├── agent/subagents/       # 8 subagents
├── agent/tools/           # 23 AI tools
├── ai-elements/           # AI UI components
└── [feature]/             # Feature components

lib/
├── supabase/              # Database utilities
├── nutrition/             # USDA API, unit conversion
└── retrieval/             # Vectorize RAG
```

## Resources

**Core**: [Next.js](https://nextjs.org/) | [AI SDK](https://ai-sdk.dev/) | [TypeScript](https://typescriptlang.org/)

**AI/Agent**: [Tools](https://ai-sdk.dev/docs/ai-sdk-core/tools-and-tool-calling) | [Streaming](https://ai-sdk.dev/docs/ai-sdk-ui/streaming-data) | [Generative UI](https://ai-sdk.dev/docs/ai-sdk-ui/generative-user-interfaces) | [Subagents](https://docs.claude.com/en/api/agent-sdk/subagents)

**Database**: [Supabase Docs](https://supabase.com/docs) | [Next.js Integration](https://supabase.com/docs/guides/getting-started/quickstarts/nextjs) | [RLS](https://supabase.com/docs/guides/auth/row-level-security)

**UI**: [shadcn/ui](https://ui.shadcn.com/) | [Tailwind CSS](https://tailwindcss.com/) | [Radix UI](https://radix-ui.com/)

## Contributing

1. Read AI SDK documentation before implementing features
2. Follow multi-agent architecture patterns
3. Use preview-and-confirm for data-modifying tools
4. Run `pnpm tsc --noEmit` before committing
5. Test authentication flows thoroughly

## License

[Your License Here]
