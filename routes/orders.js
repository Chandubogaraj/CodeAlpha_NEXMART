const router = require("express").Router();
const { body, validationResult } = require("express-validator");
const Order = require("../models/Order");
const Product = require("../models/Product");
const { protect, adminOnly } = require("../middleware/auth");

// POST /api/orders — create order
router.post(
  "/",
  protect,
  [
    body("items").isArray({ min: 1 }).withMessage("At least one item required"),
    body("shippingAddress.name").notEmpty().withMessage("Shipping name required"),
    body("shippingAddress.street").notEmpty().withMessage("Street required"),
    body("shippingAddress.city").notEmpty().withMessage("City required"),
    body("shippingAddress.pincode").notEmpty().withMessage("Pincode required"),
    body("shippingAddress.phone").notEmpty().withMessage("Phone required")
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty())
      return res.status(400).json({ success: false, errors: errors.array() });

    try {
      const { items, shippingAddress, paymentMethod, notes } = req.body;

      // Validate products and build items
      const enrichedItems = [];
      let subtotal = 0;

      for (const item of items) {
        const product = await Product.findById(item.product);
        if (!product)
          return res.status(404).json({ success: false, message: `Product ${item.product} not found.` });

        if (product.stock < item.quantity)
          return res.status(400).json({
            success: false,
            message: `Insufficient stock for ${product.name}.`
          });

        enrichedItems.push({
          product: product._id,
          name: product.name,
          image: product.image,
          price: product.price,
          quantity: item.quantity
        });

        subtotal += product.price * item.quantity;

        // Decrease stock
        product.stock -= item.quantity;
        await product.save();
      }

      const shippingCost = subtotal >= 999 ? 0 : 99;
      const total = subtotal + shippingCost;

      const order = await Order.create({
        user: req.user._id,
        items: enrichedItems,
        shippingAddress,
        paymentMethod: paymentMethod || "COD",
        subtotal,
        shippingCost,
        total,
        notes
      });

      res.status(201).json({ success: true, order });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  }
);

// GET /api/orders/my — user's own orders
router.get("/my", protect, async (req, res) => {
  try {
    const orders = await Order.find({ user: req.user._id })
      .populate("items.product", "name image")
      .sort("-createdAt");

    res.json({ success: true, orders });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/orders/:id
router.get("/:id", protect, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id).populate(
      "items.product",
      "name image price"
    );

    if (!order)
      return res.status(404).json({ success: false, message: "Order not found." });

    // Only the owner or admin can view
    if (
      order.user.toString() !== req.user._id.toString() &&
      req.user.role !== "admin"
    ) {
      return res.status(403).json({ success: false, message: "Not authorized." });
    }

    res.json({ success: true, order });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/orders — admin: all orders
router.get("/", protect, adminOnly, async (req, res) => {
  try {
    const { page = 1, limit = 20, status } = req.query;
    const query = status ? { orderStatus: status } : {};

    const total = await Order.countDocuments(query);
    const orders = await Order.find(query)
      .populate("user", "name email")
      .sort("-createdAt")
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit));

    res.json({ success: true, total, orders });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PATCH /api/orders/:id/status — admin only
router.patch("/:id/status", protect, adminOnly, async (req, res) => {
  try {
    const { orderStatus, trackingNumber } = req.body;
    const update = { orderStatus };
    if (trackingNumber) update.trackingNumber = trackingNumber;
    if (orderStatus === "delivered") update.deliveredAt = new Date();

    const order = await Order.findByIdAndUpdate(req.params.id, update, { new: true });
    if (!order)
      return res.status(404).json({ success: false, message: "Order not found." });

    res.json({ success: true, order });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE /api/orders/:id/cancel — user cancels own order
router.patch("/:id/cancel", protect, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order)
      return res.status(404).json({ success: false, message: "Order not found." });

    if (order.user.toString() !== req.user._id.toString())
      return res.status(403).json({ success: false, message: "Not authorized." });

    if (["shipped", "delivered"].includes(order.orderStatus))
      return res.status(400).json({ success: false, message: "Cannot cancel a shipped/delivered order." });

    // Restore stock
    for (const item of order.items) {
      await Product.findByIdAndUpdate(item.product, {
        $inc: { stock: item.quantity }
      });
    }

    order.orderStatus = "cancelled";
    await order.save();

    res.json({ success: true, message: "Order cancelled.", order });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
