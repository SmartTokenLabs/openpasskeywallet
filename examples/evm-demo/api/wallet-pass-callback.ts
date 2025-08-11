import type { VercelRequest, VercelResponse } from '@vercel/node'
import { withCORS } from './cors'

// In-memory storage for pass results (in production, use a database)
const passResults: Record<string, { fileURL: string; timestamp: number }> = {}

async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'POST') {
    // Handle webhook/callback from external service
    const { id, result, signedMessage } = req.body

    if (!id || !result || !result.fileURL) {
      return res
        .status(400)
        .json({ error: 'Missing id, result, or fileURL' })
    }

    console.log(`Pass completed for ID ${id}:`, result)

    // Store the result for the frontend to retrieve
    passResults[id] = {
      fileURL: result.fileURL,
      timestamp: Date.now()
    }

    // Clean up old results (older than 1 hour)
    const oneHourAgo = Date.now() - (60 * 60 * 1000)
    Object.keys(passResults).forEach(key => {
      if (passResults[key].timestamp < oneHourAgo) {
        delete passResults[key]
      }
    })

    return res.status(200).json({ success: true })
  }

  if (req.method === 'GET') {
    // For checking pass status: /api/wallet-pass-callback?id=EXTERNAL_ID
    const { id } = req.query
    if (!id || typeof id !== 'string') {
      return res.status(400).json({ error: 'Missing id in query' })
    }

    const result = passResults[id]
    if (result) {
      // Return the result and clean it up
      delete passResults[id]
      return res.status(200).json({ fileURL: result.fileURL })
    } else {
      return res.status(404).json({ error: 'Pass not ready yet' })
    }
  }

  // Method not allowed
  return res.status(405).json({ error: 'Method not allowed' })
}

export default withCORS(handler)
