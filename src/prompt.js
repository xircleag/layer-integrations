'use strict'

const fs = require('fs')
const inquirer = require('inquirer')
const ui = new inquirer.ui.BottomBar()

const api = require('./api')
const deploy = require('./deploy')
const state = require('./state')
const { validation, configExists, progressDots } = require('./utils')
const { manifest } = require('./config')

ui.log.write('')
ui.log.write(`  Welcome to '${manifest.name}'`)
ui.log.write(`  Serverless Infrastructure Provider: ${manifest.provider}`)

exports.checkExisting = () => {
  if (configExists()) {
    ui.log.write('')
    return inquirer.prompt([
      {
        type: 'confirm',
        name: 'existing',
        default: true,
        message: 'Existing configuration found. Would you like to use it?'
      }
    ]).then(({ existing }) => {
      if (existing) state.config = JSON.parse(fs.readFileSync('src/layer_config.json'))
      return existing
    })
  } else return Promise.resolve(false)
}

exports.login = () => {
  ui.log.write('')
  ui.log.write('  Please login to Layer Dashboard')

  let payload = {}
  return inquirer.prompt([
    {
      type: 'input',
      name: 'email',
      message: 'Enter email',
      validate: validation.email
    },
    {
      type: 'password',
      name: 'password',
      mask: '*',
      message: 'Enter password',
      validate: validation.required
    }
  ])
  .then((res) => {
    payload = res
    return api.authenticate(payload)
  })
  .then((res) => {
    state.session = res.session_token
  })
  .catch((err) => {
    if (err.response && err.response.status === 401) {
      if (err.response.data.twofactor) {
        return inquirer.prompt([
          {
            type: 'input',
            name: 'twofactor',
            message: 'Enter two-factor code',
            validate: validation.twofactor
          }
        ])
        .then((res) => {
          payload.twofactor = res.twofactor
          return api.authenticate(payload)
        })
        .then((res) => {
          state.session = res.session_token
        })
        .catch(() => {
          return Promise.reject(new Error('Invalid two-factor code'))
        })
      }
      ui.log.write('  Invalid email or password. Try again.')
      return exports.login()
    }
  })
}

exports.selectOrganization = () => {
  return api.getOrgs()
    .then((orgs) => {
      return inquirer.prompt([{
        type: 'list',
        name: 'org',
        message: 'Pick your organization:',
        choices: orgs.map((org) => {
          return { name: org.name, value: org }
        }),
        pageSize: 10
      }])
    })
    .then(({ org }) => {
      state.org = org
    })
}

exports.selectApplication = () => {
  return api.getApps()
    .then((apps) => {
      return inquirer.prompt([{
        type: 'list',
        name: 'app',
        message: 'Pick your application:',
        choices: apps.map((app) => {
          return { name: app.name, value: app }
        }),
        pageSize: 24
      }])
    })
    .then(({ app }) => {
      state.app = app
    })
}

exports.selectApplicationEnvironment = () => {
  if (state.org.has_account) {
    return inquirer.prompt([{
      type: 'list',
      name: 'appEnv',
      message: 'Pick your application environment:',
      choices: ['Staging', 'Production']
    }])
    .then(({ appEnv }) => {
      state.appEnv = appEnv.toLowerCase()
    })
  } else return Promise.resolve()
}

exports.getAppID = () => {
  return api.getAppUUID()
    .then((appId) => {
      state.config.app_id = appId
    })
}

exports.webhookSecret = () => {
  return inquirer.prompt([{
    type: 'input',
    name: 'secret',
    message: 'Enter Webhook secret',
    validate: validation.required
  }])
  .then(({ secret }) => {
    state.config.webhook.secret = secret
  })
}

exports.inputs = () => {
  if (!manifest.input || !manifest.input.length) return Promise.resolve()

  return inquirer.prompt(manifest.input.map((item) => {
    return {
      type: 'input',
      name: item.key,
      message: item.name,
      default: item.default,
      validate: item.required ? validation[item.type] : undefined
    }
  }))
  .then((inputs) => {
    state.config = Object.assign(state.config, inputs)
  })
}

exports.pagerduty = () => {
  return inquirer.prompt([
    {
      type: 'input',
      name: 'api_key',
      message: 'PagerDuty API key',
      validate: validation.required
    },
    {
      type: 'input',
      name: 'integration_key',
      message: 'PagerDuty Integration key',
      validate: validation.required
    }
  ])
  .then((input) => {
    state.config.pagerduty = input
  })
}

exports.sentry = () => {
  return inquirer.prompt([
    {
      type: 'input',
      name: 'dsn',
      message: 'Sentry DSN',
      validate: validation.required
    }
  ])
  .then((input) => {
    state.config.sentry = input
  })
}

exports.apiToken = () => {
  return api.createSAPIToken()
    .then((token) => {
      state.config.api.token = token.api_key
    })
}

exports.writeConfig = () => {
  return new Promise((resolve, reject) => {
    if (!state.config.app_id) return reject(new Error('Configuration: Missing app_id'))
    if (!state.config.api.token) return reject(new Error('Configuration: Missing API token'))

    const string = JSON.stringify(state.config, null, 2)
    fs.writeFile('src/layer_config.json', string, (err) => err ? reject(err) : resolve())
  })
}

exports.deploy = () => {
  return deploy(ui)
    .then((targetUrl) => {
      ui.log.write('')
      ui.log.write(`  Serverless integration deployed. Target URL: ${targetUrl}`)

      const progress = progressDots(ui, 'Provisioning Layer Webhook')
      return api.provisionWebhook(targetUrl)
        .then(() => {
          clearInterval(progress)
          ui.updateBottomBar('')
          console.log('  Deployment: DONE')
        })
        .catch((err) => {
          clearInterval(progress)
          ui.updateBottomBar('')
          console.error('  Error:', err.message)
        })
    })
}
