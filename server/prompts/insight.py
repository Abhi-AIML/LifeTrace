def build_insight_prompt(answers: list, rag_context: list = None) -> str:
    formatted_qa = []
    for i, a in enumerate(answers):
        role = a.get("role", "user")
        content = a.get("content", "")
        speaker = "User" if role == "user" else "LifeTrace"
        formatted_qa.append(f"{speaker}: {content}")
        
    answers_str = "\n\n".join(formatted_qa)

    # Build RAG context section if we have semantically retrieved snippets
    rag_section = ""
    if rag_context:
        rag_lines = []
        for item in rag_context:
            text = item.get("text", "").strip()
            chapter = item.get("chapter", "")
            if text:
                rag_lines.append(f"  - [Chapter {chapter}] {text}")
        if rag_lines:
            rag_section = f"""
SEMANTICALLY RETRIEVED KEY PASSAGES (high-signal excerpts ranked by relevance):
{chr(10).join(rag_lines)}

Use these passages as additional evidence when scoring the fingerprint and writing insights.
"""

    return f"""
You are LifeTrace's pattern analysis engine. You have conducted a behavioral life history 
interview. Analyze the answers below and find genuine, non-obvious correlations between 
this person's behavioral history and their health signals.

INTERVIEW ANSWERS:
{answers_str}
{rag_section}
Return ONLY valid JSON. No markdown, no explanation, just the JSON object:

{{
  "timeline_events": [
    {{ "year": 2019, "event": "Short label", "type": "transition|health|social|general" }}
  ],
  "fingerprint_scores": {{
    "stress_resilience": 0-100,
    "social_connectivity": 0-100,
    "somatic_awareness": 0-100,
    "life_stability": 0-100,
    "recovery_capacity": 0-100,
    "transition_adaptability": 0-100
  }},
  "dominant_pattern": "One sentence describing their core behavioral health archetype",
  "primary_vulnerability": "One sentence about their single biggest hidden risk pattern",
  "insights": [
    {{
      "headline": "Short specific pattern headline (max 8 words)",
      "explanation": "Two sentences grounded in what they specifically said.",
      "confidence": "strong|emerging"
    }}
  ],
  "interventions": [
    "Specific recommendation 1 — matched to their coping style",
    "Specific recommendation 2",
    "Specific recommendation 3",
    "Specific recommendation 4"
  ]
}}

Rules:
- Every insight must reference something specific the user said
- Interventions must match their coping style — not generic advice
- Never diagnose. Use words: patterns, signals, tendencies, indicators
- Score fingerprint dimensions analytically and honestly
- Extract 3-6 timeline events from what they mentioned
- Generate exactly 3 insights and exactly 4 interventions
- Return ONLY the JSON. Nothing else.
"""

