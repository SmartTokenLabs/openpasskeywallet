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
  const [isDetectingSSID, setIsDetectingSSID] = createSignal(false)
  const navi = useNavigate()

  // Function to paste WiFi SSID from clipboard
  const pasteSSIDFromClipboard = async () => {
    setIsDetectingSSID(true)
    try {
      // Try to get SSID from clipboard if user has copied it
      try {
        const clipboardText = await navigator.clipboard.readText()
        if (
          clipboardText &&
          clipboardText.length > 0 &&
          clipboardText.length < 50
        ) {
          // Check if clipboard content looks like a WiFi SSID
          const ssidPattern = /^[\s\w.-]+$/
          if (ssidPattern.test(clipboardText)) {
            setSSID(clipboardText.trim())
            toast.success('WiFi network name pasted from clipboard!', {
              position: 'bottom-center',
            })
            return
          }
        }
      } catch (clipboardError) {
        console.log('Clipboard access not available:', clipboardError)
      }

      // If clipboard is empty or doesn't contain valid SSID
      toast.error(
        'No valid WiFi network name found in clipboard. Please copy your network name from your device settings first.',
        { position: 'bottom-center' }
      )
    } catch (error) {
      console.log('Could not paste WiFi SSID:', error)
      toast.error(
        'Error accessing clipboard. Please enter the network name manually.',
        {
          position: 'bottom-center',
        }
      )
    } finally {
      setIsDetectingSSID(false)
    }
  }

  const handleSetup = async (e: Event) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      // Generate a unique ID for this setup request
      const setupId = `XX-wifi-setup-${Math.random().toString(36).slice(2, 11)}`

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
          baseUrl: BACKEND_URL,
        }),
      })

      const data = await res.json()

      console.log(`DUMP 1: ${JSON.stringify(data)}`)

      if (!res.ok) {
        if (typeof data.message === 'string' && data.message.length > 0) {
          setError(data.message)
        } else {
          setError('Failed to initiate WiFi setup')
        }
        setIsLoading(false)
        return
      }

      // Check if we got a pass link in the response
      if (data.success && data.link) {
        toast.success('WiFi setup completed! Redirecting to pass card...', {
          position: 'bottom-center',
        })

        console.log(`DUMP: ${JSON.stringify(data)}`)

        // Redirect to the pass link
        window.location.href = data.link
      } else {
        setError('WiFi setup failed - no pass link received')
        toast.error('WiFi setup failed', { position: 'bottom-center' })
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
        <div class="flex gap-2 mb-2">
          <input
            class="input input-bordered flex-1"
            type="text"
            placeholder="WiFi Network Name (SSID)"
            value={ssid()}
            onInput={(e) => setSSID(e.currentTarget.value)}
            required
          />
          <button
            type="button"
            class="btn btn-outline"
            onClick={pasteSSIDFromClipboard}
            disabled={isDetectingSSID()}>
            {isDetectingSSID() ? (
              <span class="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></span>
            ) : (
              'Paste'
            )}
          </button>
        </div>
        <input
          class="input input-bordered w-full mb-2"
          type="password"
          placeholder="WiFi Password"
          value={wifiPassword()}
          onInput={(e) => setWifiPassword(e.currentTarget.value)}
          required
        />
        <div class="text-sm text-gray-500 space-y-1">
          <p>
            💡 <strong>Tip:</strong> Copy your WiFi network name to clipboard,
            then click "Paste"
          </p>
          <p>
            📱 <strong>Mobile:</strong> Settings → Wi-Fi → tap your network name
            → copy
          </p>
          <p>
            💻 <strong>Desktop:</strong> Network settings → Wi-Fi → copy network
            name
          </p>
        </div>
      </div>

      <button
        class="btn btn-primary mb-2 w-full max-w-md"
        type="submit"
        disabled={isLoading()}>
        {isLoading() ? (
          <span class="flex items-center justify-center">
            <span class="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></span>
            Setting up WiFi...
          </span>
        ) : (
          'Setup WiFi'
        )}
      </button>

      {error() && (
        <div class="text-red-500 text-center max-w-md">{error()}</div>
      )}
    </form>
  )
}
