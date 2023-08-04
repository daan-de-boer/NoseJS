# Introduction

## Description

Nose is a web api allowing consumers to send .json files to have them signed using the [JAdES](https://www.etsi.org/deliver/etsi_ts/119100_119199/11918201/01.01.01_60/ts_11918201v010101p.pdf) standard.

## Installation

The installation instructions assume you have node.js and npm installed. If not please install that first.

1. clone the repo
2. cd into the directory you cloned the project in
3. run `npm install` from the command line.

After these steps everything needed should have been installed. However, while the app can be started, trying to sign a json file will fail. The project has been set up that it reads the location of .pfx file and it's associated password from an .env file.

1. Create a `.env` file at the root of the application directory (same place as this readme file)
2. create two variables: `PFX_PASS_CSV` and `SIGNING_CERTIFICATE_ALLOWED_ISSUERS_CSV`. In the `PFX_PASS_CSV` variable (csv string), you need to set the path and password of the .pfx files you want to use. Set an appropriate key for the .pfx file to easily specify what .pfx file should be used in the request. For the `SIGNING_CERTIFICATE_ALLOWED_ISSUERS_CSV` variable you will need to look up what the thumprint is of last certificate of the certificate chain (the root certificate). If verification always fails with what should be a valid signature it could mean the root certificate is not in the certificate chain in the .pfx that was used to sign. In that case try the thumbprint of the second to last certificate in the chain.

To easily reference certificates you can create a folder named "certificates" and put the .pfx files there

Example .env file:

```properties
PFX_PASS_CSV="example_key1,path/to/example1.pfx,example_password1;example_key2,path/to/example2.pfx,example_password2"
SIGNING_CERTIFICATE_ALLOWED_ISSUERS_CSV="hash1,hash2"
```

Do note that the `PFX_PASS_CSV` uses `;` as the primary seperator and `,` to seperate the key, path and password as seen above

Optionally you can also put in `PORT=XXXX` (for example 3200) to set the port number. By default this application uses port 3000.

With those steps done you should now be able to sign files and verify signatures.

### Development

During development, set `NODE_ENV` to `development`. This way the verification process doesn't check if the thumbprint matches

## Running the app

from the root directory:

```bash
# development
$ npm run start

# watch mode
$ npm run start:dev

# production mode
$ npm run start:prod
```

## Test

```bash
# unit tests
$ npm run test

# e2e tests
$ npm run test:e2e

# test coverage
$ npm run test:cov
```

# Contribute

Contributions to Nose are welcome. Here is how you can contribute to Nose:

- Submit bug reports so we can fix them.
- Submit pull request

## Packages used

These are the most important that were used:

- Nest.js
- Node-forge
- Node-rsa
- Jose

For a complete list please look in package.json

## License

Copyright © 2023 SECTOR Orange

Nose is [MIT licensed](./LICENSE.md).
