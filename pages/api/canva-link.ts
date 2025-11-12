import type { NextApiRequest, NextApiResponse } from 'next';

type ResponseData = {
  success: boolean;
  message?: string;
  url?: string;
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
    // ตรวจสอบว่า URL มาจาก Canva
    if (url.includes('canva.com') || url.includes('fliphtml5.com')) {
      // Return URL ตามปกติ ให้ iframe load ตัวเอง
      return res.status(200).json({ 
        success: true,
        url: url
      });
    }

    // URL ที่ไม่ safe
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
