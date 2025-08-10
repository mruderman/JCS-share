# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Development
- `npm run dev` - Start development servers (both frontend and backend)
- `npm run dev:frontend` - Start Vite frontend only
- `npm run dev:backend` - Start Convex backend only

### Build & Quality
- `npm run build` - Build the application
- `npm run lint` - Run TypeScript checks and build validation
- `npm run test` - Run Jest tests
- `npm run test:watch` - Run Jest tests in watch mode

### Convex Backend
- `npx convex dev` - Start Convex development server
- `npx convex deploy --prod` - Deploy to production

## Architecture Overview

This is a modern peer review system built with React 19 + Convex, featuring real-time collaboration and automated workflows.

### Tech Stack
- **Frontend**: React 19, TypeScript, Vite, TailwindCSS
- **Backend**: Convex (reactive database + serverless functions)
- **Authentication**: Convex Auth with username/password
- **File Storage**: Convex storage for PDF manuscripts
- **Testing**: Jest with React Testing Library

### Key Components

#### Database Schema (convex/schema.ts)
- **users**: Authentication via Convex Auth
- **userData**: Extended user profiles with roles (author, editor, reviewer)
- **manuscripts**: Submitted papers with metadata and status tracking
- **reviews**: Peer review assignments with deadlines and recommendations
- **articles**: Published papers (separate from manuscripts)
- **proofingTasks**: Editorial proofing workflow
- **roleRequests**: Role elevation requests (author → editor/reviewer)

#### Frontend Structure
- **src/pages/**: Role-based dashboards and main pages
- **src/components/**: Reusable UI components including ScholarMeta
- **src/lib/**: Utility functions and language detection

#### Backend Functions (convex/)
- **Queries**: Data fetching (reactive, real-time)
- **Mutations**: Data modifications (atomic transactions)
- **Actions**: External API calls (OpenAI, email notifications)
- **HTTP Routes**: MCP API endpoints for external integrations
- **Crons**: Automated tasks (overdue review reminders)

### Key Features

#### Workflow States
Manuscripts progress through: submitted → inReview → accepted/rejected → proofing → published

#### Role System
- **Authors**: Submit manuscripts, view reviews
- **Reviewers**: Review assigned manuscripts, provide recommendations
- **Editors**: Manage review process, make editorial decisions, publish articles

#### Scholar Meta Integration
The `ScholarMeta` component automatically generates Google Scholar-compatible metadata for published articles, including citation metadata, language detection, and PDF URLs.

#### HTTP API Endpoints

The project exposes RESTful endpoints at `/api/mcp/` for external integrations. For agent-based interactions, see the [MCP Server documentation](mcp_server/README.md).
### Development Patterns

#### Convex Function Syntax
Always use the new function syntax with explicit args and returns validators:
```typescript
export const exampleQuery = query({
  args: { id: v.id("manuscripts") },
  returns: v.object({ title: v.string() }),
  handler: async (ctx, args) => {
    // Implementation
  },
});
```

#### File Organization
- Public functions in main files (e.g., `convex/manuscripts.ts`)
- Internal functions for sensitive operations
- HTTP routes in `convex/router.ts`
- Database schema in `convex/schema.ts`

#### Testing
- Component tests in `__tests__/` directories
- Jest configuration supports TypeScript and path aliases
- Setup file at `src/setupTests.ts`

### Important Notes

#### Cursor Rules
This project includes comprehensive Convex guidelines in `.cursor/rules/convex_rules.mdc` covering:
- Function syntax and validators
- HTTP endpoint patterns
- Database query patterns
- TypeScript best practices

#### Authentication
Uses Convex Auth with username/password. User data is split between `users` table (auth) and `userData` table (profile/roles).

#### File Storage
PDF manuscripts are stored using Convex storage with `v.id("_storage")` references in the schema.

#### Real-time Updates
All queries are reactive - UI automatically updates when data changes through Convex's real-time sync.

## Deployment Configurations

### Self-Hosted Services
- **Letta ADE Configuration**:
  - Base URL: "https://cyansociety.a.pinggy.link/"
  - Password: "TWIJftq/ufbbxo8w51m/BQ1wBNrZb/JT"

### Self-Hosted Servers
- Our self-hosted Letta server (Hetz) is installed as a dockerized compose setup:
  - SSH access: `ssh root@157.180.34.8`
  - Navigate to Compose directory: `cd Compose-Main`
  - Launch MCP server: `docker compose -f compose.yml -f compose.promptyoself.yml --profile dev up -d --build`

## Documentation References

### Letta Documentation Links
- Letta Doc Links: `/home/cyansam/Insync/mikeruderman@gmail.com/Google-Drive/Cyan_Society_Cloud/Journal-of-Cyan/custom-app/cyan_science_backend/docs/Letta-Doc-Links.md`
- Letta LLMs Full Docs: `/home/cyansam/Insync/mikeruderman@gmail.com/Google-Drive/Cyan_Society_Cloud/Journal-of-Cyan/custom-app/cyan_science_backend/docs/letta-llms-full-docs.md`
- Letta Primer (Recommended Starting Point): `/home/cyansam/Insync/mikeruderman@gmail.com/Google-Drive/Cyan_Society_Cloud/Journal-of-Cyan/custom-app/cyan_science_backend/docs/Letta-Primer.md`

## Tailscale IP Addresses
- **pop-os**: 100.76.47.25 (mikeruderman@, linux)
- **ubuntu-8gb-hetzner**: 100.126.136.121 (mikeruderman@, linux)