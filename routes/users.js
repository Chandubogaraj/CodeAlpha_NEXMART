const router = require("express").Router();
const { body, validationResult } = require("express-validator");
const User = require("../models/User");
const { protect, adminOnly } = require("../middleware/auth");

// GET /api/users/profile
router.get("/profile", protect, (req, res) => {
  res.json({ success: true, user: req.user });
});

// PUT /api/users/profile
router.put(
  "/profile",
  protect,
  [
    body("name").optional().trim().isLength({ min: 2 }).withMessage("Name min 2 chars"),
    body("email").optional().isEmail().normalizeEmail()
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty())
      return res.status(400).json({ success: false, errors: errors.array() });

    try {
      const { name, email, address, avatar } = req.body;
      const update = {};
      if (name) update.name = name;
      if (email) update.email = email;
      if (address) update.address = address;
      if (avatar) update.avatar = avatar;

      const user = await User.findByIdAndUpdate(req.user._id, update, {
        new: true,
        runValidators: true
      });

      res.json({ success: true, user });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  }
);

// PUT /api/users/change-password
router.put(
  "/change-password",
  protect,
  [
    body("currentPassword").notEmpty().withMessage("Current password required"),
    body("newPassword").isLength({ min: 6 }).withMessage("New password min 6 chars")
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty())
      return res.status(400).json({ success: false, errors: errors.array() });

    try {
      const user = await User.findById(req.user._id).select("+password");
      const match = await user.comparePassword(req.body.currentPassword);

      if (!match)
        return res.status(401).json({ success: false, message: "Current password incorrect." });

      user.password = req.body.newPassword;
      await user.save();

      res.json({ success: true, message: "Password updated successfully." });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  }
);

// GET /api/users — admin only
router.get("/", protect, adminOnly, async (req, res) => {
  try {
    const users = await User.find().select("-password").sort("-createdAt");
    res.json({ success: true, users });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
