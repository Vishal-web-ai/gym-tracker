const sgMail = require('@sendgrid/mail')

async function sendEmail(to, subject, text) {
    sgMail.setApiKey(process.env.SENDGRID_API_KEY)
    await sgMail.send({
        to,
        from: process.env.FROM_EMAIL,
        subject,
        text
    })
}

module.exports = sendEmail