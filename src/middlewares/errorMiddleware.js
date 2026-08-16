export function errorHandling(error, req, res, next) {
    const statusCode = error.statusCode || 500;
    res.status(statusCode).json({
        error: error.message || 'Something went wrong!'
    });
}
