import { createClient } from "@/lib/supabase/server";
import { getUserId } from "@/lib/auth";
import { badRequest, ok, serverError, unauthorized } from "@/lib/api-response";

const ITEM_TYPES = ["RAW_MATERIAL", "WIP", "FINISHED"];
const UOMS = ["PCS", "LTR", "KG"];

// In Next.js 16 `params` is a PROMISE and must be awaited. Older tutorials
// write `const { id } = params` and fail with an error that does not explain
// itself. Same change applies to searchParams and cookies().
type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: RouteContext) {
  const userId = await getUserId();
  if (!userId) return unauthorized();

  const { id } = await params;
  const itemId = Number(id);
  if (!Number.isInteger(itemId) || itemId <= 0) {
    return badRequest("Item id must be a positive whole number.");
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return badRequest("Request body must be valid JSON.");
  }

  const patch: Record<string, unknown> = {};

  if (body.name !== undefined) {
    const name = typeof body.name === "string" ? body.name.trim() : "";
    if (!name) return badRequest("Name cannot be blank.");
    patch.name = name;
  }
  if (body.item_type !== undefined) {
    if (!ITEM_TYPES.includes(String(body.item_type))) {
      return badRequest(`Type must be one of: ${ITEM_TYPES.join(", ")}.`);
    }
    patch.item_type = body.item_type;
  }
  if (body.uom !== undefined) {
    if (!UOMS.includes(String(body.uom))) {
      return badRequest(`Unit must be one of: ${UOMS.join(", ")}.`);
    }
    patch.uom = body.uom;
  }
  if (body.is_active !== undefined) {
    if (typeof body.is_active !== "boolean") {
      return badRequest("is_active must be true or false.");
    }
    patch.is_active = body.is_active;
  }

  // Deliberately NOT editable: `code`. Other rows reference this item by id,
  // but humans and paperwork reference it by code. Letting it change silently
  // rewrites the meaning of every historical document that mentions it.
  if (body.code !== undefined) {
    return badRequest("Item code cannot be changed after creation.");
  }

  if (Object.keys(patch).length === 0) {
    return badRequest("Nothing to update.");
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("items")
    .update(patch)
    .eq("id", itemId)
    .select("id, code, name, item_type, uom, is_active")
    .maybeSingle();

  if (error) return serverError(error.message);

  // RLS makes another user's row INVISIBLE rather than forbidden, so an
  // update that matches nothing is indistinguishable from one that was
  // denied. Both are "not found" from here, which is the correct thing to
  // say - confirming a row exists but is not yours leaks information.
  if (!data) return badRequest("No such item, or it is not yours.");

  return ok(data, "Item updated.");
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  const userId = await getUserId();
  if (!userId) return unauthorized();

  const { id } = await params;
  const itemId = Number(id);
  if (!Number.isInteger(itemId) || itemId <= 0) {
    return badRequest("Item id must be a positive whole number.");
  }

  const supabase = await createClient();

  // SOFT DELETE. This does not remove the row; it sets is_active = false.
  //
  // A hard delete would be refused outright by the foreign key the moment
  // the item has any stock movement - and where it succeeded it would be
  // worse, because every historical report that ever mentioned this item
  // would silently change. History has to stay true.
  const { data, error } = await supabase
    .from("items")
    .update({ is_active: false })
    .eq("id", itemId)
    .select("id, code, name, item_type, uom, is_active")
    .maybeSingle();

  if (error) return serverError(error.message);
  if (!data) return badRequest("No such item, or it is not yours.");

  return ok(data, "Item deactivated. Its history is preserved.");
}
