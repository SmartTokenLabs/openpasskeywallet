import { Params } from '@solidjs/router'
import { createSignal, Signal } from 'solid-js'
import { BACKEND_URL } from '../constant'

function createStoredSignal(
  key: string,
  defaultValue: string,
  storage = window.localStorage
): Signal<string> {
  const initialValue = storage.getItem(key) || defaultValue

  const [val, setVal] = createSignal(initialValue)

  const setValueAndStore = ((arg) => {
    const v = setVal(arg)
    storage.setItem(key, v)
    return v
  }) as typeof setVal

  return [val, setValueAndStore]
}

export function updateCardId(searchParams: Params) {
  //const marker = searchParams.campaign // Fetch campaign from API
  const cardId = searchParams.card_id
  /*if (marker) {
    setCampaign(marker)
  }*/

  if (cardId) {
    setCardId(cardId)
  }
}

export async function updateCampaign(searchParams: Params) {
  const cardId = searchParams.card_id
  // load from backend
  const data = await fetch(BACKEND_URL + `/api/cardData?cardSlug=${cardId}`)
  if (data.ok) {
    const campaignJson = await data.json()
    setCampaign(campaignJson.cardName)
    setCardColor(campaignJson.cardColor)
  }
}

export const [cardId, setCardId] = createStoredSignal('card_id', '')
export const [campaign, setCampaign] = createStoredSignal('campaign', '')
export const [cardColor, setCardColor] = createStoredSignal('card_color', '')
