const nodemailer = require('nodemailer')

async function sendEmail(to, subject, text) {
    const transporter = nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: 587,
        secure: false,
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS
        },
        requireTLS: true,
        connectionTimeout: 10000,
        greetingTimeout: 10000
    })

    await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: to,
        subject: subject,
        text: text
    })
}

module.exports = sendEmail