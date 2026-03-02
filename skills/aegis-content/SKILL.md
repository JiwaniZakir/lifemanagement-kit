---
name: aegis_content
description: "Content strategy, generation, and publishing workflow"
---
# Aegis Content

Content strategy, generation, and publishing workflow. This skill gives agents the ability to research topics, generate thought-leadership posts using LLM + web research, manage a content queue of drafts, ingest content ideas, and publish through the `aegis-social` skill.

## When to Use

Activate this skill when the user asks about:
- Creating or drafting social media content
- Generating thought-leadership posts for LinkedIn or X
- Researching trending topics for content ideas
- Reviewing or editing draft posts in the content queue
- Publishing a draft post
- Adding content ideas and research material
- Content strategy or posting cadence
- What content topics to focus on

This skill depends on `aegis-social` for the actual publishing step.

## API Reference

Base URL: `http://data-api:8000`
All endpoints require: `Authorization: Bearer $DATA_API_TOKEN`
No `/api/v1` prefix -- endpoints are at the root.

### POST /content/generate

Create a content draft record. The OpenClaw agent handles actual generation via LLM + web research.

```
web_fetch("http://data-api:8000/content/generate", {
  "method": "POST",
  "headers": {
    "Authorization": "Bearer $DATA_API_TOKEN",
    "Content-Type": "application/json"
  },
  "body": "{\"platform\": \"linkedin\", \"topic\": \"AI agents in personal productivity\", \"style\": \"thought_leader\", \"user_id\": \"default\"}"
})
```

Request body:
- `platform` (required) -- `"linkedin"` or `"x"`
- `topic` (required) -- the topic or theme for the post. Use `"auto"` for daily rotation from: AI/SWE, productivity, building in public, tech leadership, startup culture, data-driven decisions, dev tools
- `style` (optional) -- `"professional"`, `"casual"`, or `"thought_leader"`
- `user_id` (required) -- user identifier (use `"default"`)

Response shape:
```json
{
  "id": "draft-uuid",
  "content": "The generated post text...",
  "platform": "linkedin",
  "tone": "thought_leader",
  "topic": "AI agents in personal productivity",
  "status": "draft",
  "created_at": "2026-02-27T07:00:00Z"
}
```

### GET /content/drafts

List all draft posts, optionally filtered by platform.

Query parameters:
- `platform` (optional) -- `"linkedin"` or `"x"`

```
web_fetch("http://data-api:8000/content/drafts?platform=linkedin", {
  "headers": {"Authorization": "Bearer $DATA_API_TOKEN"}
})
```

Response shape (array):
```json
[
  {
    "id": "draft-uuid",
    "content": "Draft post text...",
    "platform": "linkedin",
    "tone": "thought_leader",
    "topic": "AI agents",
    "status": "draft",
    "created_at": "2026-02-27T07:00:00Z"
  }
]
```

### GET /content/queue

Returns all queued posts (drafts + scheduled), used by the mobile content view.

```
web_fetch("http://data-api:8000/content/queue", {
  "headers": {"Authorization": "Bearer $DATA_API_TOKEN"}
})
```

### POST /content/publish

Mark a draft as published and create a SocialPost record. Does NOT call LinkedIn/X API directly -- use `aegis-social` skill's `POST /social/post` for actual publishing.

```
web_fetch("http://data-api:8000/content/publish", {
  "method": "POST",
  "headers": {
    "Authorization": "Bearer $DATA_API_TOKEN",
    "Content-Type": "application/json"
  },
  "body": "{\"draft_id\": \"draft-uuid\", \"user_id\": \"default\"}"
})
```

### POST /content/ingest

Store research material or content ideas in PostgreSQL for later use during content generation.

```
web_fetch("http://data-api:8000/content/ingest", {
  "method": "POST",
  "headers": {
    "Authorization": "Bearer $DATA_API_TOKEN",
    "Content-Type": "application/json"
  },
  "body": "{\"user_id\": \"default\", \"source\": \"blog\", \"content\": \"Full article or document text here...\", \"metadata\": {\"title\": \"My Thoughts on AI Agents\"}}"
})
```

Request body:
- `user_id` (required) -- user identifier (use `"default"`)
- `source` (required) -- where this content came from (e.g. `"blog"`, `"article"`, `"manual"`)
- `content` (required) -- the document text to ingest
- `metadata` (optional) -- additional metadata (e.g. `{"title": "..."}`)

## Guidelines

### Content Generation Workflow

The standard workflow for creating and publishing content is:

1. **Research** -- Use `web_search` to find trending topics, recent news, or interesting angles.
2. **Generate** -- Call `POST /content/generate` with the topic, platform, and tone.
3. **Review** -- Present the draft to the user. Let them edit or approve.
4. **Publish** -- Call `POST /content/publish` with the draft ID, or use `aegis-social` skill's `POST /social/post` for direct posting.

NEVER auto-publish without user approval. Always show the draft first.

### Voice and Tone

The user's content brand has three tone options:

**Professional** (`professional`):
- Clear, direct, authoritative.
- Data-backed claims where possible.
- Suitable for industry analysis and technical insights.

**Casual** (`casual`):
- Conversational, relatable.
- Personal anecdotes and "real talk."
- Good for behind-the-scenes and learning-in-public content.

**Thought Leader** (`thought_leader`):
- Bold, opinionated, forward-looking.
- Challenges conventional wisdom.
- Strong opening hook, clear thesis, actionable takeaway.
- This is the default for daily automated posts.

### Content Strategy Principles

1. **Consistency over virality** -- One solid post daily beats sporadic viral attempts.
2. **Teach, do not preach** -- Share what you have learned, not what others should do.
3. **Show your work** -- Building in public resonates. Reference real projects (Aegis itself is good content).
4. **Platform-native** -- Never cross-post identical content. Rewrite for each platform (see `aegis-social` skill).
5. **Engage, do not broadcast** -- End posts with questions. Respond to comments.

### Content Idea Storage

Content ideas and research material are stored in PostgreSQL as ContentDraft records with status `"idea"`. Encourage ingesting:
- Blog posts the user has written
- Articles that inspired them
- Meeting notes with interesting insights
- Project retrospectives
- Industry reports or research papers

Use `POST /content/ingest` to store material. Always include a meaningful `source` and descriptive `metadata` for later reference.

### Topic Research

When the user asks for content ideas:
1. Use `web_search` to find trending topics in AI, engineering, productivity, startups.
2. Cross-reference with the user's knowledge base (check what they have written about before via `GET /content/drafts`).
3. Suggest 3-5 topics with a one-line angle for each.
4. Prioritize topics where the user has genuine experience or unique perspective.

### Iteration on Drafts

When the user wants to improve a draft:
- Ask what specifically they want to change (tone, length, angle, hook).
- Generate a new version via `POST /content/generate` with adjusted parameters.
- Present a side-by-side comparison if helpful.
- The user always has final say on content.

## Examples

### Example 1: Generate a LinkedIn Post

**User:** Write a LinkedIn post about building personal AI agents.

**Agent behavior:**
1. Call `POST /content/generate` with `{"topic": "building personal AI agents", "platform": "linkedin", "tone": "thought_leader"}`.
2. Present the draft for review.

**Response:**
> Here is a draft for LinkedIn:
>
> ---
> Most people are waiting for AI agents to be handed to them by big tech companies.
>
> I decided to build my own.
>
> Over the past month, I built a personal intelligence platform that:
> - Aggregates my calendar, email, and finances into a single morning briefing
> - Tracks my health goals and tells me when I am falling behind on protein
> - Auto-generates thought-leadership content based on my knowledge base
>
> The tools exist today: FastAPI for the backend, Claude for reasoning, PostgreSQL for storage, and a simple cron system to orchestrate it all.
>
> The revelation? Building your own AI agent teaches you more about AI than using someone else's ever will.
>
> What would your personal AI agent do for you?
> ---
>
> Want me to publish this, adjust the tone, or try a different angle?

### Example 2: Content Ideas

**User:** What should I post about this week?

**Agent behavior:**
1. Use `web_search` to check trending AI/engineering topics.
2. Check recent drafts via `GET /content/drafts` to avoid repeats.
3. Suggest fresh angles.

**Response:**
> Here are 5 content ideas for this week, based on what is trending and what you have not covered recently:
>
> 1. **"Why your to-do list is a liability"** -- Contrarian take on how static lists fail. Tie it to how dynamic, context-aware briefings (like Aegis) replace them. Tone: thought_leader.
>
> 2. **"The 3 API calls that replaced my morning routine"** -- Technical but accessible walkthrough. Good for the builder audience. Tone: casual.
>
> 3. **"AI agents are not assistants -- they are systems"** -- Distinction between chatbots and autonomous agents. You have real experience building both. Tone: thought_leader.
>
> 4. **"I track every API call my AI makes (and you should too)"** -- Your LLM budget tracker is genuinely interesting. Cost transparency is trending. Tone: professional.
>
> 5. **"The case against Celery"** -- You literally ripped it out and replaced it with cron agents. That is a strong, opinionated take. Tone: thought_leader.
>
> Want me to draft any of these?

### Example 3: Ingest a Document

**User:** Add this article to my knowledge base: [pastes article text]

**Agent behavior:**
1. Call `POST /content/ingest` with the text, a descriptive title, and the source.
2. Confirm ingestion.

**Response:**
> Done. I have stored "The Future of Personal AI" (source: user article, ~2,400 words) as a content idea. This material will be available for reference during content generation.

## Error Handling

- `401 Unauthorized` -- Bearer token missing or invalid
- `404 Not Found` -- Resource doesn't exist
- `422 Validation Error` -- Invalid request parameters
- `500 Internal Server Error` -- Integration failure; retry after sync
