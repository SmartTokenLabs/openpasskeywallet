import { type Component, Show, onMount, createSignal } from 'solid-js'
import { writeClipboard } from '@solid-primitives/clipboard'
import { Navigate, useLocation } from '@solidjs/router'
import toast from 'solid-toast'
import { useAuthData, useLogout } from '../hooks/localStorage'
import { truncateMiddle } from '../utils'
import { useSearchParams } from '@solidjs/router'
import { coinBaseWalletAddresses } from '../coinbase/store'
import {
  connectCoinbaseWallet,
  disconnectCoinbaseWallet,
} from '../coinbase/wallet'
// import { createQuery } from '@tanstack/solid-query'
// import { formatEther } from 'ethers/lib/utils'
// import { useProvider } from '../hooks/provider'
// import { Chains } from '../chains'
// import { produce } from 'solid-js/store'
// import { type connectCallback } from '@joyid/evm'

//construct a pass JSON

function generatePass(
  campaign: string,
  ethAddress: string,
  cardId: string,
  platform: string
) {
  return async () => {
    try {
      const externalId = `${cardId}-${ethAddress}`

      // Start listening for the SSE event BEFORE triggering the backend
      const evtSource = new EventSource(
        `/api/wallet-pass-callback?id=${externalId}`
      )

      evtSource.addEventListener('message', (event) => {
        try {
          const data = JSON.parse(event.data)
          console.log('SSE message:', data)
          if (data.fileURL) {
            // Redirect to the pass URL
            window.location.href = data.fileURL
            evtSource.close() // Clean up
          }
        } catch (err) {
          console.error('Error parsing SSE data:', err)
        }
      })

      evtSource.addEventListener('error', (event) => {
        console.error('SSE error:', event)
        evtSource.close()
      })

      const url =
        platform === 'google' ? '/api/jwtToken' : '/api/generatePkpass'

      // Now trigger the backend to start the pass creation process
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campaign, ethAddress, cardId }),
      })

      if (res.ok) {
        toast.success('Pass created successfully, please wait', {
          position: 'bottom-center',
        })
      }
      if (!res.ok) {
        toast.error('Error: ' + res.statusText, { position: 'bottom-center' })
        return
      }
    } catch (err) {
      toast.error('Network error', { position: 'bottom-center' })
    }
  }
}

function useDownloadPkpass(
  campaign: string,
  ethAddress: string,
  cardId: string
) {
  return async () => {
    // For iOS/Safari, do a direct POST navigation
    const form = document.createElement('form')
    form.method = 'POST'
    form.action = '/api/generatePkpass'
    form.style.display = 'none'

    const addField = (name: string, value: string) => {
      const input = document.createElement('input')
      input.type = 'hidden'
      input.name = name
      input.value = value
      form.append(input)
    }
    addField('campaign', campaign)
    addField('ethAddress', ethAddress)
    addField('cardId', cardId)

    document.body.append(form)
    form.submit()
    form.remove()
    return
  }
}

function getMobileOS() {
  const userAgent = window.navigator.userAgent || ''
  if (/android/i.test(userAgent)) {
    return 'android'
  }
  if (/iPad|iPhone|iPod/.test(userAgent)) {
    return 'ios'
  }
  return 'other'
}

async function createPassAndListen(
  campaign: string,
  ethAddress: string,
  cardId: string
) {
  // Construct the externalId (should match what your backend expects)
  // Optionally, show a loading indicator while waiting for the SSE event
}

export const Home: Component = () => {
  const location = useLocation()
  const logout = useLogout()
  const { authData } = useAuthData()
  // Get campaign marker from navigation state (passed from root)
  const [searchParams] = useSearchParams()

  // State for fetched campaign data
  const [fetchedCampaign, setFetchedCampaign] = createSignal('')
  const [isLoadingCampaign, setIsLoadingCampaign] = createSignal(false)

  // Debug logging
  console.log('Home.tsx - searchParams:', searchParams)
  console.log('Home.tsx - location.search:', location.search)
  console.log('Home.tsx - window.location.search:', window.location.search)

  // Try to get params from URL directly as fallback
  const urlParams = new URLSearchParams(window.location.search)
  console.log('Home.tsx - URLSearchParams card_id:', urlParams.get('card_id'))

  const cardId =
    searchParams.card_id ||
    urlParams.get('card_id') ||
    localStorage.getItem('card_id') ||
    ''

  // Debug logging
  console.log('Home.tsx - CardId from searchParams:', searchParams.card_id)
  console.log(
    'Home.tsx - CardId from URLSearchParams:',
    urlParams.get('card_id')
  )
  console.log(
    'Home.tsx - CardId from localStorage:',
    localStorage.getItem('card_id')
  )
  console.log('Home.tsx - Final cardId value:', cardId)

  // Function to fetch campaign data from API
  const fetchCampaignData = async (cardSlug: string) => {
    if (!cardSlug) return

    setIsLoadingCampaign(true)
    try {
      const cardData = await fetch(
        `/api/cardData?cardSlug=${encodeURIComponent(cardSlug)}`
      )
      if (cardData.ok) {
        const data = await cardData.json()
        console.log('Fetched card data:', data)
        if (data.cardName) {
          setFetchedCampaign(data.cardName)
        } else {
          setFetchedCampaign('No campaign found')
        }
      } else {
        console.error('Failed to fetch card data:', cardData.status)
      }
    } catch (error) {
      console.error('Error fetching campaign data:', error)
    } finally {
      setIsLoadingCampaign(false)
    }
  }

  // Fetch campaign data when cardId is available
  onMount(() => {
    if (cardId) {
      console.log('Fetching campaign data for cardId:', cardId)
      fetchCampaignData(cardId)
    }
  })

  if (cardId) {
    localStorage.setItem('card_id', cardId)
  }

  // Use fetched campaign data only
  const displayCampaign = fetchedCampaign()

  function getWalletAddress() {
    return authData.ethAddress || coinBaseWalletAddresses[0]
  }

  const getAndroidPass = generatePass(
    displayCampaign,
    getWalletAddress(),
    cardId,
    'google'
  )
  const getiOSPass = generatePass(
    displayCampaign,
    getWalletAddress(),
    cardId,
    'apple'
  )

  const handleClaim = () => {
    const os = getMobileOS()
    if (os === 'android') {
      getAndroidPass()
    } else if (os === 'ios') {
      getiOSPass()
    } else {
      toast.error('Unsupported device', { position: 'bottom-center' })
    }
  }

  // Hard code to Base Sepolia (if you have a config, otherwise use EthSepolia)
  // const chain = Chains['BaseSepolia']

  return (
    <Show
      when={authData.ethAddress || coinBaseWalletAddresses.length > 0}
      fallback={<Navigate href="/" />}>
      <section class="flex-col flex items-center">
        <div class="stat">
          <div class="stat-title">EVM Account</div>
          <div class="stat-value">{truncateMiddle(getWalletAddress())}</div>
          <div class="stat-actions mt-2">
            <button
              class="btn btn-xs btn-success btn-outline"
              onClick={() => {
                writeClipboard(getWalletAddress())
                toast.success('Copied Successfully', {
                  position: 'bottom-center',
                })
              }}>
              Copy Address
            </button>
          </div>
          {displayCampaign && (
            <div class="stat-desc mt-2 text-md">
              <span>Campaign: {displayCampaign}</span>
              {isLoadingCampaign() && (
                <span class="ml-2 text-sm text-gray-500">(Loading...)</span>
              )}
            </div>
          )}
        </div>
        <button class="btn btn-wide mt-8 btn-primary" onClick={handleClaim}>
          CLAIM
        </button>
        <button
          class="btn btn-wide btn-outline mt-8"
          onClick={() => {
            logout()
          }}>
          LOGOUT
        </button>
        {coinBaseWalletAddresses?.length === 0 ? (
          <button
            class="btn btn-wide btn-outline mt-8"
            onClick={() => connectCoinbaseWallet()}>
            Connect Coinbase Wallet
          </button>
        ) : (
          <>
            <div>
              <div class="text-center mt-8">Coinbase Wallets:</div>
              {coinBaseWalletAddresses.map((address) => (
                <p>{address}</p>
              ))}
            </div>
            <button
              class="btn btn-wide btn-outline mt-8"
              onClick={() => disconnectCoinbaseWallet()}>
              Disonnect Coinbase Wallet
            </button>
          </>
        )}
      </section>
    </Show>
  )
}
