'use strict'

const https = require('https')
const httpSignature = require('http-signature')
const jsSHA = require('jssha')

module.exports = {
  processRequest,
  buildHeaders,
  buildQueryString,
  getEncodeURIComponents,
}

function processRequest(auth, options, callback) {
  // process request body
  let body = options.headers['content-type'] === 'application/x-www-form-urlencoded'
    ? options.body
    : JSON.stringify(options.body)
  delete options.body
  // begin https request
  const request = https.request(options, handleResponse(callback))
  // sing the headers
  sign(auth, request, body)
  // send the body and close the request
  request.write(body === undefined ? '' : body)
  request.end()
}

function sign(auth, request, body) {
  const headersToSign = ['host', 'date', '(request-target)']

  if (['POST','PUT'].includes(request.method.toUpperCase())) {
    body = body || ''
    request.setHeader('content-length', body.length)
    headersToSign.push('content-type', 'content-length')

    if (request.getHeader('content-type') !== 'application/x-www-form-urlencoded') {
      const shaObj = new jsSHA('SHA-256', 'TEXT')
      shaObj.update(body)
      request.setHeader('x-content-sha256', shaObj.getHash('B64'))
      headersToSign.push('x-content-sha256')
    }
  }

  const signingConfig = {
    key: auth.privateKey,
    keyId: `${ auth.tenancyId }/${ auth.userId }/${ auth.keyFingerprint }`,
    headers: headersToSign,
  }
  httpSignature.sign(request, signingConfig)
  const newAuthHeaderValue = request.getHeader('Authorization').replace('Signature ', `Signature version="1",`)
  request.setHeader('Authorization', newAuthHeaderValue)
}

// generates a function to handle the https.request response object
function handleResponse(callback) {
  return function(response) {
    const contentType = response.headers['content-type']
    const buffer = []
    let JSONBody = ''

    response.on('data', function(chunk) { 
      if (contentType === 'application/json') {
        JSONBody += chunk 
      } else if (contentType === 'application/x-www-form-urlencoded') {
        buffer.push(Buffer.from(chunk, 'binary'))
      } else if (contentType === 'application/octet-stream' ) {
        buffer.push(chunk)
      }
    })

    response.on('end', function() {
      if (['application/x-www-form-urlencoded', 'application/octet-stream'].includes(contentType)) {
        const binary = Buffer.concat(buffer)
        callback(binary, response.headers)
      } else if (contentType === 'application/json' && JSONBody !== '' ) {
        callback(JSON.parse(JSONBody), response.headers)
      } else {
        callback({}, response.headers)
      }
    })
  }
}

function buildHeaders(possibleHeaders, options, bString) {
  const headers = {
    'content-type': bString ? 'application/x-www-form-urlencoded' : 'application/json',
    'user-agent': 'Mozilla/5.0',
  }
  for (let i = 0; i < possibleHeaders.length; i++) {
    if ( possibleHeaders[i].toLowerCase() in options ) {
      headers[possibleHeaders[i].toLowerCase()] = options[possibleHeaders[i]]
    }
  }
  return headers
}

function buildQueryString(possibleQuery, options) {
  let query = ''
  for (let i = 0; i < possibleQuery.length; i++) {
    if (possibleQuery[i] in options) {
      query += `${ !query ? '?' : '&' }${ possibleQuery[i] }=${ encodeURIComponent(options[possibleQuery[i]]) }`
    }
  }
  return query
}

function getEncodeURIComponents(componentStore = {}, componentsToEncode = []) {
  const encodedComponents = {}
  componentsToEncode.forEach(componentName => {
    encodedComponents[componentName] = encodeURIComponent(componentStore[componentName])
  })
  return encodedComponents
}
