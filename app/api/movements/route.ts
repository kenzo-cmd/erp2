import { createClient } from "@/lib/supabase/server";
import { getUserId } from "@/lib/auth";
import { badRequest, created, serverError, unauthorized } from "@/lib/api-response";

// TRANSFER is deliberately absent. A transfer is TWO rows that must both
// happen or neither, which a single insert cannot promise. That goes through
// the transfer_stock() database function and /api/transfers instead.
const MOVEMENT_TYPES = ["RECEIPT", "ISSUE"];

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
  const warehouseId = Number(body.warehouse_id);
  const movementType = String(body.movement_type ?? "");
  const quantity = Number(body.quantity);

  if (!Number.isInteger(itemId) || itemId <= 0) {
    return badRequest("Please choose an item.");
  }
  if (!Number.isInteger(warehouseId) || warehouseId <= 0) {
    return badRequest("Please choose a warehouse.");
  }
  if (!MOVEMENT_TYPES.includes(movementType)) {
    return badRequest("Movement type must be RECEIPT or ISSUE.");
  }
  if (!Number.isFinite(quantity)) {
    return badRequest("Quantity must be a number.");
  }
  // The FORM always collects a positive number. The sign is applied below,
  // from the movement type - a user should never have to type a minus sign
  // to mean "out".
  if (quantity <= 0) {
    return badRequest("Quantity must be greater than zero.");
  }

  const supabase = await createClient();

  // The sign convention, applied in exactly one place. RECEIPT is positive,
  // ISSUE is negative. The database's check constraint enforces this too, so
  // a bug here becomes a rejected insert rather than a wrong number.
  const signedQuantity = movementType === "RECEIPT" ? quantity : -quantity;

  // Do not let an ISSUE take stock below zero.
  //
  // This CANNOT be a check constraint: a constraint sees only the row being
  // inserted, never the sum of all the others. It has to be a read followed
  // by a write.
  if (movementType === "ISSUE") {
    const { data: existing, error: readError } = await supabase
      .from("stock_movements")
      .select("quantity")
      .eq("item_id", itemId)
      .eq("warehouse_id", warehouseId);

    if (readError) return serverError(readError.message);

    const onHand = (existing ?? []).reduce(
      (sum, row) => sum + Number(row.quantity),
      0,
    );

    if (quantity > onHand) {
      return badRequest(
        `Only ${onHand} on hand at that warehouse; cannot issue ${quantity}.`,
      );
    }
  }

  const { data, error } = await supabase
    .from("stock_movements")
    .insert({
      item_id: itemId,
      warehouse_id: warehouseId,
      movement_type: movementType,
      quantity: signedQuantity,
    })
    .select("id, item_id, warehouse_id, movement_type, quantity, created_at")
    .single();

  if (error) {
    // 23514 is check_violation - the sign constraint, most likely.
    if (error.code === "23514") {
      return badRequest("That movement breaks the sign rule for its type.");
    }
    // 23503 is foreign_key_violation - item or warehouse does not exist.
    if (error.code === "23503") {
      return badRequest("That item or warehouse does not exist.");
    }
    // 42501 is insufficient_privilege - the RLS insert policy refused it,
    // which here means the item or warehouse belongs to someone else.
    if (error.code === "42501") {
      return badRequest("That item or warehouse is not yours.");
    }
    return serverError(error.message);
  }

  return created(data, `${movementType} recorded.`);
}
