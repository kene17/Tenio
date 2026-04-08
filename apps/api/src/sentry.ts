import * as Sentry from "@sentry/node";

import { appConfig } from "./config.js";

const sentryEnabled = Boolean(appConfig.sentryDsn);

Sentry.init({
  dsn: appConfig.sentryDsn ?? undefined,
  environment: appConfig.nodeEnv,
  enabled: sentryEnabled
});

export { Sentry, sentryEnabled };
