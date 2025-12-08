const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema({
  uid: { type: String, required: true, unique: true },
  name: String,
  email: String,
  role: { type: String, default: "citizen" } // citizen | staff | admin
});

module.exports = mongoose.model("User", UserSchema);
