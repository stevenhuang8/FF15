# Food & Fitness AI (FF Coach)

An intelligent AI-powered platform combining cooking mastery with fitness excellence. Built on Next.js 15 with a sophisticated multi-agent architecture featuring 9 specialized AI subagents and 27 tools, GPT-4 Vision image analysis, and comprehensive health tracking.

## Core Capabilities

### 🤖 AI Conversational Interface
- **Multi-agent orchestration** with 9 specialized subagents for domain expertise
- **Streaming responses** with real-time tool execution visibility
- **GPT-4 Vision integration** for meal photo analysis and ingredient extraction
- **RAG-powered knowledge retrieval** via Vectorize for accurate cooking and fitness guidance
- **Persistent conversation history** with tool call tracking

### 🍳 Recipe Intelligence
- AI-assisted recipe creation from natural language
- Extract and save recipes directly from conversations
- **Pantry-based recipe generation** using available ingredients
- Nutrition breakdown with USDA database integration
- Ingredient substitution suggestions with dietary preference awareness
- Recipe library with filtering by dietary restrictions, difficulty, and prep time
- Image upload for ingredient list extraction

### 📊 Nutrition Tracking
- **Photo-based meal logging** (send a meal photo, AI identifies food and calculates nutrition)
- Manual meal logging with USDA FoodData Central search
- AI-powered nutrition estimation when database entries unavailable
- Daily calorie and macro tracking with customizable targets
- Historical analytics and trends visualization
- Meal history with edit and delete capabilities

### 💪 Fitness & Workout Management
- AI-generated personalized workout plans
- Database of 100+ exercises with detailed instructions
- Workout logging with sets, reps, weight tracking
- Progress analytics and performance trends
- **Workout streak tracking** with milestone celebrations
- Progress photo uploads with timeline view

### 🥕 Pantry Management
- Ingredient inventory with quantity and unit tracking
- Expiration date monitoring with category organization
- **AI-powered ingredient extraction from photos** (receipts, packaging, ingredient labels)
- HEIC to JPEG automatic conversion support
- AI recipe suggestions based on available pantry items

### 👤 User Profile & Preferences
- Dietary restriction management (vegetarian, vegan, gluten-free, etc.)
- Allergy tracking with ingredient safety checks
- Fitness goal setting with structured target tracking
- Health metrics logging (weight, body fat %, measurements)
- Customizable daily nutrition targets

### 📈 Analytics Dashboard
- Daily nutrition summary with macro breakdowns
- Workout streak and consistency tracking
- Health metric progression charts
- Fitness goal progress visualization
- Recent activity timeline

### 💬 Feedback System
- User feedback submission with optional screenshots
- Admin dashboard for feedback management
- Email notifications for high-priority feedback
- Feedback history and status tracking

## Technology Stack

### Frontend
- **Next.js 15** with App Router and Turbopack for fast development builds
- **TypeScript 5** with strict type checking
- **shadcn/ui** component library (New York style, neutral theme)
- **Tailwind CSS v4** for styling
- **Radix UI** primitives for accessible components
- **React Hook Form** with Zod validation
- **Framer Motion** for animations
- **Recharts** for data visualization
- **AI Elements** by Vercel for chat UI components

### Backend
- **Next.js API Routes** for serverless backend
- **AI SDK 5** (`streamText`, `generateObject`) for AI integration
- **OpenAI GPT-5** for conversational AI
- **GPT-4o** for vision-powered image analysis
- **Supabase** for authentication and PostgreSQL database
- **Vectorize** for RAG document retrieval
- **USDA FoodData Central API** for nutrition data
- **MCP (Model Context Protocol)** integration support

### Key Implementation Patterns
- **Multi-step tool execution** with `stopWhen(stepCountIs(15))`
- **Preview-and-confirm workflow** for data-modifying operations
- **Streaming architecture** with token-by-token responses
- **Message parts array** structure (text, tool, source-url, reasoning)
- **Row Level Security (RLS)** on all database tables
- **JSONB columns** for flexible data storage
- **Timezone-aware operations** for accurate date tracking

## Multi-Agent Architecture

The application uses a main orchestrator that automatically delegates to 9 specialized subagents:

### Subagents

1. **cooking-assistant** - Real-time cooking guidance, techniques, troubleshooting
2. **recipe-researcher** - Recipe history, culinary research, cultural context
3. **ingredient-specialist** - Ingredient substitutions and alternatives
4. **nutrition-analyst** - Nutritional calculations, healthier alternatives
5. **meal-planner** - Weekly meal planning, grocery lists, batch cooking
6. **pantry-manager** - Pantry-based recipe suggestions, inventory optimization
7. **workout-planner** - Personalized fitness routines, exercise recommendations
8. **profile-manager** - User preferences, goals, dietary restrictions management
9. **admin-assistant** - Administrative tasks and system management

### AI Tools (27 Total)

**Data Retrieval:**
- `retrieveKnowledgeBase` - RAG-powered knowledge base search
- `retrieveKnowledgeBaseSimple` - Simplified knowledge base search
- `searchFoodNutrition` - USDA database nutrition lookup
- `getUserContext` - User profile and preferences
- `getDashboardSummary` - Health and fitness overview
- `getHealthMetricsTool` - Weight, body composition history
- `getFitnessGoalsTool` - Structured fitness goals
- `getWorkoutStreakTool` - Workout consistency tracking

**Data Logging (Preview + Confirm Pattern):**
- `logMealPreview` / `confirmMealLog` - Meal tracking
- `logWorkoutPreview` / `confirmWorkoutLog` - Workout tracking
- `logHealthMetricsPreview` / `confirmHealthMetricsLog` - Body metrics
- `addPantryItemPreview` / `confirmAddPantryItem` - Pantry management

**Profile Management (Preview + Confirm):**
- `updateDietaryPreferences` / `confirmDietaryPreferencesUpdate`
- `updateAllergiesPreview` / `confirmAllergiesUpdate`
- `updateFitnessGoalsPreview` / `confirmFitnessGoalsUpdate`

**Generation:**
- `recommendWorkout` - AI workout plan generation
- `generateRecipeFromIngredients` - Create recipes from pantry items
- `suggestSubstitution` - Ingredient alternative recommendations
- `createFitnessGoalTool` - Structured goal creation
- `updateStructuredGoalTool` - Goal progress updates

## Vision-Powered Features

### Meal Logging from Photos
1. User sends a meal photo to the AI agent
2. GPT-4 Vision analyzes image to identify food items and portions
3. Agent uses `logMealPreview` with extracted data to calculate nutrition
4. User confirms and meal is logged with complete nutritional breakdown

**Example:** "Here's my breakfast" (uploads photo) → Agent: "I see scrambled eggs (2 eggs), whole wheat toast (2 slices), and bacon (3 strips). Total: 485 calories, 28g protein. Should I log this?"

### Ingredient Extraction from Images
1. User uploads receipt, packaging, or ingredient list photo
2. `/api/extract-ingredients` endpoint uses `generateObject()` with GPT-4o
3. AI extracts ingredient names, quantities, units with confidence scores
4. Structured data returned with automatic unit normalization

**Features:**
- HEIC to JPEG automatic conversion
- Confidence scoring (0-1 scale) per ingredient
- Plural to singular normalization ("tomatoes" → "tomato")
- Image type detection (receipt, packaging, ingredient list)
- Graceful degradation on extraction failure

**Implementation:** `app/api/extract-ingredients/route.ts` + `components/ingredient/ingredient-upload.tsx`

## Database Schema

PostgreSQL via Supabase with 15+ tables:

**Core Tables:**
- `user_profiles` - Extended user information with dietary preferences
- `conversations` - Chat conversation threads
- `messages` - Chat messages with tool calls and sources

**Content Management:**
- `saved_recipes` - User recipe library with nutrition data
- `ingredients` - Pantry inventory with expiration tracking
- `ingredient_substitutions` - Substitution database
- `user_substitution_preferences` - User-specific substitution rules

**Fitness & Health:**
- `exercises` - 100+ exercise database
- `workout_logs` - Exercise session tracking
- `workout_plans` - Saved workout routines
- `meal_logs` - Food intake tracking
- `calorie_tracking` - Daily nutrition aggregates
- `health_metrics` - Body composition history
- `fitness_goals` - Structured goal tracking
- `progress_snapshots` - Progress photo timeline

**System:**
- `feedback` - User feedback with admin management

**Security:** Row Level Security (RLS) policies on all tables, JSONB columns for flexible data, cascade deletes, automatic timestamps.

## Project Structure

```
FF15/
├── app/                           # Next.js App Router
│   ├── api/
│   │   ├── chat/route.ts         # Main orchestrator endpoint
│   │   ├── extract-ingredients/  # Vision-based extraction
│   │   ├── nutrition/            # Nutrition endpoints
│   │   ├── admin/                # Admin endpoints
│   │   └── feedback/             # Feedback system
│   ├── (pages)/
│   │   ├── page.tsx              # Landing page
│   │   ├── simple-agent/         # Main FF Coach chat
│   │   ├── dashboard/            # Health & fitness overview
│   │   ├── recipes/              # Recipe library
│   │   ├── workouts/             # Workout management
│   │   ├── nutrition/            # Nutrition tracking
│   │   ├── ingredients/          # Pantry management
│   │   └── profile/              # User preferences
│   └── layout.tsx                # Root layout with navbar
├── components/
│   ├── agent/
│   │   ├── subagents/            # 9 specialized subagents
│   │   ├── tools/                # 27 AI tool implementations
│   │   ├── orchestrator-prompt.ts
│   │   └── prompt.ts
│   ├── ai-elements/              # Chat UI components
│   ├── chat/                     # Chat interface
│   ├── ui/                       # shadcn/ui components
│   └── [features]/               # Feature-specific components
├── lib/
│   ├── supabase/                 # Database client utilities
│   ├── nutrition/                # USDA API, unit conversion
│   └── retrieval/                # Vectorize RAG service
├── SQL/                          # Database migrations
└── types/                        # TypeScript definitions
```

## Setup Instructions

### Prerequisites
- Node.js 19+ and pnpm
- Supabase account (free tier works)
- OpenAI API key with GPT-5 and GPT-4o access

### Installation

```bash
# Clone repository
git clone <repository-url>
cd FF15

# Install dependencies
pnpm install
```

### Database Setup

1. Create a new project at [supabase.com](https://supabase.com)
2. Run SQL migration files in order via Supabase SQL Editor:
   ```
   SQL/supabase-schema.sql                    # Main schema
   SQL/supabase-exercises-enhancement.sql     # Exercise database
   SQL/supabase-substitutions-seed.sql        # Substitution data
   SQL/supabase-nutrition-migration.sql       # Nutrition tables
   SQL/supabase-feedback-setup.sql            # Feedback system
   SQL/supabase-admin-setup.sql               # Admin features
   ```

### Environment Configuration

Create `.env.local`:

```bash
# Supabase (Required)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# OpenAI (Required)
OPENAI_API_KEY=sk-your-openai-api-key

# Vectorize RAG (Optional)
VECTORIZE_ACCESS_TOKEN=your_vectorize_token
VECTORIZE_ORG_ID=your_org_id
VECTORIZE_PIPELINE_ID=your_pipeline_id

# MCP Tools (Optional)
FIRECRAWL_API_KEY=your_firecrawl_key

# Admin Notifications (Optional)
RESEND_API_KEY=your_resend_api_key
ADMIN_EMAIL=admin@yourdomain.com
```

### Development

```bash
# Start development server (with Turbopack)
pnpm dev

# Build for production
pnpm build

# Start production server
pnpm start

# Type checking (run before commits)
pnpm tsc --noEmit
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

## Application Routes

| Route | Purpose | Auth Required |
|-------|---------|--------------|
| `/` | Landing page with feature overview | No |
| `/simple-agent` | Main FF Coach AI chat interface | No* |
| `/dashboard` | Health & fitness analytics dashboard | Yes |
| `/recipes` | Recipe library with search and filters | Yes |
| `/workouts` | Workout management and history | Yes |
| `/nutrition` | Nutrition tracking and meal logs | Yes |
| `/ingredients` | Pantry inventory management | Yes |
| `/profile` | User preferences and settings | Yes |
| `/chat-history` | Conversation history | Yes |
| `/feedback` | Submit feedback and view history | No |
| `/admin/feedback` | Admin feedback dashboard | Yes (Admin) |
| `/login` | User authentication | No |
| `/signup` | User registration | No |

*Chat available to all users but features limited without authentication

## Key Commands (from CLAUDE.md)

```bash
# Development
pnpm dev              # Start dev server with Turbopack
pnpm build            # Build production app
pnpm start            # Start production server
pnpm tsc --noEmit     # Type check without emit

# Database (via Supabase dashboard)
# - SQL Editor for running migrations
# - Database > Tables for schema inspection
# - Authentication > Users for user management
```

## Architecture Highlights

### Preview-and-Confirm Pattern
Data-modifying operations use a two-step process:
1. **Preview tool** - Shows what will be changed (e.g., `logMealPreview`)
2. **Confirm tool** - Executes the change (e.g., `confirmMealLog`)

This allows users to review AI-extracted data before persisting to database.

### Streaming Architecture
- `streamText()` returns token-by-token responses
- Tool execution visible in real-time via message parts
- Source citations and tool results streamed automatically
- `useChat` hook handles streaming on client

### Security Model
- JWT-based authentication via Supabase Auth
- Row Level Security (RLS) on all tables
- User data isolated by `user_id` foreign keys
- API routes validate authentication before operations
- Admin-only routes protected by role checks

### Message Structure
Messages use parts array, not simple content string:
```typescript
{
  parts: [
    { type: 'text', content: 'Here is your workout plan...' },
    { type: 'tool', toolName: 'recommendWorkout', input: {...}, result: {...} },
    { type: 'source-url', url: '...', title: '...' }
  ]
}
```

## Contributing

### Development Guidelines
1. Read [AI SDK documentation](https://ai-sdk.dev/) before implementing AI features
2. Follow established multi-agent architecture patterns in `/components/agent`
3. Use preview-and-confirm for all data-modifying tools
4. Run `pnpm tsc --noEmit` before committing to ensure type safety
5. Test authentication flows and RLS policies thoroughly
6. Add logging to tools for debugging: `console.log('🔧 Tool called with...')`

### Adding New Features

**New AI Tool:**
1. Create tool file in `/components/agent/tools/`
2. Use `tool()` function from AI SDK with Zod schema
3. Implement preview-and-confirm if data-modifying
4. Export from `/components/agent/tools/index.ts`
5. Add to appropriate subagent tool list

**New Subagent:**
1. Create definition in `/components/agent/subagents/`
2. Define clear description for automatic invocation
3. Specify tools accessible to subagent
4. Export from `/components/agent/subagents/index.ts`

**New Page:**
1. Create route in `/app/[page-name]/`
2. Add server component with auth check if needed
3. Create client component for interactive features
4. Add route to navbar in `/components/layout/navbar.tsx`

## Resources

**Documentation:**
- [Next.js 15 Docs](https://nextjs.org/docs)
- [AI SDK 5 Reference](https://ai-sdk.dev/)
- [Supabase Docs](https://supabase.com/docs)
- [shadcn/ui Components](https://ui.shadcn.com/)

**AI SDK Guides:**
- [Tools & Tool Calling](https://ai-sdk.dev/docs/ai-sdk-core/tools-and-tool-calling)
- [Streaming Data](https://ai-sdk.dev/docs/ai-sdk-ui/streaming-data)
- [Generative UI](https://ai-sdk.dev/docs/ai-sdk-ui/generative-user-interfaces)
- [useChat Hook](https://ai-sdk.dev/docs/reference/ai-sdk-ui/use-chat)

**Agent Architecture:**
- [Subagents Guide](https://docs.claude.com/en/api/agent-sdk/subagents)
- [Context Editing](https://docs.claude.com/en/docs/build-with-claude/context-editing)
- [Manual Agent Loop Cookbook](https://ai-sdk.dev/cookbook/node/manual-agent-loop)

## License

To be determined
