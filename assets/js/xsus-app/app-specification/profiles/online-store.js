export const onlineStoreProfile = Object.freeze({
  id: "online-store",
  matches(goal) { return /\b(?:online\s+store|e-?commerce|web\s+shop)\b/i.test(goal); },
  productLabel: "Online store",
  pages: ["Product catalog", "Product details", "Shopping cart", "Checkout", "Order confirmation"],
  components: ["Product card", "Category filters", "Cart line item", "Address form", "Order summary"],
  dataModels: ["Product", "Cart", "Customer", "Order", "Payment"],
  interactions: [
    "Browse and search products",
    "Add or remove cart items",
    "Submit checkout details",
    "Track order status"
  ],
  questions: [
    "Which shipping, tax and return rules apply?",
    "Which payment methods should be available?",
    "How should product inventory be managed?",
    "Can customers check out as guests?"
  ]
});
