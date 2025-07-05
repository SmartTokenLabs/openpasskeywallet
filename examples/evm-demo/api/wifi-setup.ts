import type { VercelRequest, VercelResponse } from '@vercel/node'
import { withCORS } from './cors'

async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  const { username, password, ssid, wifiPassword, setupId, baseUrl } =
    req.body || {}
  if (!username || !password || !ssid || !wifiPassword || !setupId) {
    res.status(400).json({
      success: false,
      message:
        'Missing required fields: username, password, ssid, wifiPassword, or setupId',
    })
    return
  }

  try {
    const headers = new Headers()
    headers.append('Content-Type', 'application/json')
    if (process.env.BEARER_TOKEN) {
      headers.append('Authorization', `Bearer ${process.env.BEARER_TOKEN}`)
    }

    // Forward request to backend
    const response = await fetch(`${process.env.WALLET_PASS_URL}/merchant-logins/wifi-setup`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        username,
        password,
        ssid,
        wifiPassword,
        setupId,
        baseUrl,
      }),
    })

    const data = await response.json()
    res.status(response.status).json(data)
  } catch (error: any) {
    console.error('WiFi setup error:', error)
    res.status(500).json({
      success: false,
      message: 'WiFi setup failed',
    })
  }
}

export default withCORS(handler)
