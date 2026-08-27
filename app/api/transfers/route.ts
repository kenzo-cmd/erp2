import { createClient } from "@/lib/supabase/server";
import { getUserId } from "@/lib/auth";
import { badRequest, created, serverError, unauthorized } from "@/lib/api-response";

/**
 * POST /api/transfers
 *
 * This route handler does NOT do the two inserts itself. It validates, then
 * calls the transfer_stock() database function, which performs both inserts
 * atomically. A browser - or this handler - issuing two separate inserts
 * cannot promise that both happen.
 */
export async function POST(request: Request) {
  const userId = await getUserId();
  if (!userId) return unauthorized();

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return badRequest("Request body must be valid JSON.");
  }

  const itemId = Number(body.item_id);
  const fromId = Number(body.from_warehouse_id);
  const toId = Number(body.to_warehouse_id);
  const quantity = Number(body.quantity);

  // Validate here so the user gets a specific, readable 400. The function
  // checks the same things again, because it is reachable without this
  // route - but its messages are written for a developer, not an operator.
  if (!Number.isInteger(itemId) || itemId <= 0) {
    return badRequest("Please choose an item.");
  }
  if (!Number.isInteger(fromId) || fromId <= 0) {
    return badRequest("Please choose a source warehouse.");
  }
  if (!Number.isInteger(toId) || toId <= 0) {
    return badRequest("Please choose a destination warehouse.");
  }
  if (fromId === toId) {
    return badRequest("Source and destination warehouses must be different.");
  }
  if (!Number.isFinite(quantity)) {
    return badRequest("Quantity must be a number.");
  }
  if (quantity <= 0) {
    return badRequest("Quantity must be greater than zero.");
  }

  const supabase = await createClient();

  const { error } = await supabase.rpc("transfer_stock", {
    p_item_id: itemId,
    p_from: fromId,
    p_to: toId,
    p_qty: quantity,
  });

  if (error) {
    // P0001 is the SQLSTATE for a plain `raise exception` in plpgsql - our
    // own business rules (below zero, same warehouse, bad quantity). Those
    // are the CALLER's mistake, so 400 and show the message.
    //
    // 4xx means the caller got it wrong; 5xx means we did. Returning 500 for
    // "not enough stock" would send you hunting a server bug that does not
    // exist.
    if (error.code === "P0001") {
      return badRequest(error.message);
    }
    if (error.code === "42501" || error.code === "23503") {
      return badRequest("That item or warehouse does not exist, or is not yours.");
    }
    return serverError(error.message);
  }

  return created(
    { item_id: itemId, from_warehouse_id: fromId, to_warehouse_id: toId, quantity },
    "Transfer completed.",
  );
}
