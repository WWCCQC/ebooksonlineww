import { NextApiRequest, NextApiResponse } from "next";
import { supabase } from "../../lib/supabaseClient";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { token, user_id } = req.body;

    if (!token || !user_id) {
      return res.status(400).json({ error: "Missing token or user_id" });
    }

    // Decode token (รองรับภาษาไทย)
    const decodedToken = JSON.parse(decodeURIComponent(escape(Buffer.from(token, "base64").toString())));
    console.log("Decoded token:", decodedToken);

    // ตรวจสอบว่า id_card ตรงกับ user_id หรือไม่
    if (decodedToken.id_card !== user_id) {
      return res.status(403).json({ error: "Token mismatch" });
    }

    // ตรวจสอบเวลา token (ใช้ได้ 1 ชั่วโมง)
    const tokenAge = Date.now() - decodedToken.timestamp;
    if (tokenAge > 3600000) {
      // 1 hour
      return res.status(401).json({ error: "Token expired" });
    }

    // ตรวจสอบ user ใน database (จาก user_ebook เท่านั้น)
    const { data: userData, error: userError } = await supabase
      .from("user_ebook")
      .select("*")
      .eq("id_card", user_id)
      .eq("is_active", true)
      .single();

    if (userError || !userData) {
      return res.status(403).json({ error: "User not found or inactive" });
    }

    // บันทึก token usage ใน token_logs (ถ้ามี table นี้)
    try {
      const expiresAt = new Date(decodedToken.timestamp + 3600000).toISOString();
      await supabase
        .from("token_logs")
        .insert({
          id_card: user_id,
          token: token,
          created_at: new Date(decodedToken.timestamp).toISOString(),
          expires_at: expiresAt,
          is_valid: true,
        });
    } catch (logError) {
      console.warn("Token logs not available or error:", logError);
    }

    // Token ถูกต้อง - ส่ง user data กลับ
    return res.status(200).json({
      success: true,
      user: {
        id_card: userData.id_card,
        full_name: userData.full_name,
        is_active: userData.is_active,
        created_at: userData.created_at,
        last_login: userData.last_login,
      },
      token_expires_at: new Date(decodedToken.timestamp + 3600000).toISOString(),
    });
  } catch (error: any) {
    console.error("Error:", error.message);
    return res.status(500).json({ error: error.message });
  }
}
