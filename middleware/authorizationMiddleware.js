export const authorizeAdmin = (req, res, next) => {
    try {
        // Ensure that the user is authenticated (the user object will be available in `req.user`)
        if (req.user && req.user.role === 'admin') {
            return next(); // Allow the request to proceed
        }
        return res.status(403).json({
            success: false,
            message: 'You do not have permission to perform this action',
            code: 'FORBIDDEN',
        });
    } catch (error) {
        console.error('Authorization error:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error during authorization check',
            code: 'INTERNAL_ERROR',
        });
    }
};
