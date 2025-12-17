import jwt, {} from "jsonwebtoken";
export const isAuth = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            res.status(401).json({
                message: "Please Login - No auth header",
            });
            return;
        }
        const token = authHeader.split(" ")[1];
        // 2. Verify Token
        const decodedValue = jwt.verify(token, process.env.JWT_SECRET);
        console.log("[Auth] Token Verified. Payload:", decodedValue);
        if (!decodedValue || !decodedValue.user) {
            res.status(401).json({
                message: "Invalid token structure",
            });
            return;
        }
        req.user = decodedValue.user;
        next();
    }
    catch (error) {
        res.status(401).json({
            message: "Please Login - JWT error",
        });
    }
};
export default isAuth;
//# sourceMappingURL=isAuth.js.map