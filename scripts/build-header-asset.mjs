import { createHash } from 'node:crypto'
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const SOURCE_DIR = resolve('assets/header-v4')
const OUTPUT = resolve('public/brand-wordmark-option4.png')
const EXPECTED_BYTES = 22596
const EXPECTED_SHA256 = 'a5736434f4c6d6b92ddc6048c14985b65ad605ae6ff19a4744f32799c38d56ab'

const parts = (await readdir(SOURCE_DIR))
  .filter((name) => /^part-\d+\.b64$/.test(name))
  .sort()

if (parts.length !== 6) {
  throw new Error(`Header asset: expected 6 chunks, found ${parts.length}`)
}

const encoded = (await Promise.all(
  parts.map((name) => readFile(resolve(SOURCE_DIR, name), 'utf8')),
)).join('').replace(/\s+/g, '')

const buffer = Buffer.from(encoded, 'base64')
const sha256 = createHash('sha256').update(buffer).digest('hex')

if (buffer.length !== EXPECTED_BYTES) {
  throw new Error(`Header asset byte mismatch: expected ${EXPECTED_BYTES}, got ${buffer.length}`)
}
if (sha256 !== EXPECTED_SHA256) {
  throw new Error(`Header asset checksum mismatch: expected ${EXPECTED_SHA256}, got ${sha256}`)
}

await mkdir(resolve('public'), { recursive: true })
await writeFile(OUTPUT, buffer)
console.log(`Verified header generated: ${OUTPUT} (${buffer.length} bytes, sha256 ${sha256})`)
