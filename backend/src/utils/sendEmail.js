const nodemailer = require('nodemailer')
const dns = require('dns')

const { promisify } = require('util')
const resolve4 = promisify(dns.resolve4)

async function sendEmail(to, subject, text) {
    const addresses = await resolve4('smtp.gmail.com')
    const smtpHost = addresses[0]

    const transporter = nodemailer.createTransport({
        host: smtpHost,
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