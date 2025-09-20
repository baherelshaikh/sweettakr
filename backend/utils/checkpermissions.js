const CustomErorr = require('../errors')

const checkPermissions = (requestUser, resourceUserId) => {
    if (requestUser.role === 'Admin') return;
    if (requestUser.user_id === resourceUserId) return;
    
    throw new CustomErorr.UnauthorizedError(
        'Not authorized to access this route'
    );
};

module.exports = {checkPermissions}