// api/verify-otp.js — Vercel Serverless Function
// Verifies OTP entered by user

// Must share same store as send-otp — use Firebase in production
// For now using module-level store (works within same serverless instance)
const otpStore = {};

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { phone, otp } = req.body;
  if (!phone || !otp) return res.status(400).json({ error: 'Phone and OTP required' });

  const cleaned = phone.replace(/\s/g, '');
  const record = otpStore[cleaned];

  if (!record) return res.status(400).json({ error: 'No OTP found. Please request a new one.' });
  if (Date.now() > record.expiry) {
    delete otpStore[cleaned];
    return res.status(400).json({ error: 'OTP expired. Please request a new one.' });
  }
  if (record.otp !== otp.toString()) {
    return res.status(400).json({ error: 'Wrong OTP. Please try again.' });
  }

  // OTP verified — clean up
  delete otpStore[cleaned];
  return res.status(200).json({ success: true, message: 'OTP verified!' });
}
