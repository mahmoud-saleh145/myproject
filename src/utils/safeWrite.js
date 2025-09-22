
export async function safeWrite(operation) {
    try {
        return await operation();
    } catch (err) {
        if (err.code === 112) { // WriteConflict
            console.log("Retrying write operation...");
            return await operation();
        }
        throw err;
    }
}
