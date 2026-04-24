/**
 * Hyperliquid API Client
 *
 * Low-level client for the Hyperliquid info endpoint.
 * All info queries are unauthenticated POST requests.
 *
 * Endpoint: https://api.hyperliquid.xyz/info
 * Docs: https://hyperliquid.gitbook.io/hyperliquid-docs/for-developers/api/info-endpoint
 */

const HYPERLIQUID_ENDPOINT = 'https://api.hyperliquid.xyz/info'

/**
 * Execute a query against the Hyperliquid info endpoint
 */
export async function queryInfo<T>(body: Record<string, unknown>): Promise<T> {
  const response = await fetch(HYPERLIQUID_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    const text = await response.text().catch(() => '')
    throw new Error(
      `Hyperliquid HTTP error ${response.status}: ${text || response.statusText}`
    )
  }

  const data: T = await response.json()
  return data
}
