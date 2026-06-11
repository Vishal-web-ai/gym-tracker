const sgMail = require('@sendgrid/mail')

async function sendEmail(to, subject, text) {
    sgMail.setApiKey(process.env.SENDGRID_API_KEY)

    const otp = text.match(/\d{6}/)?.[0] || ''
    const html = `
        <div style="font-family: Arial, sans-serif; max-width: 400px; margin: 0 auto; padding: 20px; border: 1px solid #f97316; border-radius: 16px; background: #111; color: #fff;">
            <div style="text-align: center; margin-bottom: 20px;">
                <span style="font-size: 40px;">🏋️</span>
                <h1 style="color: #f97316; margin: 0; font-size: 24px;">Gym Tracker</h1>
            </div>
            <p style="font-size: 16px; color: #ccc;">Your OTP code is:</p>
            <div style="background: #f97316; color: #000; font-size: 36px; font-weight: bold; text-align: center; padding: 15px; border-radius: 12px; letter-spacing: 8px; margin: 15px 0;">
                ${otp}
            </div>
            <p style="font-size: 14px; color: #888;">This code expires in <strong style="color: #f97316;">5 minutes</strong>. Do not share it with anyone.</p>
            <hr style="border-color: #333; margin: 20px 0;">
            <p style="font-size: 12px; color: #555; text-align: center;">If you didn't request this, you can safely ignore this email.</p>
        </div>
    `

    await sgMail.send({ to, from: process.env.FROM_EMAIL, subject, text, html })
}

module.exports = sendEmail