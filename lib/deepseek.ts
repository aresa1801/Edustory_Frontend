/**
 * DeepSeek AI client — server-side only.
 * Uses the OpenAI-compatible chat completions API.
 * Never import this module from client components.
 */

const DEEPSEEK_API_URL = 'https://api.deepseek.com/v1/chat/completions'
const DEEPSEEK_MODEL = 'deepseek-chat'

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface DeepSeekOptions {
  temperature?: number
  max_tokens?: number
  /** Return JSON object (requires a JSON schema in the prompt) */
  json?: boolean
}

/**
 * Call the DeepSeek chat-completions endpoint.
 * Throws on network errors or non-2xx responses.
 */
export async function deepseekChat(
  messages: ChatMessage[],
  options: DeepSeekOptions = {}
): Promise<string> {
  const apiKey = process.env.DEEPSEEK_API_KEY
  if (!apiKey) {
    throw new Error('DEEPSEEK_API_KEY environment variable is not set')
  }

  const body: Record<string, unknown> = {
    model: DEEPSEEK_MODEL,
    messages,
    temperature: options.temperature ?? 0.7,
    max_tokens: options.max_tokens ?? 2048,
  }

  if (options.json) {
    body.response_format = { type: 'json_object' }
  }

  const response = await fetch(DEEPSEEK_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`DeepSeek API error ${response.status}: ${text}`)
  }

  const data = await response.json()
  const content: string = data?.choices?.[0]?.message?.content ?? ''
  return content
}

/**
 * Convenience wrapper that parses the JSON response automatically.
 * The prompt must instruct the model to return a valid JSON object.
 */
export async function deepseekJSON<T>(
  messages: ChatMessage[],
  options: Omit<DeepSeekOptions, 'json'> = {}
): Promise<T> {
  const raw = await deepseekChat(messages, { ...options, json: true })
  return JSON.parse(raw) as T
}
