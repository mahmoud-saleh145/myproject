import mongoose from 'mongoose';

let cached = global.mongoose;

if (!cached) {
    cached = global.mongoose = { conn: null, promise: null };
}

const connectToDB = async () => {
    if (cached.conn) return cached.conn;

    if (!cached.promise) {
        cached.promise = mongoose.connect(process.env.DB_URL_ONLINE)
            .then((mongoose) => {
                console.log('Database connected successfully');
                return mongoose;
            })
            .catch((error) => {
                console.error({ msg: 'Database connection failed:', error });
                throw error;
            });
    }

    cached.conn = await cached.promise;
    return cached.conn;
};

export default connectToDB;
