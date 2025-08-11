import * as Sentry from "@sentry/node";

Sentry.init({
  dsn: "https://0b7d7e048c8c91312871957a0fbc8ba4@o4509821848059904.ingest.de.sentry.io/4509821850681424",

  // Setting this option to true will send default PII data to Sentry.
  // For example, automatic IP address collection on events
  sendDefaultPii: true,

  // Performance monitoring
  tracesSampleRate: 1.0,
  
  // Environment
  environment: process.env.NODE_ENV || 'development',
  
  // Release version
  release: process.env.npm_package_version || '0.1.0',
  
  // Enable debug mode in development
  debug: process.env.NODE_ENV === 'development',
  
  // Configure beforeSend to filter sensitive data
  beforeSend(event) {
    // Remove sensitive data from events
    if (event.request?.headers) {
      delete event.request.headers['authorization'];
      delete event.request.headers['cookie'];
    }
    return event;
  }
});

export default Sentry;
