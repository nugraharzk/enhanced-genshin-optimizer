import type { FunctionComponent } from 'react'
import type { AdProps } from '../type'

/**
 * Ads are disabled in this build: the web app is fully local, no third-party
 * requests. The props stay so call sites keep type-checking.
 */
export function AdRailSticky(_props: {
  adWidth: number
  dataAdSlot: string
  Ad: FunctionComponent<AdProps>
  isRightRail?: boolean
}) {
  return null
}
