# AI Service

This service owns Python-native model and inference workloads.

It is one component of Tenio's broader agentic layer, but it is not the workflow authority.

Responsibilities:

- OCR / extraction
- claim status classification
- confidence scoring
- evidence summarization
- recovery suggestions

Non-responsibilities:

- product state transitions
- queue state
- routing rules
- SLA policy
- audit ownership

The API and workflow layer remain authoritative for official claim state.

The intended hierarchy is:

- workflow layer decides, routes, assigns, and audits
- agentic execution retrieves, interprets, and proposes

## Local Setup

Create the project-local virtualenv and install dependencies:

```bash
npm run setup:ai
```

Then start the service:

```bash
npm run dev:ai
```
