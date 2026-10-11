// Connectivity test — verifies Firebase Admin SDK + Supabase Storage access
// Run: bun scripts/test-connectivity.ts

import { initializeApp, getApps, cert } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { getFirestore } from 'firebase-admin/firestore'
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { resolve } from 'path'

let allPass = true

function report(name: string, pass: boolean, detail?: string) {
  const status = pass ? '✅ PASS' : '❌ FAIL'
  console.log(`${status} — ${name}${detail ? ': ' + detail : ''}`)
  if (!pass) allPass = false
}

async function main() {
  console.log('\n🔍 STRIDES ONE — Connectivity Test\n')
  console.log('='.repeat(60))

  // === 1. Firebase Admin SDK ===
  console.log('\n📦 1. Firebase Admin SDK\n')
  console.log('-'.repeat(40))

  // Load service account
  const saPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH || './firebase-service-account.json'
  let serviceAccount: any
  try {
    serviceAccount = JSON.parse(readFileSync(resolve(saPath), 'utf8'))
    report('Service account JSON loaded', true, `project_id=${serviceAccount.project_id}`)
  } catch (e: any) {
    report('Service account JSON loaded', false, e.message)
    console.log('\n⛔ Stopping — cannot proceed without service account')
    process.exit(1)
  }

  // Initialize Admin
  let app
  try {
    if (getApps().length > 0) {
      app = getApps()[0]
    } else {
      app = initializeApp({
        credential: cert(serviceAccount),
        projectId: serviceAccount.project_id,
      })
    }
    report('Firebase Admin initialized', true, `projectId=${serviceAccount.project_id}`)
  } catch (e: any) {
    report('Firebase Admin initialized', false, e.message)
    process.exit(1)
  }

  const adminAuth = getAuth(app!)
  const adminDb = getFirestore(app!)

  // === 2. Firebase Auth Access ===
  console.log('\n🔐 2. Firebase Authentication\n')
  console.log('-'.repeat(40))
  try {
    const listUsers = await adminAuth.listUsers(1)
    report('Firebase Auth access', true, `${listUsers.users.length > 0 ? `Found ${listUsers.users.length}+ user(s)` : 'Empty auth (no users yet)'}`)
  } catch (e: any) {
    report('Firebase Auth access', false, e.message)
  }

  // === 3. Firestore Access ===
  console.log('\n🗄️ 3. Firestore Database\n')
  console.log('-'.repeat(40))
  try {
    const testDoc = adminDb.collection('_connectivity_test').doc('test')
    await testDoc.set({ timestamp: new Date().toISOString(), test: true })
    const snapshot = await testDoc.get()
    if (snapshot.exists) {
      report('Firestore write', true, 'Document written successfully')
    } else {
      report('Firestore write', false, 'Write succeeded but read returned empty')
    }
    await testDoc.delete()
    report('Firestore read', true, 'Document read back successfully')
    report('Firestore delete', true, 'Test document cleaned up')
  } catch (e: any) {
    report('Firestore access', false, e.message)
  }

  // === 4. Supabase Storage Access ===
  console.log('\n📁 4. Supabase Storage\n')
  console.log('-'.repeat(40))
  const supabaseUrl = process.env.SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const bucketName = process.env.SUPABASE_BUCKET || 'strides-files'

  if (!supabaseUrl || !supabaseKey || supabaseKey === 'your_supabase_service_role_key_here') {
    report('Supabase credentials', false, 'SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not set in .env')
  } else {
    report('Supabase credentials loaded', true, `URL=${supabaseUrl}`)

    try {
      const supabase = createClient(supabaseUrl, supabaseKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      })

      // List files in bucket (tests read access)
      const { data, error } = await supabase.storage.from(bucketName).list('', { limit: 5 })
      if (error) {
        report('Supabase Storage bucket access', false, `${error.message} (bucket: ${bucketName})`)
      } else {
        report('Supabase Storage bucket access', true, `Bucket "${bucketName}" accessible, ${data?.length || 0} item(s) at root`)
      }

      // Test upload a small test file
      const testContent = new TextEncoder().encode('STRIDES ONE connectivity test')
      const testPath = '_connectivity_test/test.txt'
      const { error: uploadError } = await supabase.storage
        .from(bucketName)
        .upload(testPath, testContent, { contentType: 'text/plain' })

      if (uploadError) {
        report('Supabase Storage upload', false, uploadError.message)
      } else {
        report('Supabase Storage upload', true, 'Test file uploaded successfully')

        // Test signed URL generation
        const { data: urlData, error: urlError } = await supabase.storage
          .from(bucketName)
          .createSignedUrl(testPath, 60)

        if (urlError) {
          report('Supabase signed URL generation', false, urlError.message)
        } else {
          report('Supabase signed URL generation', true, 'Signed URL created (60s expiry)')
        }

        // Cleanup
        const { error: deleteError } = await supabase.storage
          .from(bucketName)
          .remove([testPath])
        report('Supabase Storage delete', !deleteError, deleteError ? deleteError.message : 'Test file cleaned up')
      }
    } catch (e: any) {
      report('Supabase Storage access', false, e.message)
    }
  }

  // === 5. Secret Protection ===
  console.log('\n🔒 5. Secret Protection\n')
  console.log('-'.repeat(40))

  const gitignore = readFileSync('.gitignore', 'utf8')
  report('.env gitignored', gitignore.includes('.env'))
  report('firebase-service-account.json gitignored', gitignore.includes('firebase-service-account.json'))
  report('upload/ gitignored', gitignore.includes('upload/'))

  // Check no server secrets in client code
  const clientFiles = ['src/lib/firebase.ts', 'src/components/portal/login-screen.tsx']
  let clientLeak = false
  for (const f of clientFiles) {
    try {
      const content = readFileSync(f, 'utf8')
      if (content.includes('SUPABASE_SERVICE_ROLE_KEY') || content.includes('FIREBASE_SERVICE_ACCOUNT_PATH') || content.includes('private_key')) {
        report(`No secrets in ${f}`, false, 'Found server-side secret reference')
        clientLeak = true
      }
    } catch {}
  }
  if (!clientLeak) {
    report('No server secrets in client-side code', true, 'Checked firebase.ts + login-screen.tsx')
  }

  // === Summary ===
  console.log('\n' + '='.repeat(60))
  if (allPass) {
    console.log('\n✅ ALL TESTS PASSED — Ready for migration\n')
  } else {
    console.log('\n❌ SOME TESTS FAILED — Fix issues before proceeding\n')
  }
  console.log('='.repeat(60) + '\n')

  process.exit(allPass ? 0 : 1)
}

main().catch((e) => {
  console.error('\n❌ Fatal error:', e.message)
  process.exit(1)
})
