'use strict'

const fs = require('fs-extra')
const validator = require('validator')
const ms = require('ms')

exports.validation = {
  'required': (val) => !!val || 'This value is required',
  'text': (val) => validator.isAscii(val) || 'Value must be text',
  'number': (val) => validator.isNumeric(val) || 'Value must be a number',
  'email': (val) => validator.isEmail(val) || 'Invalid email address',
  'ms': (val) => !!ms(val) || 'Invalid time format "<number> hours|days|years"',
  'twofactor': (val) => (validator.isNumeric(val) && val.length === 6) || 'Code must be a 6 digit number'
}

exports.checkRequirements = () => {
  const { manifest } = require('./config')

  switch (manifest.provider) {
    case 'aws':
      if (!process.env.AWS_ACCESS_KEY_ID ||
          !process.env.AWS_SECRET_ACCESS_KEY) {
        console.log()
        console.error('  Missing Amazon AWS Credentials')
        console.log()
        console.log('  Make sure you have all environmental variables set:')
        console.log('  https://serverless.com/framework/docs/providers/aws/guide/credentials/')
        console.log()
        process.exit(1)
      }
      break
    case 'azure':
      if (!process.env.azureSubId ||
          !process.env.azureServicePrincipalTenantId ||
          !process.env.azureServicePrincipalClientId ||
          !process.env.azureServicePrincipalPassword) {
        console.log()
        console.error('  Missing Microsoft Azure Credentials')
        console.log()
        console.log('  Make sure you have all environmental variables set:')
        console.log('  https://serverless.com/framework/docs/providers/azure/guide/credentials/')
        console.log()
      }
      break
  }
}

exports.configExists = () => fs.pathExistsSync('src/layer_config.json')

exports.progressDots = (ui, text) => {
  ui.log.write('')

  let dots = '.'
  ui.updateBottomBar(`  ${text}${dots}`)
  return setInterval(() => {
    dots += '.'
    ui.updateBottomBar(`  ${text}${dots}`)
  }, 3000)
}

exports.toUUID = (id) => {
  return (id || '').replace(/^.*\//, '')
}
