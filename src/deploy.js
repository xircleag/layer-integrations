'use strict'

const spawn = require('child_process').spawn

const { progressDots } = require('./utils')
const { manifest, serverless } = require('./config')

const urlParser = {
  // Parse 'serverless deploy' command output to extract URL endpoint
  aws: (output) => {
    if (typeof output !== 'string') return null
    const sub = output.substring(output.indexOf('endpoints:\n') + 11, output.indexOf('functions:\n') - 1)
    return sub.substring(sub.indexOf('https://'), sub.indexOf('\n'))
  },
  azure: () => {
    return `https://${serverless.service}.azurewebsites.net/api/webhook`
  }
}

module.exports = (ui) => {
  const progress = progressDots(ui, 'Packaging and deploying')
  return new Promise((resolve, reject) => {
    const deploy = spawn('npm', ['run', 'deploy'])

    let stdout = ''
    deploy.stdout.on('data', (data) => {
      stdout += data.toString()
    })

    let stderr = ''
    deploy.stderr.on('data', (data) => {
      stderr += data.toString()
    })

    deploy.on('close', (code) => {
      clearInterval(progress)
      ui.updateBottomBar('')

      if (code !== 0) {
        console.error(`Deploy error [${code}]:`, stderr || stdout)
        reject(new Error('Error deploying serverless integration'))
        return
      }

      const parser = urlParser[manifest.provider]
      if (!parser) return reject(new Error(`Unknown provider ${manifest.provider}`))

      resolve(parser(stdout))
    })
  })
}
