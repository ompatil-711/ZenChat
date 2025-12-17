import mongoose from "mongoose";
const connectDb = async () => {
    const url = process.env.MONGO_URI;
    if (!url) {
        throw new Error("MONGO_URI is not defined in environement variable");
    }
    try {
        await mongoose.connect(url, {
            dbName: "Chatappmicroserviceapp",
        });
        console.log("Connected to MongoDB");
    }
    catch (error) {
        console.log("Failed to connect to the MongoDB");
        process.exit(1);
    }
};
export default connectDb;
//# sourceMappingURL=db.js.map