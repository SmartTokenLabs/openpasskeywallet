import { createSignal } from 'solid-js'
import { useNavigate } from '@solidjs/router'
import toast from 'solid-toast'
import { BACKEND_URL } from '../../constant'

export default function WiFiSetup() {
  const [username, setUsername] = createSignal('')
  const [password, setPassword] = createSignal('')
  const [ssid, setSSID] = createSignal('')
  const [wifiPassword, setWifiPassword] = createSignal('')
  const [error, setError] = createSignal('')
  const [isLoading, setIsLoading] = createSignal(false)
  const navi = useNavigate()

  const handleSetup = async (e: Event) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      // Generate a unique ID for this setup request
      const setupId = `XX-wifi-setup-${Math.random().toString(36).substring(2, 11)}`
      let sseResolved = false

      // Promise that resolves when SSE returns success/error
      const ssePromise = new Promise<{ status: string; message?: string }>((resolve, reject) => {
        const evtSource = new EventSource(
          BACKEND_URL + `/api/wifi-setup-callback?id=${setupId}`
        )

        evtSource.addEventListener('message', (event) => {
          try {
            const data = JSON.parse(event.data)
            if (data.status === 'success') {
              sseResolved = true
              evtSource.close()
              resolve(data)
            } else if (data.status === 'error') {
              sseResolved = true
              evtSource.close()
              reject(new Error(data.message || 'WiFi setup failed'))
            }
          } catch (err) {
            evtSource.close()
            reject(err)
          }
        })

        evtSource.addEventListener('error', (event) => {
          if (!sseResolved) {
            evtSource.close()
            reject(new Error('SSE error or timeout'))
          }
        })
      })

      // Timeout promise
      const timeoutPromise = new Promise<{ status: string; message?: string }>((_, reject) =>
        setTimeout(() => reject(new Error('Timeout waiting for WiFi setup response')), 30_000)
      )

      // Send the WiFi setup request
      const res = await fetch('/api/wifi-setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          username: username(), 
          password: password(),
          ssid: ssid(),
          wifiPassword: wifiPassword(),
          setupId: setupId,
          baseUrl: BACKEND_URL
        }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        if (typeof data.message === 'string' && data.message.length > 0) {
          setError(data.message)
        } else {
          setError('Failed to initiate WiFi setup')
        }
        setIsLoading(false)
        return
      }

      toast.success('WiFi setup initiated, please wait...', {
        position: 'bottom-center',
      })

      // Wait for either SSE or timeout
      const result = await Promise.race([ssePromise, timeoutPromise])
      
      if (result.status === 'success') {
        toast.success('WiFi setup completed successfully!', {
          position: 'bottom-center',
        })
        // Navigate to merchant create page or wherever appropriate
        navi('/merchant/create')
      }
    } catch (err: any) {
      const errorMessage = err.message || 'WiFi setup failed'
      setError(errorMessage)
      toast.error(errorMessage, { position: 'bottom-center' })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form class="flex flex-col items-center mt-16" onSubmit={handleSetup}>
      <h2 class="text-2xl mb-4">WiFi Setup</h2>
      
      {/* Merchant Credentials */}
      <div class="w-full max-w-md mb-6">
        <h3 class="text-lg font-semibold mb-3">Merchant Credentials</h3>
        <input
          class="input input-bordered w-full mb-2"
          type="text"
          placeholder="Username"
          value={username()}
          onInput={(e) => setUsername(e.currentTarget.value)}
          required
        />
        <input
          class="input input-bordered w-full mb-2"
          type="password"
          placeholder="Password"
          value={password()}
          onInput={(e) => setPassword(e.currentTarget.value)}
          required
        />
      </div>

      {/* WiFi Network Settings */}
      <div class="w-full max-w-md mb-6">
        <h3 class="text-lg font-semibold mb-3">WiFi Network Settings</h3>
        <input
          class="input input-bordered w-full mb-2"
          type="text"
          placeholder="WiFi Network Name (SSID)"
          value={ssid()}
          onInput={(e) => setSSID(e.currentTarget.value)}
          required
        />
        <input
          class="input input-bordered w-full mb-2"
          type="password"
          placeholder="WiFi Password"
          value={wifiPassword()}
          onInput={(e) => setWifiPassword(e.currentTarget.value)}
          required
        />
      </div>

      <button 
        class="btn btn-primary mb-2 w-full max-w-md" 
        type="submit"
        disabled={isLoading()}
      >
        {isLoading() ? (
          <span class="flex items-center justify-center">
            <span class="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></span>
            Setting up WiFi...
          </span>
        ) : (
          'Setup WiFi'
        )}
      </button>
      
      {error() && <div class="text-red-500 text-center max-w-md">{error()}</div>}
    </form>
  )
}
