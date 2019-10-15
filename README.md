#### Installation

```
yarn add oci-node-js
```

OR

```
npm install oci-node-js
```

#### Usage

###### File Download

```

const OCI = require('oci-node-js')

// Returns a read stream of the file with the specified key
function downloadFromOOS(key) {
  const auth = {
    // Tenancy OCID
    tenancyId: 'ocid1.tenancy.oc1..XXXXXXXX',
    // User OCID
    userId: 'ocid1.user.oc1..XXXXXXXX',
    RESTversion: '/20160918',
    region: 'us-phoenix-1',
    // The text of the PEM key, NOT the name of the file
    privateKey: 'TEXT_OF_THE_PEM_FILE'
    keyFingerprint: 'API_KEY_FINGERPRINT',
  }

  const params = {
    namespaceName: 'NAMESPACE_NAME,
    bucketName: 'BUCKET_NAME',
    objectName: key,
  }

  return OCI.objectStore.obj.getObject(auth, params)
}

```

###### File Upload

```

const OCI = require('oci-node-js')

// Takes a file key and a fileReadStream and uploads it to OOS
async function uploadToOOS(key, readStream) {
  const auth = {
    // Tenancy OCID
    tenancyId: 'ocid1.tenancy.oc1..XXXXXXXX',
    // User OCID
    userId: 'ocid1.user.oc1..XXXXXXXX',
    RESTversion: '/20160918',
    region: 'us-phoenix-1',
    // The text of the PEM key, NOT the name of the file
    privateKey: 'TEXT_OF_THE_PEM_FILE'
    keyFingerprint: 'API_KEY_FINGERPRINT',
  }

  const params = {
    namespaceName: 'NAMESPACE_NAME,
    bucketName: 'BUCKET_NAME',
    objectName: key,
    body: {
      object: key,
    },
  }

  return OCI.objectStore.obj.getObject(auth, params)
}

```