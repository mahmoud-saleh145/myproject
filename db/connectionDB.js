import mongoose from 'mongoose';

const connectionDB = async () => {
    return await mongoose.connect(process.env.DB_URL_ONLINE, {
    })
        .then(() => {
            console.log(`Database connected successfully ${process.env.DB_URL_ONLINE}`);
        }).catch((error) => {
            console.error({ msg: 'Database connection failed:', error });
        })
}
export default connectionDB;  