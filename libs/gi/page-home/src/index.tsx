import { CardThemed } from '@genshin-optimizer/common/ui'
import {
  Box,
  CardContent,
  Grid,
  Link,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material'
import { Trans, useTranslation } from 'react-i18next'
import InventoryCard from './InventoryCard'
import QuickLinksCard from './QuickLinksCard'
import ResinCard from './ResinCard'
import TeamCard from './TeamCard'
import VidGuideCard from './VidGuideCard'

/**
 * Web build: the Lootbar affiliate banner and the GitHub-hosted patch-notes
 * fetch are gone — this app talks to nothing but its own origin.
 */
export default function PageHome() {
  const theme = useTheme()
  const lg = useMediaQuery(theme.breakpoints.up('lg'))
  if (lg)
    return (
      <Grid container spacing={2} direction={'row-reverse'}>
        <Grid
          sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}
          size={{
            xs: 12,
            lg: 5,
            xl: 4,
          }}
        >
          <QuickLinksCard />
          <ResinCard />
        </Grid>
        <Grid
          sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}
          size={{
            xs: 12,
            lg: 7,
            xl: 8,
          }}
        >
          <IntroCard />
          <InventoryCard />
          <VidGuideCard />
          <TeamCard />
        </Grid>
      </Grid>
    )
  return (
    <Box
      sx={{
        my: 1,
        display: 'flex',
        flexDirection: 'column',
        gap: 1,
      }}
    >
      <IntroCard />
      <QuickLinksCard />
      <InventoryCard />
      <ResinCard />
      <VidGuideCard />
      <TeamCard />
    </Box>
  )
}

function IntroCard() {
  const { t } = useTranslation('page_home')
  return (
    <CardThemed>
      <CardContent>
        <Typography variant="subtitle1">
          <Trans t={t} i18nKey="intro">
            The <strong>ultimate</strong>{' '}
            <Link
              href="https://genshin.mihoyo.com/"
              target="_blank"
              rel="noreferrer"
            >
              <i>Genshin Impact</i>
            </Link>{' '}
            calculator, GO will keep track of your artifact/weapon/character
            inventory, and help you create the best build based on how you play,
            with what you have.
          </Trans>
        </Typography>
      </CardContent>
    </CardThemed>
  )
}
