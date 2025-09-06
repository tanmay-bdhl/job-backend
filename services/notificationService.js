const nodemailer = require('nodemailer');

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
