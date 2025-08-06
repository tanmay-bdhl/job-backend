const nodemailer = require('nodemailer');
// const twilio = require('twilio'); // Uncomment if using Twilio

const transporter = nodemailer.createTransport({
  service: process.env.EMAIL_SERVICE,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

exports.sendEmail = async (to, jobs) => {
  const jobList = jobs.map(job => `<li>${job.title} - ${job.company}</li>`).join('');
  const html = `<h3>Your Job Suggestions</h3><ul>${jobList}</ul>`;
  await transporter.sendMail({
    from: process.env.EMAIL_USER,
    to,
    subject: 'Your Daily Job Suggestions',
    html,
  });
};

// Uncomment and configure if using Twilio for WhatsApp
// const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
// exports.sendWhatsApp = async (to, jobs) => {
//   const jobList = jobs.map(job => `${job.title} - ${job.company}`).join('\n');
//   await client.messages.create({
//     from: `whatsapp:${process.env.TWILIO_PHONE_NUMBER}`,
//     to: `whatsapp:${to}`,
//     body: `Your Job Suggestions:\n${jobList}`,
//   });
// }; 