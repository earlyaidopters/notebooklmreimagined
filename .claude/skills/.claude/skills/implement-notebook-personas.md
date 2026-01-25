# Skill: Implement Notebook Instructions/Personas

Use this skill to implement persistent custom instructions and personas for NotebookLM Reimagined notebooks.

## Overview

Add notebook-level settings that define how the AI should behave:
- Custom instructions that apply to ALL chat messages
- Persona presets (e.g., "Critical Reviewer", "Simple Explainer", "Technical Expert")
- Instructions also apply to generated content (study materials, reports, etc.)

## Codebase Context

### Project Structure
```
frontend/src/
├── components/
│   └── notebook/                    # CREATE: settings components
│       └── notebook-settings.tsx    # New settings panel
├── app/notebooks/[id]/page.tsx      # Add settings trigger
└── lib/api.ts                       # API calls reference

backend/app/
├── routers/
│   ├── notebooks.py                 # MODIFY: settings endpoint
│   ├── chat.py                      # MODIFY: inject instructions
│   ├── study.py                     # MODIFY: inject instructions
│   └── studio.py                    # MODIFY: inject instructions
├── services/gemini.py               # Reference for prompt construction
└── models/schemas.py                # Add settings schema
```

### Database Schema (Already Exists)
```sql
-- notebooks table has settings JSONB column
notebooks:
  - id: uuid
  - settings: jsonb  -- USE THIS! Currently '{}'::jsonb default
```

### Settings Structure to Store
```json
{
  "persona": {
    "enabled": true,
    "name": "Critical Reviewer",
    "instructions": "Always question assumptions. Point out weaknesses in arguments. Be skeptical but constructive.",
    "preset": "critical"  // or "custom" for user-defined
  },
  "preferences": {
    "responseLength": "detailed",  // "concise" | "balanced" | "detailed"
    "tone": "professional",        // "casual" | "professional" | "academic"
    "includeExamples": true,
    "citationStyle": "inline"      // "inline" | "footnote" | "none"
  }
}
```

### Existing Patterns
The `notebooks.py` router already handles settings:
```python
@router.patch("/{notebook_id}", response_model=ApiResponse)
async def update_notebook(
    notebook_id: UUID,
    notebook: NotebookUpdate,  # Has settings: Optional[dict]
    user: dict = Depends(get_current_user),
):
    # Already supports updating settings!
```

## Implementation Plan

### Step 1: Define Persona Presets
Create preset configurations:

```typescript
const PERSONA_PRESETS = {
  critical: {
    name: "Critical Reviewer",
    instructions: "Analyze information skeptically. Question assumptions and point out potential weaknesses or gaps. Be constructive but thorough in your critique.",
    icon: "Shield"
  },
  simple: {
    name: "Simple Explainer",
    instructions: "Explain concepts as if to a beginner. Use simple language, avoid jargon, and provide relatable examples. Break down complex ideas into digestible parts.",
    icon: "Lightbulb"
  },
  technical: {
    name: "Technical Expert",
    instructions: "Provide detailed technical analysis. Use precise terminology, include implementation details, and reference best practices and standards.",
    icon: "Code"
  },
  creative: {
    name: "Creative Thinker",
    instructions: "Think outside the box. Suggest novel approaches, make unexpected connections, and explore unconventional solutions.",
    icon: "Sparkles"
  },
  socratic: {
    name: "Socratic Teacher",
    instructions: "Guide understanding through questions. Instead of giving direct answers, ask probing questions that lead to deeper understanding.",
    icon: "HelpCircle"
  }
}
```

### Step 2: Create Settings Panel Component
File: `frontend/src/components/notebook/notebook-settings.tsx`

Features:
- Preset persona cards (click to select)
- Custom instructions textarea
- Response preferences (length, tone, etc.)
- Preview of how instructions will affect responses
- Save/Cancel buttons

UI Pattern:
```tsx
<Dialog>
  <DialogContent className="max-w-2xl">
    <Tabs>
      <TabsList>
        <TabsTrigger>Persona</TabsTrigger>
        <TabsTrigger>Preferences</TabsTrigger>
      </TabsList>

      <TabsContent value="persona">
        {/* Preset cards grid */}
        {/* Custom instructions textarea */}
      </TabsContent>

      <TabsContent value="preferences">
        {/* Response length slider */}
        {/* Tone selector */}
        {/* Other toggles */}
      </TabsContent>
    </Tabs>
  </DialogContent>
</Dialog>
```

### Step 3: Inject Instructions into Chat
File: `backend/app/routers/chat.py`

Modify `send_message` to:
1. Fetch notebook settings
2. Prepend persona instructions to system prompt
3. Apply preferences to response generation

```python
async def get_notebook_settings(notebook_id: UUID) -> dict:
    supabase = get_supabase_client()
    result = supabase.table("notebooks").select("settings").eq("id", str(notebook_id)).single().execute()
    return result.data.get("settings") or {}

@router.post("", response_model=ApiResponse)
async def send_message(...):
    # Get settings
    settings = await get_notebook_settings(notebook_id)
    persona = settings.get("persona", {})

    # Build system instructions
    system_instructions = ""
    if persona.get("enabled") and persona.get("instructions"):
        system_instructions = f"IMPORTANT - Follow these instructions for all responses:\n{persona['instructions']}\n\n"

    # Pass to Gemini service
    result = await gemini_service.generate_with_context(
        message=chat.message,
        context=context,
        system_instructions=system_instructions,  # Add this parameter
        ...
    )
```

### Step 4: Apply to Study Materials & Studio
Modify these routers similarly:
- `backend/app/routers/study.py` - Inject into flashcard/quiz/guide prompts
- `backend/app/routers/studio.py` - Inject into report/table/slide prompts

### Step 5: Update Gemini Service
File: `backend/app/services/gemini.py`

Ensure `generate_with_context` accepts and uses `system_instructions`:
```python
async def generate_with_context(
    self,
    message: str,
    context: str,
    system_instructions: str = "",  # Add parameter
    ...
):
    full_prompt = f"{system_instructions}{context}\n\nUser: {message}"
    # ... rest of implementation
```

### Step 6: Add Settings Button to UI
File: `frontend/src/app/notebooks/[id]/page.tsx`

Add settings gear icon in header that opens the settings dialog.

## Files to Create/Modify

| File | Action |
|------|--------|
| `frontend/src/components/notebook/notebook-settings.tsx` | CREATE - Settings dialog |
| `frontend/src/app/notebooks/[id]/page.tsx` | MODIFY - Add settings button |
| `backend/app/routers/chat.py` | MODIFY - Inject persona |
| `backend/app/routers/study.py` | MODIFY - Inject persona |
| `backend/app/routers/studio.py` | MODIFY - Inject persona |
| `backend/app/services/gemini.py` | MODIFY - Accept system instructions |

## Files NOT to Touch
- `sources-panel.tsx`
- `three-panel-layout.tsx`
- Database migrations (use existing settings column)
- `export-utils.ts`

## Persona Injection Pattern

For all AI calls, prepend:
```
[NOTEBOOK PERSONA INSTRUCTIONS]
{user's custom instructions}

[ADDITIONAL PREFERENCES]
- Response length: {detailed/concise/balanced}
- Tone: {professional/casual/academic}
- Include examples: {yes/no}

---
[ACTUAL REQUEST FOLLOWS]
```

## Testing Checklist
- [ ] Can select preset persona
- [ ] Can write custom instructions
- [ ] Settings persist after page reload
- [ ] Chat responses reflect persona
- [ ] Study materials reflect persona
- [ ] Studio outputs reflect persona
- [ ] Can disable persona (responses return to default)
- [ ] Settings UI is intuitive
- [ ] Preferences (tone, length) work correctly

## Definition of Done
1. Settings dialog with preset personas and custom instructions
2. Settings saved to notebook.settings JSONB
3. All AI responses incorporate active persona
4. Clear UI feedback showing which persona is active
5. Easy to switch or disable personas
