import type { NextApiRequest, NextApiResponse } from 'next';

type ResponseData = {
  success: boolean;
  message?: string;
  redirectUrl?: string;
};

export default function handler(
  req: NextApiRequest,
  res: NextApiResponse<ResponseData>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  const { url } = req.body;

  if (!url) {
    return res.status(400).json({ success: false, message: 'URL is required' });
  }

  try {
    // ตรวจสอบว่า URL นั้น safe (อยู่ใน fliphtml5.com หรือ fliphtml5 domain)
    const urlObj = new URL(url);
    
    // อนุญาต fliphtml5 links เท่านั้น
    if (
      urlObj.hostname.includes('fliphtml5.com') ||
      urlObj.hostname.includes('fliphtml5') ||
      url.startsWith('/')
    ) {
      return res.status(200).json({ 
        success: true, 
        redirectUrl: url 
      });
    }

    // ถ้า URL ไม่ safe ให้ return error
    return res.status(403).json({ 
      success: false, 
      message: 'URL not allowed' 
    });
  } catch (error) {
    return res.status(400).json({ 
      success: false, 
      message: 'Invalid URL' 
    });
  }
}
