import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const supabase = createClient(supabaseUrl, supabaseServiceKey)

serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' }
    })
  }

  try {
    const { token, user_id } = await req.json()

    if (!token || !user_id) {
      return new Response(
        JSON.stringify({ error: 'Missing token or user_id' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Decode token
    const decodedToken = JSON.parse(atob(token))
    console.log('Decoded token:', decodedToken)

    // ตรวจสอบว่า id_card ตรงกับ user_id หรือไม่
    if (decodedToken.id_card !== user_id) {
      return new Response(
        JSON.stringify({ error: 'Token mismatch' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // ตรวจสอบเวลา token (ใช้ได้ 1 ชั่วโมง)
    const tokenAge = Date.now() - decodedToken.timestamp
    if (tokenAge > 3600000) { // 1 hour
      return new Response(
        JSON.stringify({ error: 'Token expired' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // ตรวจสอบ user ใน database
    const { data: userData, error: userError } = await supabase
      .from('user_ebook')
      .select('*')
      .eq('id_card', user_id)
      .eq('is_active', true)
      .single()

    if (userError || !userData) {
      return new Response(
        JSON.stringify({ error: 'User not found or inactive' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Token ถูกต้อง - ส่ง user data กลับ
    return new Response(
      JSON.stringify({
        success: true,
        user: {
          id_card: userData.id_card,
          full_name: userData.full_name,
          email: userData.email,
          // เพิ่มข้อมูลอื่นๆ ตามต้องการ
        }
      }),
      { 
        status: 200,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        } 
      }
    )

  } catch (error) {
    console.error('Error:', error.message)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    )
  }
})
