/**
 * Simple secret-key auth.
 * The frontend (and Alexa Lambda) must send:
 *   Authorization: Bearer <API_SECRET>
 */
export function requireAuth(req, res, next) {
  const header = req.headers["authorization"] || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;

  if (!token || token !== process.env.API_SECRET) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
}
