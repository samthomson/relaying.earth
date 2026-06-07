import { ReactNode } from 'react';
import { z } from 'zod';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { AppContext, type AppConfig, type AppContextType, type RelayMetadata, type BlossomServerMetadata } from '@/contexts/AppContext';

interface AppProviderProps {
  children: ReactNode;
  /** Application storage key */
  storageKey: string;
  /** Default app configuration */
  defaultConfig: AppConfig;
}

// Zod schema for RelayMetadata validation
const RelayMetadataSchema = z.object({
  relays: z.array(z.object({
    url: z.url(),
    read: z.boolean(),
    write: z.boolean(),
  })),
  updatedAt: z.number(),
}) satisfies z.ZodType<RelayMetadata>;

// Zod schema for BlossomServerMetadata validation
const BlossomServerMetadataSchema = z.object({
  servers: z.array(z.url()),
  updatedAt: z.number(),
}) satisfies z.ZodType<BlossomServerMetadata>;

// Zod schema for AppConfig validation
const AppConfigSchema = z.object({
  theme: z.literal('light'),
  relayMetadata: RelayMetadataSchema,
  blossomServerMetadata: BlossomServerMetadataSchema,
  useAppBlossomServers: z.boolean(),
  units: z.enum(['metric', 'imperial']),
}) satisfies z.ZodType<AppConfig>;

export function AppProvider(props: AppProviderProps) {
  const {
    children,
    storageKey,
    defaultConfig,
  } = props;

  // App configuration state with localStorage persistence
  const [rawConfig, setConfig] = useLocalStorage<Partial<AppConfig>>(
    storageKey,
    {},
    {
      serialize: JSON.stringify,
      deserialize: (value: string) => {
        const parsed = JSON.parse(value);
        return AppConfigSchema.partial().parse(parsed);
      }
    }
  );

  // Generic config updater with callback pattern
  const updateConfig = (updater: (currentConfig: Partial<AppConfig>) => Partial<AppConfig>) => {
    setConfig(updater);
  };

  const config = { ...defaultConfig, ...rawConfig };

  const appContextValue: AppContextType = {
    config,
    updateConfig,
  };

  // Apply theme effects to document
  useApplyTheme();

  return (
    <AppContext.Provider value={appContextValue}>
      {children}
    </AppContext.Provider>
  );
}

/**
 * Hook to apply theme changes to the document root
 * Single light theme — no class toggling needed.
 */
function useApplyTheme() {
  // Intentionally minimal: theme is always light.
  // Meta tags are set in index.html; CSS variables handle the rest.
}