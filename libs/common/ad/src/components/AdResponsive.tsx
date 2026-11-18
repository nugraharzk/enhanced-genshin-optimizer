import type { CardBackgroundColor } from '@genshin-optimizer/common/ui'
import type { FunctionComponent } from 'react'
import type { AdProps } from '../type'

/**
 * Ads are disabled in this build: the web app is fully local, no third-party
 * requests. The props stay so call sites keep type-checking.
 */
export function AdResponsive(_props: {
  dataAdSlot: string
  bgt?: CardBackgroundColor
  maxHeight?: number
  Ad: FunctionComponent<AdProps>
}) {
  return null
}
