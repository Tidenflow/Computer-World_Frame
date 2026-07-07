import { closeSync, createWriteStream, openSync, readSync, statSync } from 'node:fs'
import { mkdir, rename, rm } from 'node:fs/promises'
import path from 'node:path'
import { Readable } from 'node:stream'
import { pipeline } from 'node:stream/promises'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const modelRoot = path.resolve(__dirname, '..', 'public', 'models', 'Xenova', 'multilingual-e5-small')

const assets = [
  {
    path: path.join(modelRoot, 'onnx', 'model_quantized.onnx'),
    minBytes: 100_000_000,
    url: 'https://huggingface.co/Xenova/multilingual-e5-small/resolve/main/onnx/model_quantized.onnx',
  },
]

function isMissingOrPointer(assetPath, minBytes) {
  try {
    const size = statSync(assetPath).size
    if (size < minBytes) return true

    const fd = openSync(assetPath, 'r')
    const buffer = Buffer.alloc(64)
    const bytesRead = readSync(fd, buffer, 0, buffer.length, 0)
    closeSync(fd)
    const prefix = buffer.subarray(0, bytesRead).toString('utf8')
    return prefix.startsWith('version https://git-lfs.github.com/spec/v1')
  } catch {
    return true
  }
}

async function downloadAsset({ path: assetPath, url }) {
  await mkdir(path.dirname(assetPath), { recursive: true })

  const response = await fetch(url)
  if (!response.ok || !response.body) {
    throw new Error(`Failed to download ${url}: HTTP ${response.status}`)
  }

  const tempPath = `${assetPath}.download`
  await rm(tempPath, { force: true })
  await pipeline(Readable.fromWeb(response.body), createWriteStream(tempPath))
  await rename(tempPath, assetPath)
}

for (const asset of assets) {
  if (!isMissingOrPointer(asset.path, asset.minBytes)) {
    console.log(`[CWF] Model asset ready: ${path.relative(process.cwd(), asset.path)}`)
    continue
  }

  console.log(`[CWF] Downloading model asset: ${path.relative(process.cwd(), asset.path)}`)
  await downloadAsset(asset)
}
