
module.exports = function mockAuth(req, res, next) {
  const id = req.header("x-user-id");
  const name = req.header("x-user-name") || "Anonymous";
  if (id) {
    req.user = { id: id.toString(), name };
  }
  next();
};
