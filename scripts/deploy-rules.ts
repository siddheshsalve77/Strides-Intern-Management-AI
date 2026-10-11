import { readFileSync } from 'fs'
import { google } from 'googleapis'

const sa = JSON.parse(readFileSync('./firebase-service-account.json', 'utf8'))
const rules = readFileSync('./firestore.rules', 'utf8')
const project = sa.project_id

async function deploy() {
  console.log('🔑 Authenticating...')
  const auth = new google.auth.JWT({
    email: sa.client_email,
    key: sa.private_key,
    scopes: ['https://www.googleapis.com/auth/firebase'],
  })
  await auth.authorize()
  console.log('✅ Authenticated')

  const fb = google.firebaserules({ version: 'v1', auth })

  // Create ruleset with hardened rules
  console.log('📝 Creating hardened ruleset...')
  const createRes = await fb.projects.rulesets.create({
    name: `projects/${project}`,
    requestBody: {
      source: {
        files: [{ name: 'firestore.rules', content: rules }],
      },
    },
  })
  const rulesetName = createRes.data.name as string
  console.log('✅ Ruleset created:', rulesetName.split('/').pop())

  // Get existing release to see its format
  const releaseName = `projects/${project}/releases/cloud.firestore`
  const getRes = await fb.projects.releases.get({ name: releaseName })
  console.log('📋 Existing release:', JSON.stringify(getRes.data, null, 2))

  // Try patching with the exact field from the response
  const token = (await auth.getAccessToken()).token!
  console.log('🚀 Attempting release update...')

  // Try different approaches
  const attempts = [
    { mask: 'rulesetName', body: { name: releaseName, rulesetName: rulesetName } },
    { mask: 'ruleset_name', body: { name: releaseName, ruleset_name: rulesetName } },
    { mask: '*', body: { name: releaseName, rulesetName: rulesetName } },
    { mask: '', body: { name: releaseName, rulesetName: rulesetName } },
  ]

  for (const attempt of attempts) {
    const url = attempt.mask 
      ? `https://firebaserules.googleapis.com/v1/${releaseName}?updateMask=${attempt.mask}`
      : `https://firebaserules.googleapis.com/v1/${releaseName}`
    const res = await fetch(url, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(attempt.body),
    })
    if (res.ok) {
      console.log(`✅ SUCCESS with mask="${attempt.mask}"`)
      console.log('\n🎉 Firestore Security Rules deployed successfully!')
      console.log('   Ruleset:', rulesetName)
      console.log('   Release:', releaseName)
      process.exit(0)
    }
    const err = await res.json().catch(() => ({}))
    console.log(`  ❌ mask="${attempt.mask}": ${err.error?.message?.substring(0, 60) || 'failed'}`)
  }

  console.log('\n⚠️  Programmatic deployment failed. Manual deployment required.')
  console.log('   Go to: Firebase Console → Firestore → Rules → paste firestore.rules → Publish')
}

deploy().catch(e => { console.error('Failed:', e); process.exit(1) })
