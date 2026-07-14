import Anthropic from "@anthropic-ai/sdk"

const client = process.env.ANTHROPIC_API_KEY
  ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  : null

/**
 * Calls Claude with a system prompt + user message and returns the text
 * response, or null if the call fails for any reason (missing key, network,
 * refusal, etc.) so callers can degrade gracefully.
 */
export async function callClaude(
  systemPrompt: string,
  userMessage: string
): Promise<string | null> {
  if (!client) return null

  try {
    const response = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 300,
      system: systemPrompt,
      messages: [{ role: "user", content: userMessage }],
    })

    if (response.stop_reason === "refusal") return null

    const textBlock = response.content.find((block) => block.type === "text")
    return textBlock?.text.trim() ?? null
  } catch {
    return null
  }
}
