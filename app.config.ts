import type { ConfigContext, ExpoConfig } from 'expo/config';

/**
 * app.json holds the config; this only adds what must not be committed (the repo is
 * public). Android push needs Firebase's google-services.json: locally it's the
 * git-ignored file in the project root; on EAS it comes from the GOOGLE_SERVICES_JSON
 * file environment variable.
 */
export default ({ config }: ConfigContext): ExpoConfig => ({
  ...(config as ExpoConfig),
  android: {
    ...config.android,
    googleServicesFile: process.env.GOOGLE_SERVICES_JSON ?? './google-services.json',
  },
});
