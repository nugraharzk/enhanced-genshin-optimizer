import { useDatabases } from '@genshin-optimizer/common/database-ui'
import { ScrollTop, useTitle } from '@genshin-optimizer/common/ui'
import { ArtCharDatabase } from '@genshin-optimizer/gi/db'
import { DatabaseContext } from '@genshin-optimizer/gi/db-ui'
import '@genshin-optimizer/gi/i18n' // import to load translations
import { GOThemeProvider } from '@genshin-optimizer/gi/theme'
import {
  SillyContext,
  SnowContext,
  useSilly,
  useSnow,
} from '@genshin-optimizer/gi/ui'
import { Skeleton, StyledEngineProvider } from '@mui/material'
import type { ComponentType } from 'react'
import { lazy, Suspense, useCallback, useMemo } from 'react'
import { HashRouter, Route, Routes } from 'react-router-dom'
import './App.scss'
import AppShell from './AppShell'
import { recoverableImport } from './chunkRecovery'
import ErrorBoundary from './ErrorBoundary'
import Snow from './Snow'

/**
 * Every route is a separate chunk. If the chunk can't be fetched (server
 * restarted under an open tab, or `build.sh` swapped the hashes), reload
 * instead of crashing ΓÇö see chunkRecovery.ts.
 */
function page(load: () => Promise<{ default: ComponentType<any> }>) {
  return lazy(() => recoverableImport(load))
}

// The local dashboard replaces upstream's page-home (which is a web landing
// page full of cards with no offline value).
const PageHome = page(
  () => import('./Home') as unknown as Promise<{
    default: ComponentType<any>
  }>
)
const PageArtifacts = page(
  () =>
    import('@genshin-optimizer/gi/page-artifacts') as unknown as Promise<{
      default: ComponentType<any>
    }>
)
const PageTools = page(
  () =>
    import('@genshin-optimizer/gi/page-tools') as unknown as Promise<{
      default: ComponentType<any>
    }>
)
const PageSettings = page(
  () =>
    import('@genshin-optimizer/gi/page-settings') as unknown as Promise<{
      default: ComponentType<any>
    }>
)
const PageWeapons = page(
  () =>
    import('@genshin-optimizer/gi/page-weapons') as unknown as Promise<{
      default: ComponentType<any>
    }>
)
const PageArchive = page(
  () =>
    import('@genshin-optimizer/gi/page-archive') as unknown as Promise<{
      default: ComponentType<any>
    }>
)
const PageDocumentation = page(
  () =>
    import('@genshin-optimizer/gi/page-doc') as unknown as Promise<{
      default: ComponentType<any>
    }>
)
const PageScanner = page(
  () =>
    import('@genshin-optimizer/gi/page-scanner') as unknown as Promise<{
      default: ComponentType<any>
    }>
)
const PageCharacters = page(
  () =>
    import('@genshin-optimizer/gi/page-characters') as unknown as Promise<{
      default: ComponentType<any>
    }>
)
const PageTeams = page(
  () =>
    import('@genshin-optimizer/gi/page-teams') as unknown as Promise<{
      default: ComponentType<any>
    }>
)
const PageTeam = page(
  () =>
    import('@genshin-optimizer/gi/page-team') as unknown as Promise<{
      default: ComponentType<any>
    }>
)

function App() {
  const dbIndex = Number.parseInt(localStorage.getItem('dbIndex') || '1')
  const [databases, setDatabases] = useDatabases(
    ArtCharDatabase,
    dbIndex,
    'GONewTabDetection'
  )
  const setDatabase = useCallback(
    (index: number, db: ArtCharDatabase) => {
      const dbs = [...databases]
      dbs[index] = db
      setDatabases(dbs)
    },
    [databases, setDatabases]
  )

  const database = databases[dbIndex - 1]
  const dbContextObj = useMemo(
    () => ({ databases, setDatabases, database, setDatabase }),
    [databases, setDatabases, database, setDatabase]
  )
  const SillyContextObj = useSilly()
  const SnowContextObj = useSnow()
  return (
    <StyledEngineProvider injectFirst>
      {/* https://mui.com/guides/interoperability/#css-injection-order-2 */}
      <GOThemeProvider>
        <SillyContext.Provider value={SillyContextObj}>
          <SnowContext.Provider value={SnowContextObj}>
            <DatabaseContext.Provider value={dbContextObj}>
              <ErrorBoundary>
                <HashRouter basename="/">
                  <AppShell>
                    <Content />
                  </AppShell>
                  <ScrollTop />
                </HashRouter>
              </ErrorBoundary>
            </DatabaseContext.Provider>
          </SnowContext.Provider>
        </SillyContext.Provider>
      </GOThemeProvider>
    </StyledEngineProvider>
  )
}
function Content() {
  useTitle()
  return (
    <>
      <Suspense
        fallback={
          <Skeleton
            variant="rectangular"
            sx={{ width: '100%', height: 1000 }}
          />
        }
      >
        <Routes>
          <Route index element={<PageHome />} />
          <Route path="/artifacts" element={<PageArtifacts />} />
          <Route path="/weapons" element={<PageWeapons />} />
          <Route path="/characters/*" element={<PageCharacters />} />
          <Route path="/teams/*">
            <Route index element={<PageTeams />} />
            <Route path=":teamId/*" element={<PageTeam />} />
          </Route>
          <Route path="/archive/*" element={<PageArchive />} />
          <Route path="/tools" element={<PageTools />} />
          <Route path="/setting" element={<PageSettings />} />
          <Route path="/doc/*" element={<PageDocumentation />} />
          <Route path="/scanner" element={<PageScanner />} />
        </Routes>
      </Suspense>
      <Snow />
    </>
  )
}
export default App
