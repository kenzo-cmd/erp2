import { createClient } from "@/lib/supabase/server";
import { getUserId } from "@/lib/auth";
import { badRequest, created, serverError, unauthorized } from "@/lib/api-response";

const ITEM_TYPES = ["RAW_MATERIAL", "WIP", "FINISHED"];
const UOMS = ["PCS", "LTR", "KG"];

export async function POST(request: Request) {
  const userId = await getUserId();
  if (!userId) return unauthorized();

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return badRequest("Request body must be valid JSON.");
  }

  // Validate BEFORE touching the database, and name the specific problem.
  // "Invalid input" tells the user nothing and tells you nothing at 2am.
  const code = typeof body.code === "string" ? body.code.trim() : "";
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const itemType = typeof body.item_type === "string" ? body.item_type : "";
  const uom = typeof body.uom === "string" ? body.uom : "PCS";

  if (!code) return badRequest("Code is required.");
  if (!name) return badRequest("Name is required.");
  if (!ITEM_TYPES.includes(itemType)) {
    return badRequest(`Type must be one of: ${ITEM_TYPES.join(", ")}.`);
  }
  if (!UOMS.includes(uom)) {
    return badRequest(`Unit must be one of: ${UOMS.join(", ")}.`);
  }

  const supabase = await createClient();

  // owner_id is not sent by the client and must not be - the column defaults
  // to auth.uid(), and the RLS insert policy rejects any row whose owner_id
  // is not the caller. A client that tries to set it fails at the database.
  const { data, error } = await supabase
    .from("items")
    .insert({ code, name, item_type: itemType, uom })
    .select("id, code, name, item_type, uom, is_active")
    .single();

  if (error) {
    // 23505 is Postgres's unique_violation. The database already enforces
    // this; we translate its message into something a human can act on.
    if (error.code === "23505") {
      return badRequest(`An item with code "${code}" already exists.`);
    }
    return serverError(error.message);
  }

  return created(data, "Item created.");
}
