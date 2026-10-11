// Diagnose login flow: check Firestore users collection for priya + auth users
const { initializeApp, cert } = require('firebase-admin/app')
const admin = { firestore: () => require('firebase-admin/firestore').getFirestore(), auth: () => require('firebase-admin/auth').getAuth() }
const fs = require('fs')
const path = require('path')

const serviceAccount = JSON.parse(
  fs.readFileSync(path.resolve(__dirname, '..', 'firebase-service-account.json'), 'utf8')
)

const app = initializeApp({
  credential: cert(serviceAccount),
  projectId: serviceAccount.project_id,
})

async function main() {
  // 1. List Firebase Auth users
  try {
    const listResult = await admin.auth().listUsers(20)
    console.log('=== Firebase Auth users ===')
    listResult.users.forEach(u => {
      console.log(`uid=${u.uid} email=${u.email} disabled=${u.disabled}`)
    })
  } catch (e) {
    console.error('Auth list failed:', e.message)
  }

  // 2. List Firestore users collection docs
  try {
    const snap = await admin.firestore().collection('users').limit(20).get()
    console.log('\n=== Firestore users docs ===')
    snap.forEach(doc => {
      const d = doc.data()
      console.log(`docId=${doc.id} email=${d.email} role=${d.role} status=${d.status} name=${d.name || d.fullName}`)
    })
  } catch (e) {
    console.error('Firestore users list failed:', e.message)
  }

  // 3. Specifically check priya
  try {
    const snap = await admin.firestore().collection('users').where('email', '==', 'priya@strides.com').get()
    console.log('\n=== priya@strides.com docs ===')
    if (snap.empty) console.log('NO DOCUMENT FOUND for priya@strides.com')
    snap.forEach(doc => {
      const d = doc.data()
      console.log(`docId=${doc.id} uid-field=${d.uid || 'NONE'} role=${d.role} status=${d.status}`)
      console.log('full doc:', JSON.stringify(d, null, 2).slice(0, 800))
    })
  } catch (e) {
    console.error('priya query failed:', e.message)
  }

  process.exit(0)
}

main().catch(e => { console.error('FATAL:', e); process.exit(1) })
