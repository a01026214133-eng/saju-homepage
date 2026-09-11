export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method Not Allowed" });
  }

  const { paymentKey, orderId, amount } = req.body;

  const secretKey = "test_sk_6BYq7GWPVvNJRBxJLK9LVNE5vbo1";
  const encryptedSecretKey =
    "Basic " + Buffer.from(secretKey + ":").toString("base64");

  try {
    const response = await fetch(
      "https://api.tosspayments.com/v1/payments/confirm",
      {
        method: "POST",
        headers: {
          Authorization: encryptedSecretKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ paymentKey, orderId, amount }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json(data);
    }

    // TODO: 여기에 결제 완료 후 처리 (엽전 충전 등)
    return res.status(200).json(data);
  } catch (error) {
    return res.status(500).json({ message: "서버 오류가 발생했습니다." });
  }
}
