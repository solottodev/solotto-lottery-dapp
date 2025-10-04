import jwt from "jsonwebtoken";

const secret = process.env.JWT_SECRET || "changeme";

export function issueJwt(payload: object) {
  return jwt.sign(payload, secret, { expiresIn: "1h" });
}

export function verifyJwt(token: string) {
  return jwt.verify(token, secret);
}
