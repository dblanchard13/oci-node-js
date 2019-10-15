'use strict'

const { Transform, Writable } = require('stream')

const ociRest = require('../../utils/ociRest')
const endpoints = require('../../configs/endpoints')

module.exports = {
  getObject,
  putObject,
}

function getObject(auth, params) {
  return new Promise((resolve, reject) => {

    const stream = new Transform({
      transform: function(chunk, encoding, done) {
        this.push(chunk)
        done()
      }
    })

    get(auth, params, (data, headers) => {
      stream.write(data, null, () => {
        stream.end()
      })
    })

    resolve(stream)
  })
}

function putObject(auth, params, readStream) {
  return new Promise((resolve) => {

    createMultipartUpload(auth, params, createUploadCallback)

    function createUploadCallback(data, headers) {
      params.uploadId = data.uploadId
      params.uploadPartNum = 1
      params.objectName = data.object
      readStream.pipe(writeStream)
    }

    const writeStream = new Writable({
      write: function (chunk, encoding, next) {
        params.body = chunk
        params['Content-Length'] = chunk.length
        uploadPart(auth, params, uploadPartCallback.bind(null, next))
      }
    })

    const partsToCommit = []
    function uploadPartCallback(next, data, { etag }) {
      partsToCommit.push({ partNum: params.uploadPartNum, etag })
      params.uploadPartNum ++
      // If the read stream is no longer readable, then we've read all the
      // file's contents and are good to commit the upload.
      if (!readStream.readable) commitUpload()
      next()
    }

    function commitUpload() {
      delete params['Content-Length']
      params.body = { partsToCommit }
      commitMultipartUpload(auth, params, resolve)
    }

  })
}

function get(auth, params, callback) {
  const possibleHeaders = ['opc-client-request-id', 'if-match', 'if-match-none', 'range']
  const headers = ociRest.buildHeaders( possibleHeaders, params )
  const {
    namespaceName,
    bucketName,
    objectName,
  } = ociRest.getEncodeURIComponents(params, ['namespaceName', 'bucketName', 'objectName'])
  const config = {
    method: 'GET',
    path: `/n/${ namespaceName }/b/${ bucketName }/o/${ objectName }`,
    host: endpoints.objectStore[auth.region],
    headers,
  }

  ociRest.processRequest(auth, config, callback)
}

function createMultipartUpload(auth, params, callback) {
  const possibleHeaders = ['opc-client-request-id', 'if-match', 'if-match-none']
  const headers = ociRest.buildHeaders(possibleHeaders, params)
  const {
    namespaceName,
    bucketName,
  } = ociRest.getEncodeURIComponents(params, ['namespaceName', 'bucketName'])
  const config = {
    method: 'POST',
    path: `/n/${ namespaceName }/b/${ bucketName }/u`,
    host: endpoints.objectStore[auth.region],
    headers,
    body: params.body,
  }

  ociRest.processRequest(auth, config, callback)
}

function uploadPart(auth, params, callback) {
  const possibleHeaders = [
    'opc-client-request-id',
    'if-match',
    'if-match-none',
    'expect',
    'content-length',
    'content-MD5',
  ]
  const possibleQueryStrings = ['uploadId', 'uploadPartNum']
  const headers = ociRest.buildHeaders(possibleHeaders, params, true)
  const queryString = ociRest.buildQueryString(possibleQueryStrings, params)
  const {
    namespaceName,
    bucketName,
    objectName,
  } = ociRest.getEncodeURIComponents(params, ['namespaceName', 'bucketName', 'objectName'])
  const config = {
    method: 'PUT',
    path: `/n/${ namespaceName }/b/${ bucketName }/u/${ objectName }${ queryString }`,
    host: endpoints.objectStore[auth.region],
    headers,
    body: params.body,
  }

  ociRest.processRequest(auth, config, callback)
}

function commitMultipartUpload(auth, params, callback) {
  const possibleHeaders = ['opc-client-request-id', 'if-match', 'if-match-none']
  const possibleQueryStrings = ['uploadId']
  const headers = ociRest.buildHeaders(possibleHeaders, params)
  const queryString = ociRest.buildQueryString(possibleQueryStrings, params)
  const {
    namespaceName,
    bucketName,
    objectName,
  } = ociRest.getEncodeURIComponents(params, ['namespaceName', 'bucketName', 'objectName'])
  const config = {
    method: 'POST',
    path: `/n/${ namespaceName }/b/${ bucketName }/u/${ objectName }${ queryString }`,
    host: endpoints.objectStore[auth.region],
    headers,
    body: params.body,
  }

  ociRest.processRequest(auth, config, callback)
}
