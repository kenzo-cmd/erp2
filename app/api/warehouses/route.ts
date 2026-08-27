import { createClient } from "@/lib/supabase/server";
import { getUserId } from "@/lib/auth";
import { badRequest, created, serverError, unauthorized } from "@/lib/api-response";

export async function POST(request: Request) {
  const userId = await getUserId();
  if (!userId) return unauthorized();

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return badRequest("Request body must be valid JSON.");
  }

  const code = typeof body.code === "string" ? body.code.trim() : "";
  const name = typeof body.name === "string" ? body.name.trim() : "";

  if (!code) return badRequest("Code is required.");
  if (!name) return badRequest("Name is required.");

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("warehouses")
    .insert({ code, name })
    .select("id, code, name, is_active")
    .single();

  if (error) {
    if (error.code === "23505") {
      return badRequest(`A warehouse with code "${code}" already exists.`);
    }
    return serverError(error.message);
  }

  return created(data, "Warehouse created.");
}
