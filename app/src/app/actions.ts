"use server";

import { revalidatePath } from "next/cache";
import { supabaseServer } from "@/lib/supabase/server";

export async function approveApplication(applicationId: string) {
  const supabase = supabaseServer();
  const { error } = await supabase
    .from("applications")
    .update({ status: "approved" })
    .eq("id", applicationId);
  if (error) throw error;
  revalidatePath("/");
}

export async function rejectApplication(applicationId: string) {
  const supabase = supabaseServer();
  const { error } = await supabase
    .from("applications")
    .update({ status: "rejected" })
    .eq("id", applicationId);
  if (error) throw error;
  revalidatePath("/");
}
