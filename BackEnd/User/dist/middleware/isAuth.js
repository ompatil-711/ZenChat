import jwt from "jsonwebtoken";
export const isAuth = async (req, res, next) => {
    try {
        console.log("[Auth] Middleware started...");
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            console.log("[Auth] Failed: No Token Provided");
            res.status(401).json({
                message: "Please Login - No auth header",
            });
            return;
        }
        const token = authHeader.split(" ")[1];
        // 2. Verify Token
        const decodedValue = jwt.verify(token, process.env.JWT_SECRET);
        console.log("[Auth] Token Verified. Payload:", decodedValue);
        // 3. CRITICAL CHECK: Does your token actually contain a 'user' object?
        // If your generateToken() saved it as { _id: "..." }, then decodedValue.user will be undefined.
        if (!decodedValue || !decodedValue.user) {
            console.log("[Auth] Failed: Token is valid but user data is missing in payload");
            res.status(401).json({
                message: "Invalid token structure",
            });
            return;
        }
        req.user = decodedValue.user;
        console.log("[Auth] Success. Moving to controller...");
        next();
    }
    catch (error) {
        console.log("[Auth] Error:", error);
        res.status(401).json({
            message: "Please Login - JWT error",
        });
    }
};
//# sourceMappingURL=isAuth.js.map