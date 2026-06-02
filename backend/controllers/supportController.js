const SupportMessage = require("../models/SupportMessage");

exports.createMessage = async (req, res) => {
  try {
    const { message, email } = req.body;

    const userId = req.user ? req.user._id : null; 

    if (!message) {
      return res.status(400).json({
        success: false,
        message: "Message is required",
      });
    }

    const newMessage = await SupportMessage.create({
      message,
      email,
      user: userId,
    });


    res.status(201).json({
      success: true,
      data: newMessage,
      message: "Message sent successfully",
    });
  } catch (error) {
    console.error("Support Error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};