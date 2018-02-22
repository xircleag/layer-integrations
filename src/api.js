'use strict'

const axios = require('axios')

const pkg = require('../package.json')

const { toUUID } = require('./utils')
const state = require('./state')
const { manifest, serverless } = require('./config')

const dashboard = axios.create({
  baseURL: process.env.DASHBOARD_API || 'https://api.layer.com/dashboard/',
  headers: {
    'accept': 'application/vnd.layer+json; version=1.0',
    'user-agent': `${pkg.name}/${pkg.version} ${serverless.service}/${manifest.version} (${manifest.provider})`
  },
  timeout: 6000
})

const webhooks = axios.create({
  baseURL: process.env.LAYER_API || 'https://api.layer.com/',
  headers: {
    'accept': 'application/vnd.layer.webhooks+json; version=2.0'
  },
  timeout: 6000
})

exports.authenticate = (payload) => {
  return dashboard.post('sessions', payload)
    .then(({ data }) => {
      dashboard.defaults.headers.common['Authorization'] = `Bearer ${data.session_token}`
      return data
    })
}

exports.getOrgs = () => {
  return dashboard.get('organizations')
    .then(({ data }) => data)
}

exports.getApps = () => {
  return dashboard.get(`organizations/${state.org.slug}/apps`)
    .then(({ data }) => data)
}

exports.getAppUUID = () => {
  return dashboard.get(`organizations/${state.org.slug}/apps/${state.app.slug}/${state.appEnv}/uuid`)
    .then(({ data }) => `layer:///apps/${state.appEnv}/${data[state.appEnv]}`)
}

exports.createSAPIToken = () => {
  const payload = {
    name: `${manifest.name} [${manifest.provider}]`
  }
  return dashboard.post(`organizations/${state.org.slug}/apps/${state.app.slug}/${state.appEnv}/server-tokens`, payload)
    .then(({ data }) => data)
}

const WEBHOOK_DELAY = 3000
const WEBHOOK_RETRIES = 10
const delayPromise = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

exports.provisionWebhook = (targetUrl) => {
  webhooks.defaults.headers.common['Authorization'] = `Bearer ${state.config.api.token}`
  return provisionWebhook(targetUrl, 0)
}

function provisionWebhook (targetUrl, attempts) {
  if (attempts === WEBHOOK_RETRIES) return Promise.reject(new Error('Unable to provision webhook'))

  attempts++
  return getWebhooks()
    .then((webhooks) => {
      const webhook = webhooks.filter((webhook) => webhook.target_url === targetUrl)

      if (webhook.length > 0) {
        if (webhook[0].status === 'active') return Promise.resolve()

        const webhookId = toUUID(webhook[0].id)
        return activateWebhook(webhookId)
          .then(() => delayPromise(WEBHOOK_DELAY))
          .then(() => provisionWebhook(targetUrl, attempts))
      }

      return createWebhook(state.config.webhook.secret, targetUrl)
        .then(() => provisionWebhook(targetUrl, attempts))
    })
}

function createWebhook (secret, target) {
  const payload = {
    target_url: target,
    events: manifest.webhook.events,
    version: '2.0',
    secret
  }
  return webhooks.post(`apps/${toUUID(state.config.app_id)}/webhooks`, payload)
    .then(({ data }) => data)
}
function activateWebhook (webhookId) {
  return webhooks.post(`apps/${toUUID(state.config.app_id)}/webhooks/${webhookId}/activate`)
    .then(({ data }) => data)
}
function getWebhooks () {
  return webhooks.get(`apps/${toUUID(state.config.app_id)}/webhooks`)
    .then(({ data }) => data)
}
