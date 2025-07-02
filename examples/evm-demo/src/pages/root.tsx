import { type Component, Show, createSignal, from, onMount } from 'solid-js'
import { Navigate, useNavigate, useSearchParams } from '@solidjs/router'
import toast from 'solid-toast'
import { connectSmartWalletWithPasskey } from '../passkey/webauthn'
import { passkeyWalletAddress, setPasskeyWalletAddress } from '../passkey/store'
import { cardId, updateCardId, updateCampaign, campaign } from '../card/store'
import { BACKEND_URL } from '../constant'

export const Root: Component = () => {
  const [connectWalletLoading, setConnectWalletLoading] = createSignal(false)
  const [newWalletLoading, setNewWalletIsLoading] = createSignal(false)
  const navi = useNavigate()
  const [searchParams] = useSearchParams()
  const [campaign, setCampaign] = createSignal('')

  onMount(async () => {
    updateCardId(searchParams)
    updateCampaign(searchParams)
  })

  async function connectWallet(makeNew = false) {
    makeNew ? setNewWalletIsLoading(true) : setConnectWalletLoading(true)
    try {
      const passkeyWalletData = await connectSmartWalletWithPasskey(makeNew)
      setPasskeyWalletAddress({ address: passkeyWalletData.address })
    } catch (error) {
      console.log(error)
      toast.error('Failed to connect Passkey wallet')
    } finally {
      makeNew ? setNewWalletIsLoading(false) : setConnectWalletLoading(false)
    }
  }

  /*
          <button class="btn btn-wide mt-8 btn-error" onClick={handleTestPass}>
          Do Not Press!
        </button>
        */

  return (
    <Show
      when={!passkeyWalletAddress.address || !cardId()}
      fallback={<Navigate href="/home" />}>
      <section class="justify-center flex-col flex">
        {cardId() ? (
          <>
            <div class="text-center mb-8">
              <h2 class="text-2xl font-bold">
                {campaign()
                  ? `Collect ${campaign()} card of ${cardId()}`
                  : 'Connect Wallet'}
              </h2>
            </div>
            <button
              class="btn btn-wide mt-8 mx-auto"
              classList={{ loading: newWalletLoading() }}
              onClick={() => connectWallet(true)}>
              Create new PassKey
            </button>
            <button
              class="btn btn-wide mt-8 mx-auto"
              classList={{ loading: connectWalletLoading() }}
              onClick={() => connectWallet()}>
              Connect Existing PassKey
            </button>
          </>
        ) : (
          <div class="text-center mb-8">
            <h2 class="text-2xl font-bold">
              Please use correct URL with campaign and card id
            </h2>
          </div>
        )}
      </section>
    </Show>
  )
}
