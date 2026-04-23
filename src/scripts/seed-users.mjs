import { createClient } from '@supabase/supabase-js'
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

async function seed() {
  // 1. Create Student
  const studentEmail = 'teststudent@gmail.com'
  const studentPwd = 'Test1234!'
  console.log('Creating student...')
  
  const { data: userData, error: userError } = await supabaseAdmin.auth.admin.createUser({
    email: studentEmail,
    password: studentPwd,
    email_confirm: true,
    user_metadata: {
      full_name: 'Test Student',
      username: 'teststudent',
      institute_type: 'University',
      institute_name: 'National Textile University (NTU)'
    }
  })

  if (userError && !userError.message.includes('already registered')) {
    console.error('Error creating student:', userError.message)
  } else {
    console.log('Student ready.')
  }

  // 2. Create Admin
  const adminEmail = 'testadmin@gmail.com'
  const adminPwd = 'Admin1234!'
  console.log('Creating admin...')

  const { data: adminData, error: adminError } = await supabaseAdmin.auth.admin.createUser({
    email: adminEmail,
    password: adminPwd,
    email_confirm: true,
    user_metadata: {
      full_name: 'Test Admin',
      username: 'testadmin',
      institute_type: 'Other',
      institute_name: 'Other'
    }
  })

  let adminId = adminData?.user?.id
  if (adminError && adminError.message.includes('already registered')) {
    const { data: existingAdmin } = await supabaseAdmin.from('profiles').select('id').eq('email', adminEmail).single()
    adminId = existingAdmin?.id
  }

  if (adminId) {
    console.log('Setting admin role...')
    const { error: roleError } = await supabaseAdmin
      .from('profiles')
      .update({ role: 'admin' })
      .eq('id', adminId)
    
    if (roleError) console.error('Error setting role:', roleError.message)
    else console.log('Admin role set.')
  }
}

seed().catch(console.error)
