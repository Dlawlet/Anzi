import { NextResponse } from "next/server";
import TrustedIp from "../../../../models/trustedIpModel.js";
import { allow, clientIp, hashIp } from "../../../../utils/rateLimit.js";

// GET /api/presence : does this connection skip the "be at the house" check? (admin-trusted test IPs only)
// Says nothing else, and gives the same body shape to everybody.
export const presenceStatus = async (req) => {
  try {
    const ip = hashIp(clientIp(req));
    if (!(await allow("presence-ip", ip, 60, 60))) return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    const trusted = await TrustedIp.findOne({ ipHash: ip, expiresAt: { $gt: new Date() } });
    return NextResponse.json({ exempt: Boolean(trusted) }, { status: 200 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
};
