/** Parse model output that may include ```json fences or extra prose. */

export function stripJsonFence(text: string): string {
  const t = text.trim();
  const fence = /^```(?:json)?\s*([\s\S]*?)\s*```$/i.exec(t);
  return fence?.[1] ?? t;
}

function extractJsonObject(text: string): string {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return text.trim();
  return text.slice(start, end + 1).trim();
}

export function jsonParseLenient(raw: string): unknown | null {
  const unfenced = stripJsonFence(raw).trim();
  try {
    return JSON.parse(unfenced);
  } catch {
    try {
      return JSON.parse(extractJsonObject(unfenced));
    } catch {
      return null;
    }
  }
}
