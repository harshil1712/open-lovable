# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Open Lovable is a Next.js application that allows users to chat with AI to build React apps instantly. It creates isolated E2B sandboxes where AI can generate, modify, and execute code in real-time. The app integrates with multiple AI providers (Anthropic, OpenAI, Google, Groq) and uses Firecrawl for web scraping.

## Development Commands

```bash
# Start development server with Turbopack
npm run dev

# Build the application
npm run build

# Start production server
npm start

# Run linting
npm run lint

# Run all tests
npm run test:all

# Run specific test suites
npm run test:integration  # E2B integration tests
npm run test:api         # API endpoint tests  
npm run test:code        # Code execution tests
```

## Core Architecture

### API Layer (`/app/api/`)
The application is built around a comprehensive set of API endpoints that manage sandbox lifecycles:

- **Sandbox Management**: `create-ai-sandbox`, `kill-sandbox`, `sandbox-status`, `sandbox-logs`
- **Code Generation & Application**: `generate-ai-code-stream`, `apply-ai-code-stream`, `apply-ai-code`
- **Package Management**: `detect-and-install-packages`, `install-packages`
- **Development Server Management**: `restart-vite`, `monitor-vite-logs`, `check-vite-errors`
- **File Operations**: `get-sandbox-files`, `create-zip`
- **Web Scraping**: `scrape-url-enhanced`, `scrape-screenshot`
- **Conversation Tracking**: `conversation-state`, `analyze-edit-intent`

### Key Components
- **Main Interface**: `/app/page.tsx` - Primary chat interface with sandbox preview
- **Code Progress Tracking**: `CodeApplicationProgress.tsx` - Real-time code application status
- **Sandbox Preview**: `SandboxPreview.tsx` - Embedded preview of the running sandbox
- **HMR Error Detection**: `HMRErrorDetector.tsx` - Monitors for development server errors

### Type System (`/types/`)
- `conversation.ts` - Conversation state and message tracking
- `sandbox.ts` - Sandbox file management and state
- `file-manifest.ts` - File structure and edit intent analysis

### Core Libraries (`/lib/`)
- `edit-intent-analyzer.ts` - Analyzes user prompts to determine edit intentions
- `file-parser.ts` - Parses and processes file content
- `file-search-executor.ts` - Handles file searching and context gathering
- `context-selector.ts` - Manages conversation context for AI interactions

### Configuration (`/config/`)
The application uses a centralized configuration system in `app.config.ts` with settings for:
- Cloudflare sandbox timeouts and Vite server configuration
- AI model selection and parameters  
- Code application delays and refresh timing
- Package installation options
- File management patterns

## Cloudflare Sandbox Integration

The application creates isolated sandboxes using Cloudflare Sandbox SDK where all code execution happens:
- Sandboxes run on port 5173 (Vite dev server) exposed via preview URLs
- Files are managed through the CF Sandbox filesystem API
- Package installation uses npm within the sandbox environment  
- Real-time logs and process monitoring through Cloudflare edge infrastructure
- Sessions persist across requests using Durable Objects

### Package Detection System
The app includes sophisticated package detection using XML tags in AI responses:
- `<package>` tags for individual packages
- `<packages>` tags for multiple packages
- `<command>` tags for shell command execution
- Automatic import analysis for missing packages

## AI Integration

### Supported Models
Configured in `app.config.ts`:
- OpenAI GPT-5
- Anthropic Claude Sonnet 4
- Google Gemini 2.5 Pro  
- Moonshot Kimi K2 Instruct (default)

### Code Generation Patterns
The AI responds using structured XML format:
```xml
<packages>package-name</packages>
<file path="src/Component.jsx">...</file>
<command>npm run dev</command>
```

## Environment Setup

Required environment variables:
```env
# E2B replaced with Cloudflare Sandbox SDK - no additional API key needed
FIRECRAWL_API_KEY=your_firecrawl_api_key

# At least one AI provider:
ANTHROPIC_API_KEY=your_anthropic_api_key
OPENAI_API_KEY=your_openai_api_key  
GEMINI_API_KEY=your_gemini_api_key
GROQ_API_KEY=your_groq_api_key
```

## Key Development Patterns

### File Operations
- All file operations go through E2B sandbox filesystem
- Files are cached in global state for performance
- File changes trigger Vite HMR automatically

### Error Handling  
- Vite errors are monitored and cached to prevent repetitive issues
- Package installation failures are logged and reported
- Sandbox connection issues trigger automatic reconnection

### State Management
- Global sandbox state management for active connections
- Conversation state tracking for context continuity
- File manifest for intelligent edit targeting

## Testing

Tests are located in `/test/` directory:
- Integration tests verify E2B sandbox functionality
- API tests validate all endpoint responses
- Code execution tests ensure proper file handling and package installation