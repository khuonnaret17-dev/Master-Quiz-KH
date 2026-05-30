import { NextResponse } from "next/server";
import crypto from "crypto";

export async function POST(req: Request) {
  try {
    const { planId, userId, successUrl, firstname, email } = await req.json();

    const plans: Record<string, { amount: string; description: string }> = {
      BASIC_1M: { amount: "2.50", description: "Premium 1 Month" },
      BASIC_6M: { amount: "10.00", description: "Premium 6 Months" },
      PREMIUM_1Y: { amount: "15.00", description: "Premium 1 Year" },
      LIFETIME: { amount: "30.00", description: "Premium Lifetime" },
    };

    const plan = plans[planId];
    if (!plan) {
      return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
    }

    const merchantId = process.env.ABA_MERCHANT_ID || "ecash";
    const apiKey = process.env.ABA_API_KEY || "51e44fbe4315228c2e646f906bc5fb99c4bd1f69";

    const requestTime = new Date().toISOString().replace(/[-:T]/g, "").slice(0, 14);
    const safeUserId = String(userId).replace(/[^a-zA-Z0-9]/g, '0').slice(0, 5);
    const tranId = `PMT${safeUserId}${Date.now()}`;
    const amount = plan.amount;
    const items = Buffer.from(JSON.stringify([{ name: plan.description, quantity: "1", price: amount }])).toString("base64");
    
    // Additional parameters required for strict hashing
    const shipping = "";
    const fn = firstname || "User";
    const ln = "User";
    const em = email || "user@example.com";
    const ph = "012345678";
    const type = "";
    const paymentOption = "";
    const returnDeeplink = "";
    const customFields = "";
    const returnParams = "";

    // Hash string construction based on complete ABA specs
    const hashString = `${requestTime}${merchantId}${tranId}${amount}${items}${shipping}${fn}${ln}${em}${ph}${type}${paymentOption}${successUrl || ''}${returnDeeplink}${customFields}${returnParams}`;
    
    const hash = crypto
      .createHmac("sha512", apiKey)
      .update(hashString)
      .digest("base64");

    return NextResponse.json({
      req_time: requestTime,
      merchant_id: merchantId,
      tran_id: tranId,
      amount: amount,
      items: items,
      firstname: fn,
      lastname: ln,
      email: em,
      phone: ph,
      continue_success_url: successUrl,
      hash: hash,
    });
  } catch (error) {
    console.error("ABA Create Transaction Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
