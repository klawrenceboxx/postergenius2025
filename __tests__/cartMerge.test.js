import { mergeCartItems } from "@/lib/cartUtils";

describe("mergeCartItems", () => {
  it("merges unique guest items into an empty user cart", () => {
    const userItems = {};
    const guestItems = {
      "poster-1-standard-8x10": {
        productId: "poster-1",
        format: "standard",
        dimensions: "8x10",
        quantity: 2,
        price: 25,
      },
    };

    const merged = mergeCartItems(userItems, guestItems);

    expect(Object.keys(merged)).toHaveLength(1);
    expect(merged["poster-1-standard-8x10"].quantity).toBe(2);
    expect(merged["poster-1-standard-8x10"].price).toBe(25);
  });

  it("sums quantities when the same product exists in both carts", () => {
    const userItems = {
      "poster-2-standard-8x10": {
        productId: "poster-2",
        format: "standard",
        dimensions: "8x10",
        quantity: 1,
        price: 30,
      },
    };

    const guestItems = {
      "guest-key": {
        productId: "poster-2",
        format: "standard",
        dimensions: "8x10",
        quantity: 3,
        price: 28,
        title: "Guest Poster",
      },
    };

    const merged = mergeCartItems(userItems, guestItems);
    const mergedItem = merged["poster-2-standard-8x10"];

    expect(Object.keys(merged)).toHaveLength(1);
    expect(mergedItem.quantity).toBe(4);
    expect(mergedItem.price).toBe(30);
    expect(mergedItem.title).toBe("Guest Poster");
  });

  it("handles primitive quantity entries by normalizing them", () => {
    const userItems = {
      "poster-3": 2,
    };

    const guestItems = {
      "poster-3-digital-digital": {
        productId: "poster-3",
        format: "digital",
        dimensions: "digital",
        quantity: 1,
      },
    };

    const merged = mergeCartItems(userItems, guestItems);

    expect(merged["poster-3"].quantity).toBe(2);
    expect(merged["poster-3-digital-digital"].quantity).toBe(1);
  });
});
