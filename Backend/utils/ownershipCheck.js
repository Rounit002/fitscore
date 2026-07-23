const requireOwnership = (resourceUserId, requestingUserId) => {
  if (!resourceUserId || !requestingUserId || String(resourceUserId) !== String(requestingUserId)) {
    const err = new Error('Access denied: you do not own this resource.');
    err.status = 403;
    throw err;
  }
};

module.exports = { requireOwnership };
