/**
 * DeepSeek API for document classification: category, sensitivity, GDPR risk, tags.
 * Set DEEPSEEK_API_KEY in .env. Uses OpenAI-compatible chat completions.
 */

const API_BASE = "https://api.deepseek.com";
const MODEL = "deepseek-chat";

export type ClassificationResult = {
  category?: string;
  sensitivity?: string;
  gdprRisk?: "UNKNOWN" | "NO_PII_DETECTED" | "POSSIBLE_PII" | "CONFIRMED_PII";
  tags?: Array<{ key: string; value: string }>;
};

export async function classifyDocument(options: {
  fileName: string;
  mimeType?: string | null;
  textSnippet?: string;
}): Promise<ClassificationResult | null> {
  const key = process.env.DEEPSEEK_API_KEY?.trim();
  if (!key) return null;

  const prompt = `Classify this document for an enterprise file system.
Filename: ${options.fileName}
MIME type: ${options.mimeType ?? "unknown"}
${options.textSnippet ? `Text snippet (first 2000 chars):\n${options.textSnippet.slice(0, 2000)}` : ""}

Respond with a JSON object only, no markdown:
{
  "category": "one of: HR, Legal, Finance, Marketing, IT, General, Other",
  "sensitivity": "one of: Public, Internal, Confidential, Secret",
  "gdprRisk": "one of: UNKNOWN, NO_PII_DETECTED, POSSIBLE_PII, CONFIRMED_PII",
  "tags": [{"key": "domain", "value": "short label"}, ...]
}`;

  try {
    const res = await fetch(`${API_BASE}/v1/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [{ role: "user", content: prompt }],
        max_tokens: 500,
        temperature: 0.2,
      }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const content = data.choices?.[0]?.message?.content?.trim();
    if (!content) return null;
    const parsed = JSON.parse(content) as ClassificationResult;
    return parsed;
  } catch {
    return null;
  }
}
