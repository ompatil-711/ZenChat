import TryCatch from "./config/TryCatch.js";
export const createNewChat = TryCatch(async (req, res) => {
    const userId = req.user?._id;
    const { otherUserId } = req.body;
    if (!otherUserId) {
        res.status(400).json({
            message: "Other userId is required",
        });
        return;
    }
});
//# sourceMappingURL=chat.js.map