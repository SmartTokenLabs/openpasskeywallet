import { type Component, Show, createSignal, onMount } from 'solid-js'
import { Navigate } from '@solidjs/router'
import toast from 'solid-toast'
import { useAuthData } from '../hooks/localStorage'

interface SmartTapKey {
  id: string
  publicKey: string
  keyType: string
  keyAlgorithm: string
  keyUsage: string
  state: string
  createdAt: string
}

export const SmartTapKeys: Component = () => {
  const [keys, setKeys] = createSignal<SmartTapKey[]>([])
  const [isLoading, setIsLoading] = createSignal(false)
  const { authData } = useAuthData()

  const fetchKeys = async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/smartTapKey/list')
      const data = await response.json()
      if (response.ok) {
        setKeys(data.keys)
      } else {
        toast.error('Failed to fetch keys: ' + data.error)
      }
    } catch (error) {
      toast.error('Error fetching keys')
      console.error(error)
    } finally {
      setIsLoading(false)
    }
  }

  const createNewKey = async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/smartTapKey', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })
      const data = await response.json()
      if (response.ok) {
        toast.success('New key created successfully')
        fetchKeys() // Refresh the list
      } else {
        toast.error('Failed to create key: ' + data.error)
      }
    } catch (error) {
      toast.error('Error creating key')
      console.error(error)
    } finally {
      setIsLoading(false)
    }
  }

  const deactivateKey = async (keyId: string) => {
    try {
      setIsLoading(true)
      const response = await fetch(`/api/smartTapKey/${keyId}/deactivate`, {
        method: 'POST',
      })
      const data = await response.json()
      if (response.ok) {
        toast.success('Key deactivated successfully')
        fetchKeys() // Refresh the list
      } else {
        toast.error('Failed to deactivate key: ' + data.error)
      }
    } catch (error) {
      toast.error('Error deactivating key')
      console.error(error)
    } finally {
      setIsLoading(false)
    }
  }

  onMount(() => {
    fetchKeys()
  })

  return (
    <Show when={authData.ethAddress} fallback={<Navigate href="/" />}>
      <section class="flex-col flex items-center">
        <div class="w-full max-w-4xl">
          <div class="flex justify-between items-center mb-8">
            <h2 class="text-2xl font-bold">Smart Tap Keys</h2>
            <button
              class="btn btn-primary"
              onClick={createNewKey}
              disabled={isLoading()}>
              Create New Key
            </button>
          </div>

          <div class="overflow-x-auto">
            <table class="table w-full">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Type</th>
                  <th>Algorithm</th>
                  <th>Usage</th>
                  <th>State</th>
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {keys().map((key) => (
                  <tr>
                    <td class="font-mono text-sm">{key.id}</td>
                    <td>{key.keyType}</td>
                    <td>{key.keyAlgorithm}</td>
                    <td>{key.keyUsage}</td>
                    <td>
                      <span
                        class={`badge ${
                          key.state === 'ACTIVE'
                            ? 'badge-success'
                            : 'badge-error'
                        }`}>
                        {key.state}
                      </span>
                    </td>
                    <td>{new Date(key.createdAt).toLocaleDateString()}</td>
                    <td>
                      <button
                        class="btn btn-sm btn-error"
                        onClick={() => deactivateKey(key.id)}
                        disabled={key.state !== 'ACTIVE' || isLoading()}>
                        Deactivate
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {keys().length === 0 && !isLoading() && (
            <div class="text-center py-8 text-gray-500">
              No Smart Tap keys found. Create one to get started.
            </div>
          )}

          {isLoading() && (
            <div class="flex justify-center py-8">
              <span class="loading loading-spinner loading-lg"></span>
            </div>
          )}
        </div>
      </section>
    </Show>
  )
}
