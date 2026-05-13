import { spawnSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const args = process.argv.slice(2)

runScript('generate-qr-data.mjs')
runScript('generate-print-pdfs.mjs')

function runScript(scriptName) {
  const result = spawnSync(
    process.execPath,
    [path.join(__dirname, scriptName), ...args],
    {
      stdio: 'inherit',
    },
  )

  if (result.status !== 0) {
    process.exit(result.status ?? 1)
  }
}
