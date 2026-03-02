---
name: aegis_social
description: "LinkedIn and X posting, engagement tracking, and content search"
---
# Aegis Social

LinkedIn and X (Twitter) posting, engagement tracking, and content search. Covers publishing to social platforms, reviewing post history, checking engagement metrics, and searching X.

## When to Use

Activate when the user asks about: posting to LinkedIn or X, cross-posting content, checking engagement metrics, viewing post history, searching tweets, or getting their X profile info. Also used by `aegis-content` to publish generated posts.

## API Reference

Base URL: `http://data-api:8000` -- All endpoints require `Authorization: Bearer $DATA_API_TOKEN`.
All endpoints are under `/social`.

### POST /social/post

Cross-post to one or more platforms.

```
web_fetch("http://data-api:8000/social/post", {
  "method": "POST",
  "headers": {"Authorization": "Bearer $DATA_API_TOKEN", "Content-Type": "application/json"},
  "body": "{\"platform\": \"linkedin\", \"content\": \"Your post here\", \"media_url\": null}"
})
```

Request body: `platform` (required: `"linkedin"` or `"x"`), `content` (required), `media_url` (optional).

### GET /social/history

Post history across platforms.

Query params: `user_id` (default), `platform` (optional: `"linkedin"` or `"x"`), `limit` (default 20).

```
web_fetch("http://data-api:8000/social/history?user_id=default&platform=linkedin&limit=10", {
  "headers": {"Authorization": "Bearer $DATA_API_TOKEN"}
})
```

### GET /social/engagement

Engagement metrics summary across platforms.

Query params: `user_id` (default), `days` (default 30).

```
web_fetch("http://data-api:8000/social/engagement?user_id=default&days=30", {
  "headers": {"Authorization": "Bearer $DATA_API_TOKEN"}
})
```

### GET /social/x/me

Authenticated X user profile.

```
web_fetch("http://data-api:8000/social/x/me", {
  "headers": {"Authorization": "Bearer $DATA_API_TOKEN"}
})
```

### GET /social/x/search

Search recent tweets on X.

Query params: `query` (required), `max_results` (default 10).

```
web_fetch("http://data-api:8000/social/x/search?query=AI%20engineering&max_results=10", {
  "headers": {"Authorization": "Bearer $DATA_API_TOKEN"}
})
```

## Guidelines

### Platform Formatting

**LinkedIn**: Professional tone. 500-2000 characters. Short paragraphs. Hook -> Story -> Takeaway -> CTA. Hashtags at the end only (3-5).

**X**: Concise, punchy, 280 chars max. No preamble. Opinionated takes perform well. 1-3 hashtags woven in.

### Cross-Posting

NEVER post identical text to both platforms. Rewrite for each:
- LinkedIn version: 3-5x longer with context.
- X version: distill to 280 characters.
- Post LinkedIn first, then X.

### Content Safety

- Verify no PII in post content before publishing.
- Do not post financial data, health metrics, or personal details unless the user explicitly crafted the post.
- If a post seems like private content, confirm before posting.

### Rate Limits

5 posts per hour per platform. If hit, inform the user and suggest a time for the next slot. NEVER auto-retry.
