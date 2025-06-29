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
  const [cardId, setCardId] = createSignal('')

  // Get cardId from URL - moved outside onMount for reactivity
  const urlCardId = searchParams.card_id

  onMount(() => {
    if (urlCardId) {
      setCardId(urlCardId)
      console.log('Root.tsx - set cardId to:', urlCardId)
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
      if (cardId()) params.push(`card_id=${encodeURIComponent(cardId())}`)
      if (params.length > 0) url += '?' + params.join('&')

      navi(url)
    } catch (error) {
      console.log(error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Show
      when={!authData.ethAddress && coinBaseWalletAddresses.length === 0}
      fallback={<Navigate href="/home" />}>
      <section class="justify-center flex-col flex">
        <div class="text-center mb-8">
          <h2 class="text-2xl font-bold">Connect Wallet</h2>
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
