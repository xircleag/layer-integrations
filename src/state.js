'use strict'

const { manifest, serverless } = require('./config')

module.exports = {
  session: null,
  org: null,
  app: null,
  appEnv: 'staging',
  config: {
    app_id: null,
    service_name: serverless.service,
    provider: manifest.provider,
    webhook: {
      secret: null,
      events: manifest.webhook.events
    },
    api: {
      token: null,
      permissions: manifest.api.permissions
    }
  }
}
