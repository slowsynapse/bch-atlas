/**
 * Chaingraph GraphQL Client
 *
 * Chaingraph is a GraphQL API for querying Bitcoin Cash blockchain data.
 * Endpoint: https://gql.chaingraph.pat.mn/v1/graphql
 *
 * This client provides methods to query blockchain transactions and extract
 * addresses from Flipstarter assurance contracts.
 */

const CHAINGRAPH_ENDPOINT = 'https://gql.chaingraph.pat.mn/v1/graphql'

export interface ChaingraphResponse<T> {
  data?: T
  errors?: Array<{
    message: string
    extensions?: any
  }>
}

/**
 * Execute a GraphQL query against Chaingraph
 */
export async function queryChain<T>(
  query: string,
  variables?: Record<string, any>
): Promise<T> {
  const response = await fetch(CHAINGRAPH_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query,
      variables,
    }),
  })

  if (!response.ok) {
    throw new Error(`Chaingraph HTTP error: ${response.status}`)
  }

  const json: ChaingraphResponse<T> = await response.json()

  if (json.errors) {
    throw new Error(`Chaingraph GraphQL error: ${json.errors[0].message}`)
  }

  if (!json.data) {
    throw new Error('Chaingraph returned no data')
  }

  return json.data
}

/**
 * Convert hex transaction hash to base64 (Chaingraph uses base64 internally)
 */
export function hexToBase64(hex: string): string {
  const bytes = new Uint8Array(hex.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16)))
  return btoa(String.fromCharCode(...bytes))
}

/**
 * Convert base64 back to hex
 */
export function base64ToHex(base64: string): string {
  const binary = atob(base64)
  return Array.from(binary, char => char.charCodeAt(0).toString(16).padStart(2, '0')).join('')
}
