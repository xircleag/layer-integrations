'use strict'

const fs = require('fs')
const yaml = require('js-yaml')

try {
  exports.manifest = yaml.safeLoad(fs.readFileSync('./layer_manifest.yml', 'utf8'))
} catch (err) {
  error('layer_manifest.yml', err)
}

try {
  exports.serverless = yaml.safeLoad(fs.readFileSync('./serverless.yml', 'utf8'))
} catch (err) {
  error('serverless.yml', err)
}

function error (file, err) {
  if (err.code === 'ENOENT') {
    console.log()
    console.error(`  Manifest file "${file}" not found`)
    console.error('  Make sure you are running this command inside layer integration directory')
    console.log()
    process.exit(1)
  } else {
    console.log()
    console.error(`  YAML Error inside "${file}"`)
    console.log()
    console.error(`  ${err.message}`)
    console.log()
    process.exit(1)
  }
}
