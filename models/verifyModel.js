import mongoose from "mongoose";
const verfiySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    verificationCode: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

verfiySchema.post("save", function (doc, next) {
  setTimeout(async () => {
    await doc.deleteOne();
  }, 60000);
  next();
});

export const schemaForVerify = new mongoose.model("Verify", verfiySchema);