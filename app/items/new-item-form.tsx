"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function NewItemForm({ onCreated }: { onCreated: () => void }) {
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [itemType, setItemType] = useState("RAW_MATERIAL");
  const [uom, setUom] = useState("PCS");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPending(true);

    // Note this posts to OUR route handler, not straight to Supabase.
    // The route handler validates, gives a 400 with a specific message, and
    // is the one place that decides what a valid item is.
    const response = await fetch("/api/items", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, name, item_type: itemType, uom }),
    });
    const body = await response.json();

    setPending(false);

    if (!response.ok) {
      // The API's message goes on the screen verbatim. A form that fails
      // silently is worse than one that crashes.
      setError(body.message ?? "Could not create item.");
      return;
    }

    setCode("");
    setName("");
    onCreated();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-2">
          <Label htmlFor="item-code">Code</Label>
          <Input
            id="item-code"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="ITM-006"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="item-name">Name</Label>
          <Input
            id="item-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Brass Fitting"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="item-type">Type</Label>
          <Select value={itemType} onValueChange={setItemType}>
            <SelectTrigger id="item-type" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="RAW_MATERIAL">Raw material</SelectItem>
              <SelectItem value="WIP">Work in progress</SelectItem>
              <SelectItem value="FINISHED">Finished</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="item-uom">Unit</Label>
          <Select value={uom} onValueChange={setUom}>
            <SelectTrigger id="item-uom" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="PCS">PCS</SelectItem>
              <SelectItem value="LTR">LTR</SelectItem>
              <SelectItem value="KG">KG</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Button type="submit" disabled={pending}>
        {pending ? "Adding…" : "Add item"}
      </Button>
    </form>
  );
}
