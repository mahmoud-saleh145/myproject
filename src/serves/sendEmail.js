import nodemailer from "nodemailer";

export const sendEmail = async (to, subject, html) => {

    const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
            user: process.env.emailSender,
            pass: process.env.emailSenderPassword,
        },
    });



    const info = await transporter.sendMail({
        from: ` "mahmoud" <${process.env.emailSender}>`,
        to: to ? to : "salehmahmoud327@gmail.com",
        subject: subject ? subject : "No Subject",

        html: html ? html : "<h1>No Content</h1>",
    });

    console.log(info);
    if (info.accepted.length) {
        return true;
    } else {
        return false;
    }


}
