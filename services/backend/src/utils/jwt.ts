import jwt, { Secret, SignOptions } from "jsonwebtoken";

const JWT_SECRET: Secret =
  process.env.JWT_SECRET || "fallback-secret";

const JWT_EXPIRES_IN =
  process.env.JWT_EXPIRES_IN || "7d";

export const generateToken = (
  payload: object
): string => {

  return jwt.sign(
    payload,
    JWT_SECRET,
    {
      expiresIn:
        JWT_EXPIRES_IN as SignOptions["expiresIn"],
    }
  );
};

export const verifyToken = (
  token: string
): any => {

  return jwt.verify(
    token,
    JWT_SECRET
  );
};