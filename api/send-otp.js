// api/send-otp.js — Vercel Serverless Function
// Safely sends OTP using Twilio — keys never exposed to browser

// Credentials stored securely in Vercel Environment Variables
const TWILIO_SID = process.env.TWILIO_SID;
const TWILIO_TOKEN = process.env.TWILIO_TOKEN;
const TWILIO_NUMBER = process.env.TWILIO_NUMBER;

// Simple in-memory OTP store (resets on server restart, fine for trial)
// For production, use Firebase/Redis to store OTPs
const otpStore = {};

function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export default async function handler(req, res) {
  // Allow CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { phone } = req.body;
  if (!phone) return res.status(400).json({ error: 'Phone number required' });

  // Validate Indian phone number
  const cleaned = phone.replace(/\s/g, '');
  if (!/^\+91[6-9]\d{9}$/.test(cleaned)) {
    return res.status(400).json({ error: 'Invalid Indian mobile number' });
  }

  const otp = generateOTP();
  const expiry = Date.now() + 10 * 60 * 1000; // 10 minutes

  // Store OTP
  otpStore[cleaned] = { otp, expiry };

  // Send via Twilio
  const url = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_SID}/Messages.json`;
  const body = new URLSearchParams({
    To: cleaned,
    From: TWILIO_NUMBER,
    Body: `Your TerraWalk OTP is: ${otp}. Valid for 10 minutes. Do not share with anyone.`
  });

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': 'Basic ' + Buffer.from(`${TWILIO_SID}:${TWILIO_TOKEN}`).toString('base64'),
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: body.toString()
  });

  const data = await response.json();

  if (data.error_code) {
    console.error('Twilio error:', data);
    // Trial account restriction
    if (data.error_code === 21608) {
      return res.status(400).json({ error: 'UNVERIFIED_NUMBER', message: 'This number needs to be verified in Twilio trial account' });
    }
    return res.status(500).json({ error: 'Failed to send OTP', detail: data.message });
  }

  return res.status(200).json({ success: true, message: 'OTP sent successfully' });
}
