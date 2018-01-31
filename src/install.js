'use strict'

const fs = require('fs-extra')
const axios = require('axios')
const decompress = require('decompress')

const integrations = require('../integrations.json')

const releaseURL = (repo) => `https://api.github.com/repos/${repo}/releases/latest`

exports.integration = (name, provider) => {
  const repo = integrations[name]
  if (!repo) return Promise.reject(new Error(`Invalid integration name: ${name}`))
  if (!repo.providers.includes(provider)) return Promise.reject(new Error(`Invalid integration provider: ${provider}`))

  const zipFile = `${name}.zip`
  let folderName = ''
  return axios.get(releaseURL(repo.github))
    .then(({ data }) => data.zipball_url)
    .then((downloadUrl) => axios.get(downloadUrl, { responseType: 'stream' }))
    .then((res) => {
      return new Promise((resolve, reject) => {
        res.data.pipe(fs.createWriteStream(zipFile))
          .on('finish', resolve)
          .on('error', reject)
      })
    })
    .then(() => decompress(zipFile, '.'))
    .then((res) => {
      folderName = res[0].path
      return fs.copy(`${folderName}/${provider}`, `${name}`, { dereference: true })
    })
    .then(() => {
      return fs.remove(zipFile).then(() => fs.remove(folderName))
    })
}

exports.list = () => {
  console.log()
  console.log('  Integrations available to install')
  console.log()
  Object.keys(integrations).forEach((key) => {
    const item = integrations[key]
    const tabs = key.length < 14 ? '\t\t' : '\t'
    console.log(`  ${key}${tabs}${item.description}`)
  })
  console.log()
}
