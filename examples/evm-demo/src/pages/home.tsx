import {
  type Component,
  Show,
  onMount,
  createSignal,
  createMemo,
} from 'solid-js'
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

// Add a signal for pass loading spinner
const [isLoadingPass, setIsLoadingPass] = createSignal(false)

function generatePass(
  campaign: string,
  ethAddress: string,
  cardId: string,
  platform: string
) {
  return async () => {
    setIsLoadingPass(true)
    try {
      const externalId = `${cardId}-${ethAddress}`
      let sseResolved = false

      // Promise that resolves when SSE returns fileURL
      const ssePromise = new Promise((resolve, reject) => {
        const evtSource = new EventSource(
          `/api/wallet-pass-callback?id=${externalId}`
        )

        evtSource.addEventListener('message', (event) => {
          try {
            const data = JSON.parse(event.data)
            if (data.fileURL) {
              sseResolved = true
              evtSource.close()
              resolve(data.fileURL)
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
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Timeout waiting for pass')), 10000)
      )

      const url =
        platform === 'google' ? '/api/jwtToken' : '/api/generatePkpass'

      // Trigger the backend to start the pass creation process
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campaign, ethAddress, cardId }),
      })

      if (!res.ok) {
        toast.error('Error: ' + res.statusText, { position: 'bottom-center' })
        setIsLoadingPass(false)
        return
      }

      toast.success('Pass created successfully, please wait', {
        position: 'bottom-center',
      })

      // Wait for either SSE or timeout
      const fileURL = await Promise.race([ssePromise, timeoutPromise])
      window.location.href = fileURL as string
    } catch (err: any) {
      toast.error(err.message || 'Network error', { position: 'bottom-center' })
    } finally {
      setIsLoadingPass(false)
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

export const Home: Component = () => {
  const location = useLocation()
  const logout = useLogout()
  const { authData } = useAuthData()
  // Get campaign marker from navigation state (passed from root)
  const [searchParams] = useSearchParams()

  // State for fetched campaign data
  const [fetchedCampaign, setFetchedCampaign] = createSignal('')
  const [isLoadingCampaign, setIsLoadingCampaign] = createSignal(false)

  // Try to get params from URL directly as fallback
  const urlParams = new URLSearchParams(window.location.search)
  console.log('Home.tsx - URLSearchParams card_id:', urlParams.get('card_id'))

  const cardId =
    searchParams.card_id ||
    urlParams.get('card_id') ||
    localStorage.getItem('card_id') ||
    ''

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
          console.log('Fetched campaign after set:', fetchedCampaign())
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
  const displayCampaign = createMemo(() => {
    const campaign = fetchedCampaign()
    console.log('Computed display campaign:', campaign)
    return campaign
  })

  function getWalletAddress() {
    return authData.ethAddress || coinBaseWalletAddresses[0]
  }

  const getAndroidPass = generatePass(
    displayCampaign(),
    getWalletAddress(),
    cardId,
    'google'
  )
  const getiOSPass = generatePass(
    displayCampaign(),
    getWalletAddress(),
    cardId,
    'apple'
  )

  const handleClaim = () => {
    if (isLoadingPass()) {
      toast.error('Pass generation in progress, please wait', { position: 'bottom-center' })
      return;
    }
    
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
          {displayCampaign() && (
            <div class="stat-desc mt-2 text-md">
              <span>Campaign: {displayCampaign()}</span>
              {isLoadingCampaign() && (
                <span class="ml-2 inline-block">
                  <div class="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                </span>
              )}
            </div>
          )}
        </div>
        <button class="btn btn-wide mt-8 btn-primary" onClick={handleClaim} disabled={isLoadingPass()}>
          {isLoadingPass() ? (
            <span class="flex items-center"><span class="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></span>Generating Pass...</span>
          ) : (
            'CLAIM'
          )}
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
