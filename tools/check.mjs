// Everything that has to be true about headfit.html before it goes near the site.
//
// There is no build step here, which is the point of the project and also the
// risk: a stray character in a 720 KB file is live the moment it is deployed,
// and the first person to find out is somebody measuring their head. This
// compiles every inline script without running it, so a syntax error fails here
// rather than as a blank viewport.
//
// The size and title checks are not arbitrary. They are the same two guards
// PrintVault's tools/headfit.sh applies before it will upload the file, so this
// catches at push time what would otherwise stop a deploy.
//
//   node tools/check.mjs          check headfit.html
//   node tools/check.mjs v0.8.2   also require the version to match that tag
//
// Exits non-zero on the first failure, with the reason on stderr.

import { readFileSync } from 'node:fs'
import vm from 'node:vm'

const FILE = 'headfit.html'
const MIN_BYTES = 300 * 1024

const fail = (m) => { console.error('FAIL  ' + m); process.exitCode = 1 }
const pass = (m) => console.log('ok    ' + m)

const src = readFileSync(FILE, 'utf8')
const bytes = Buffer.byteLength(src)

if (bytes < MIN_BYTES) fail(`${FILE} is ${bytes} bytes, under the ${MIN_BYTES} the deploy requires`)
else pass(`${Math.round(bytes / 1024)} KB`)

if (!/<title>Headfit/.test(src)) fail('no <title>Headfit, which the deploy checks for')
else pass('title')

// The version lives in one place and everything else is derived from it.
const ver = src.match(/APP_VERSION\s*=\s*'(\d+\.\d+\.\d+)'/)
if (!ver) fail('no APP_VERSION x.y.z found')
else pass(`APP_VERSION ${ver[1]}`)

// A release note nobody wrote is the normal way a version ships silently. The
// newest entry in NOTES has to be the version that is running.
const firstNote = src.match(/var NOTES\s*=\s*\[\s*\[\s*'(\d+\.\d+\.\d+)'/)
if (!firstNote) fail('could not find the newest NOTES entry')
else if (ver && firstNote[1] !== ver[1]) fail(`NOTES starts at ${firstNote[1]} but APP_VERSION is ${ver[1]}`)
else if (ver) pass('NOTES newest entry matches the version')

// Social card and canonical url, which vanish quietly and are only noticed when
// somebody pastes a link somewhere and it comes up blank.
for (const tag of ['og:url', 'og:image', 'og:title']) {
  if (!src.includes(`property="${tag}"`)) fail(`missing meta ${tag}`)
}
if (process.exitCode !== 1) pass('open graph tags')

// Compile, do not run. new vm.Script parses and throws SyntaxError on bad input
// without executing a line of it, which is what we want from a file that draws
// to a canvas and reads localStorage on load.
const scripts = [...src.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi)]
if (!scripts.length) fail('no inline scripts found at all, which cannot be right')
let n = 0
for (const [, body] of scripts) {
  if (!body.trim()) continue
  n++
  try {
    new vm.Script(body, { filename: `${FILE}#script${n}` })
  } catch (e) {
    fail(`inline script ${n} does not parse: ${e.message}`)
  }
}
if (n) pass(`${n} inline script${n === 1 ? '' : 's'} compile`)

// On a tag build, the tag and the file have to agree. A tag pointing at the
// wrong version is worse than no tag: the release page then lies about what it
// contains and the download under it is something else.
const wanted = process.argv[2]
if (wanted) {
  const want = wanted.replace(/^v/, '')
  if (!ver) fail('cannot check the tag without a version in the file')
  else if (want !== ver[1]) fail(`tag ${wanted} does not match APP_VERSION ${ver[1]}`)
  else pass(`tag ${wanted} matches the file`)
}

if (process.exitCode === 1) console.error('\nsomething above is wrong')
else console.log('\nall good')
