import { type Component, Show, createSignal, onMount } from 'solid-js'
import { Navigate, useNavigate, useSearchParams } from '@solidjs/router'
import { useAuthData } from '../hooks/localStorage'
import { connect, initConfig } from '@joyid/evm'
import { EthSepolia } from '../chains'
import toast from 'solid-toast'
import { coinBaseWalletAddresses } from '../coinbase/store'
import { connectCoinbaseWallet } from '../coinbase/wallet'

export const Root: Component = () => {
  const [isLoading, setIsLoading] = createSignal(false)
  const navi = useNavigate()
  const { setAuthData, authData } = useAuthData()
  const [searchParams] = useSearchParams()
  const [campaignMarker, setCampaignMarker] = createSignal('')
  const [cardId, setCardId] = createSignal('')

  onMount(() => {
    // Get campaign marker from URL
    const cardSlug = searchParams.cardSlug
    if (cardSlug) {
      setCardId(cardSlug)
      //now fetch the card data from the api here: /api/cardData/cardSlug
      //cardData is JSON object, we just want to pull the cardName
      //set the campaignMarker to the cardName
    }

    // Initialize with fixed network
    initConfig({
      network: {
        chainId: EthSepolia.chainId,
        name: EthSepolia.name,
      },
    })
  })

  const onConnect = async (wallet: 'JoyID' | 'CoinBase') => {
    setIsLoading(true)
    const cardData = await fetch(`/api/cardData/${cardId()}`)
    const data = await cardData.json()
    setCampaignMarker(data.cardName)
    console.log(data)

    let address = ''
    try {
      if (wallet === 'CoinBase') {
        try {
          await connectCoinbaseWallet()
          if (coinBaseWalletAddresses.length === 0) {
            throw new Error('Please connect wallet')
          }
        } catch (error) {
          toast.error('Please connect wallet')
          setIsLoading(false)
          return
        }

        address = coinBaseWalletAddresses[0]
      } else {
        address = await connect()
        setAuthData({
          ethAddress: address,
          mode: 'popup',
          ...EthSepolia,
        })
      }

      let url = '/home'
      const params = []
      if (campaignMarker())
        params.push(`campaign=${encodeURIComponent(campaignMarker())}`)
      if (cardId()) params.push(`card_id=${encodeURIComponent(cardId())}`)
      if (params.length > 0) url += '?' + params.join('&')
      navi(url)
    } catch (error) {
      console.log(error)
    } finally {
      setIsLoading(false)
    }
  }

  // Test params
  const testCampaign = 'Open Passkey'
  const testEthAddress = '0x1234567890abcdef1234567890abcdef12345670'
  const testCardId = 'open_passkey'

  const testCampaign2 = 'Open Passkey'
  const testEthAddress2 = '0x1234567890abcdef1234567890abcdef123456XX'
  const testCardId2 = 'open_passkey'

  const testEthAddress3 = '0xAa3B07dF07d2a0ed8Bb5fF9c0Fff34Cbf92eDA33'
  const testCardId3 = 'testcase4'

  const generateJWT = useGenerateJWT(testCampaign, testEthAddress, testCardId)
  const downloadPkpass = useDownloadPkpass(
    testCampaign,
    testEthAddress,
    testCardId
  )
  const generateJWT2 = useGenerateJWT(
    testCampaign2,
    testEthAddress2,
    testCardId2
  )
  const downloadPkpass2 = useDownloadPkpass(
    testCampaign2,
    testEthAddress2,
    testCardId2
  )

  const downloadPkpass3 = generatePass(
    testCampaign,
    testEthAddress3,
    testCardId3,
    'apple'
  )

  const generateJWT3 = generatePass(
    testCampaign,
    testEthAddress3,
    testCardId3,
    'google'
  )

  const handleTestPass = () => {
    const os = getMobileOS()
    if (os === 'android') {
      generateJWT()
    } else if (os === 'ios') {
      downloadPkpass()
    } else {
      toast.error('Unsupported device', { position: 'bottom-center' })
    }
  }

  const handleTestPass2 = () => {
    const os = getMobileOS()
    if (os === 'android') {
      generateJWT2()
    } else if (os === 'ios') {
      downloadPkpass2()
    } else {
      toast.error('Unsupported device', { position: 'bottom-center' })
    }
  }

  const handleTestPass3 = () => {
    console.log('handleTestPass3')
    const os = getMobileOS()
    if (os === 'android') {
      generateJWT3()
    } else if (os === 'ios') {
      downloadPkpass3()
    } else {
      toast.error('Unsupported device', { position: 'bottom-center' })
    }
  }

  return (
    <Show
      when={!authData.ethAddress && coinBaseWalletAddresses.length === 0}
      fallback={<Navigate href="/home" />}>
      <section class="justify-center flex-col flex">
        <div class="text-center mb-8">
          <h2 class="text-2xl font-bold">
            {campaignMarker()
              ? `Collect ${campaignMarker()} card`
              : 'Connect Wallet'}
          </h2>
        </div>
        <button
          class="btn btn-wide mt-8"
          classList={{ loading: isLoading() }}
          onClick={() => onConnect('JoyID')}>
          Connect JoyId Wallet
        </button>
        <button
          class="btn btn-wide mt-8"
          classList={{ loading: isLoading() }}
          onClick={() => onConnect('CoinBase')}>
          Connect CoinBase Wallet
        </button>
      </section>
    </Show>
  )
}

function generatePass(
  campaign: string,
  ethAddress: string,
  cardId: string,
  platform: string
) {
  return async () => {
    try {
      const externalId = `${cardId}-${ethAddress}`

      console.log(`External ID: ${externalId}`)

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

      console.log(`URL: ${url}`)

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

function useGenerateJWT(campaign: string, ethAddress: string, cardId: string) {
  return async () => {
    try {
      const res = await fetch('/api/jwtToken', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campaign, ethAddress, cardId }),
      })
      const data = await res.json()
      if (res.ok) {
        window.location.href = `https://pay.google.com/gp/v/save/${data.token}`
      } else {
        toast.error('Error: ' + data.error, { position: 'bottom-center' })
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
